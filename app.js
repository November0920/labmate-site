(() => {
  "use strict";

  const KB = Array.isArray(window.LABMATE_KB) ? window.LABMATE_KB : [];
  const STORAGE_KEY = "labmate.kb.candidates.v1";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const nodes = {
    header: $(".site-header"),
    navToggle: $("#navToggle"),
    siteNav: $("#siteNav"),
    chatLog: $("#chatLog"),
    chatForm: $("#chatForm"),
    chatInput: $("#chatInput"),
    sendButton: $(".send-button"),
    resetChat: $("#resetChat"),
    resultCard: $("#resultCard"),
    resultEmpty: $("#resultEmpty"),
    resultContent: $("#resultContent"),
    demo: $("#demo"),
    candidateForm: $("#candidateForm"),
    candidateList: $("#candidateList"),
    candidateCount: $("#candidateCount"),
    candidateEmpty: $("#candidateEmpty"),
    candidateStatus: $("#candidateStatus"),
    candidateError: $("#candidateError"),
    candidateTitle: $("#candidateTitle"),
    candidateSymptom: $("#candidateSymptom"),
    candidateCause: $("#candidateCause"),
    candidateSteps: $("#candidateSteps"),
    candidateVerify: $("#candidateVerify"),
    candidateSource: $("#candidateSource"),
    candidateKeywords: $("#candidateKeywords"),
    candidateReset: $("#candidateReset")
  };

  if (!nodes.chatLog || !nodes.chatForm || !nodes.resultCard) return;

  const initialChat = nodes.chatLog.innerHTML;
  const state = { busy: false, lastQuery: "" };

  const splitLines = (value) => String(value || "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);

  const splitKeywords = (value) => String(value || "")
    .split(/[,，]/)
    .map((item) => item.trim())
    .filter(Boolean);

  const loadCandidates = () => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter((item) => item && item.id) : [];
    } catch (error) {
      return [];
    }
  };

  const saveCandidates = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(candidates));
    } catch (error) {
      // localStorage 不可用时，候选只在当前页面会话生效。
    }
  };

  const deriveKeywords = (text) => {
    const words = String(text || "").toLowerCase().match(/[a-z0-9\u4e00-\u9fa5]{2,}/g) || [];
    return Array.from(new Set(words)).slice(0, 8);
  };

  const toKBEntry = (candidate) => {
    const keywords = candidate.keywords && candidate.keywords.length
      ? candidate.keywords
      : deriveKeywords(`${candidate.title} ${candidate.symptom}`);
    return {
      id: candidate.id,
      file: candidate.source || "候选知识库",
      section: "人工审核通过",
      caseNo: "CAND",
      title: candidate.title,
      subtitle: candidate.symptom,
      confidence: "0.60",
      question: candidate.symptom,
      badge: "候选通过",
      tags: keywords.slice(0, 3),
      keywords,
      local: true,
      sections: [
        { title: "问题定位", body: candidate.symptom },
        {
          title: "可能原因",
          items: candidate.cause && candidate.cause.length ? candidate.cause : ["待补充：根据实际实验环境确认。"]
        },
        { title: "解决步骤", items: candidate.steps },
        {
          title: "验证方法",
          items: candidate.verify && candidate.verify.length ? candidate.verify : ["按步骤复现，观察结果是否变化。"]
        },
        {
          title: "引用来源",
          source: {
            file: candidate.source,
            section: "人工审核通过",
            detail: "该条目来自候选池，经人工审核后加入本地知识库；生产环境应再由教师/助教复核。"
          }
        }
      ],
      note: "该条目由 LabMate 候选池生成，只用于本地演示；生产环境需要来源复核和版本管理。"
    };
  };

  const candidates = loadCandidates();
  candidates
    .filter((item) => item.status === "approved" && !KB.some((entry) => entry.id === item.id))
    .forEach((item) => KB.push(toKBEntry(item)));

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  const appendInline = (parent, text) => {
    const parts = String(text).split(/`([^`]+)`/g);
    parts.forEach((part, index) => {
      if (!part) return;
      if (index % 2 === 1) {
        const code = document.createElement("code");
        code.textContent = part;
        parent.appendChild(code);
      } else {
        parent.appendChild(document.createTextNode(part));
      }
    });
  };

  const scrollLog = () => {
    window.requestAnimationFrame(() => {
      nodes.chatLog.scrollTop = nodes.chatLog.scrollHeight;
    });
  };

  const addMessage = (role, text, typing = false) => {
    const message = el("div", `chat-message ${role}`);
    const label = el("div", "message-label", role === "user" ? "你" : "LabMate");
    const body = el("p");
    message.appendChild(label);
    message.appendChild(body);

    if (typing) {
      message.classList.add("typing");
      body.setAttribute("aria-label", "正在生成回答");
      [0, 1, 2].forEach(() => body.appendChild(el("span", "typing-dot")));
    } else {
      body.textContent = text;
    }

    nodes.chatLog.appendChild(message);
    scrollLog();
    return message;
  };

  const setBusy = (busy) => {
    state.busy = busy;
    nodes.sendButton.disabled = busy;
    nodes.chatInput.disabled = busy;
  };

  const safetyAnswer = (kind) => {
    if (kind === "report") {
      return {
        kind: "safety",
        title: "我可以帮你梳理，但不能代写",
        subtitle: "课程报告需要你本人完成；LabMate 只提供结构建议和排障帮助。",
        badge: "范围外",
        confidence: "—",
        sections: [
          {
            title: "问题定位",
            body: "这个请求是“代写课程报告”，不是实验排障。它不在 LabMate 的范围内，也不符合课程对独立完成的要求。"
          },
          {
            title: "可能原因",
            items: [
              "把“帮我写完整报告”与“帮我理解实验、整理排查思路”混在了一起。",
              "想直接得到可提交的成稿，而不是自己完成实验记录。"
            ]
          },
          {
            title: "解决步骤",
            items: [
              "我可以给你报告结构：实验目的、环境、步骤、现象、原因、修复、验证、反思。",
              "把实验名称、你执行过的命令和报错贴出来，我可以按五段式帮你定位问题。",
              "如果你已经写了初稿，我可以指出逻辑缺口和需要补的证据，但不会整篇代写。"
            ]
          },
          {
            title: "验证方法",
            body: "你能用自己的话解释每一步为什么做、结果说明了什么，并且报告里的命令和截图都来自你的实际操作。"
          },
          {
            title: "引用来源",
            source: {
              file: "课程规范与安全边界",
              section: "范围外处理",
              detail: "不代写报告、不伪造实验数据；只提供结构建议、排障思路和验证方法。"
            }
          }
        ],
        note: "如果你愿意，把实验名称和报错发来，我可以先帮你把“问题定位”这一段写清楚。"
      };
    }

    return {
      kind: "safety",
      title: "这个操作不在安全边界内",
      subtitle: "涉及真实攻击、提权或不可逆破坏性命令，LabMate 不会提供执行步骤。",
      badge: "安全拦截",
      confidence: "—",
      sections: [
        {
          title: "问题定位",
          body: "这个请求涉及真实攻击、越权、提权或破坏性命令，超出了课程实验排障的安全边界。"
        },
        {
          title: "可能原因",
          items: [
            "把“理解原理”变成了“对真实目标执行攻击”。",
            "使用了不可逆命令，或试图绕过课程环境的权限限制。",
            "请求本身可能违反实验室规范或法律法规。"
          ]
        },
        {
          title: "解决步骤",
          items: [
            "如果你在课程隔离环境里做实验，请先说明实验名称、靶机范围和已授权的操作。",
            "把“攻击”改成“防御验证”：例如检查端口暴露、日志告警、权限配置是否合理。",
            "危险命令请先在快照 / 隔离环境里验证，不要对真实主机执行。"
          ]
        },
        {
          title: "验证方法",
          body: "你能够说明操作只发生在课程授权的隔离环境内，并且有快照、回滚方案和教师许可。"
        },
        {
          title: "引用来源",
          source: {
            file: "课程规范与安全边界",
            section: "安全红线",
            detail: "拒绝真实攻击、提权、免杀、破坏性命令；只做课程范围内的防御性排查。"
          }
        }
      ],
      note: "如果这是课程实验，请把实验指导书里的“授权范围”和报错一起发来，我可以帮你做防御性排查。"
    };
  };

  const unknownAnswer = () => ({
    kind: "unknown",
    title: "信息不足，先补三件事",
    subtitle: "没有命中课程知识库；与其编一个答案，不如先把问题描述清楚。",
    badge: "需要补充",
    confidence: "—",
    sections: [
      {
        title: "问题定位",
        body: "当前描述还不足以判断是网络、容器、权限还是其他实验环境问题，知识库也没有命中对应条目。"
      },
      {
        title: "可能原因",
        items: [
          "只说了“打不开 / 报错”，没有给完整错误信息。",
          "没有说明实验名称、操作系统或执行位置（本机 / 虚拟机 / 容器）。",
          "问题可能不在当前知识库覆盖的三类故障内。"
        ]
      },
      {
        title: "解决步骤",
        items: [
          "补实验名称：例如“网络实验 ping”“Docker 端口映射”“Linux 权限”。",
          "补环境：Windows / Linux / 虚拟机 / 容器，以及你执行的完整命令。",
          "贴完整报错：保留错误码、文件名、端口号和前后各一行。",
          "说明你已经试过什么，以及结果有没有变化。"
        ]
      },
      {
        title: "验证方法",
        body: "拿到这三项信息后，才能判断应该查网络链路、容器状态还是文件权限；否则任何结论都只是猜测。"
      },
      {
        title: "引用来源",
        source: {
          file: "LabMate-KB",
          section: "未命中",
          detail: "当前知识库只覆盖 ping、Docker 端口、Linux 权限三类问题；未命中时明确说明，不编造来源。"
        }
      }
    ],
    note: "把“实验名称 + 系统 + 完整报错”一起发来，我会重新检索。"
  });

  const kbAnswer = (entry) => ({
    kind: "kb",
    title: entry.title,
    subtitle: entry.subtitle,
    badge: entry.badge,
    confidence: entry.confidence,
    sections: entry.sections,
    note: entry.note
  });

  const resetCandidateForm = () => {
    if (!nodes.candidateForm) return;
    nodes.candidateForm.reset();
    nodes.candidateError.textContent = "";
    nodes.candidateStatus.textContent = "";
  };

  const openCandidate = (query) => {
    if (!nodes.candidateForm) return;
    nodes.candidateForm.reset();
    nodes.candidateTitle.value = `待审核：${String(query || "").slice(0, 28)}`;
    nodes.candidateSymptom.value = query || "";
    nodes.candidateKeywords.value = deriveKeywords(query).join(", ");
    nodes.candidateError.textContent = "";
    nodes.candidateStatus.textContent = "";
    nodes.candidateForm.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => nodes.candidateTitle.focus({ preventScroll: true }), 280);
  };

  const renderCandidateList = () => {
    if (!nodes.candidateList) return;
    const pending = candidates.filter((item) => item.status === "pending");
    nodes.candidateCount.textContent = `${pending.length} 待审核`;
    nodes.candidateEmpty.hidden = pending.length > 0;
    nodes.candidateList.replaceChildren();

    pending.forEach((candidate) => {
      const card = el("article", "candidate-card");
      const head = el("div", "candidate-head");
      head.appendChild(el("strong", "", candidate.title));
      head.appendChild(el("span", "", "PENDING"));
      card.appendChild(head);
      card.appendChild(el("p", "", candidate.symptom));

      const meta = el("div", "candidate-meta");
      meta.appendChild(el("span", "", candidate.source ? `来源：${candidate.source}` : "来源：未填"));
      meta.appendChild(el("span", "", `${candidate.keywords.length} 个关键词`));
      card.appendChild(meta);

      const actions = el("div", "candidate-card-actions");
      const approve = el("button", "approve", "审核通过");
      approve.type = "button";
      approve.dataset.action = "approve";
      approve.dataset.id = candidate.id;
      const reject = el("button", "", "拒绝");
      reject.type = "button";
      reject.dataset.action = "reject";
      reject.dataset.id = candidate.id;
      actions.append(approve, reject);
      card.appendChild(actions);
      nodes.candidateList.appendChild(card);
    });
  };

  const approveCandidate = (id) => {
    const candidate = candidates.find((item) => item.id === id && item.status === "pending");
    if (!candidate) return;
    if (!candidate.source || !candidate.source.trim()) {
      nodes.candidateError.textContent = "审核通过前必须填写来源；没有来源的候选不能进入知识库。";
      return;
    }
    if (!candidate.steps.length) {
      nodes.candidateError.textContent = "解决步骤不能为空。";
      return;
    }

    candidate.status = "approved";
    if (!KB.some((entry) => entry.id === candidate.id)) KB.push(toKBEntry(candidate));
    saveCandidates();
    renderCandidateList();
    nodes.candidateError.textContent = "";
    nodes.candidateStatus.textContent = "已通过审核并加入本地知识库；重新提问即可命中。";
    nodes.candidateForm.reset();
  };

  const rejectCandidate = (id) => {
    const candidate = candidates.find((item) => item.id === id && item.status === "pending");
    if (!candidate) return;
    candidate.status = "rejected";
    saveCandidates();
    renderCandidateList();
    nodes.candidateError.textContent = "";
    nodes.candidateStatus.textContent = "已拒绝；该候选不会进入知识库。";
  };

  const saveCandidate = (event) => {
    event.preventDefault();
    const title = nodes.candidateTitle.value.trim();
    const symptom = nodes.candidateSymptom.value.trim();
    const steps = splitLines(nodes.candidateSteps.value);
    nodes.candidateError.textContent = "";

    if (!title || !symptom || !steps.length) {
      nodes.candidateError.textContent = "标题、症状、解决步骤至少各填一项。";
      return;
    }

    const source = nodes.candidateSource.value.trim();
    const keywords = splitKeywords(nodes.candidateKeywords.value);
    const existing = candidates.find(
      (item) => item.status === "pending" && item.title === title && item.symptom === symptom
    );
    const candidate = existing || { id: `kb-local-${Date.now()}`, status: "pending" };
    candidate.title = title;
    candidate.symptom = symptom;
    candidate.cause = splitLines(nodes.candidateCause.value);
    candidate.steps = steps;
    candidate.verify = splitLines(nodes.candidateVerify.value);
    candidate.source = source;
    candidate.keywords = keywords.length ? keywords : deriveKeywords(`${title} ${symptom}`);
    candidate.confidence = 0.6;
    candidate.createdAt = candidate.createdAt || new Date().toISOString();

    if (!existing) candidates.push(candidate);
    saveCandidates();
    renderCandidateList();
    nodes.candidateStatus.textContent = source
      ? "已加入候选池，等待人工审核。"
      : "已加入候选池；补全来源后才能审核通过。";
    nodes.candidateForm.reset();
  };

  const classify = (raw) => {
    const text = raw.trim();
    if (!text) return "empty";

    if (/(帮我写|代写|写.{0,6}报告|实验报告|论文|report|作业)/i.test(text)) return "report";
    if (/(rm\s+-rf|dd\s+if=|mkfs|chmod\s+-R\s+777|chmod\s+777|关闭防火墙|关.*防火墙|防火墙.*关|ufw\s+disable|iptables\s+-F|攻击|入侵|破解|提权|免杀)/i.test(text)) return "danger";

    if (/(ping|网络|网关|dns|ipconfig|ip addr|route|不通|超时|icmp)/i.test(text)) return "ping";
    if (/(docker|容器|端口|port|8080|映射|already allocated|address already in use|占用)/i.test(text)) return "docker";
    if (/(permission|denied|权限|chmod|chown|sudo|root|只读|拒绝访问|无法写入)/i.test(text)) return "permission";

    const localEntry = KB.find((entry) => entry.local && Array.isArray(entry.keywords)
      && entry.keywords.some((keyword) => keyword && text.toLowerCase().includes(String(keyword).toLowerCase())));
    if (localEntry) return localEntry.id;

    if (/^(你好|hi|hello|在吗|嗨|hey)/i.test(text)) return "greeting";
    return "unknown";
  };

  const renderResult = (answer) => {
    nodes.resultCard.classList.toggle("is-safety", answer.kind === "safety");
    nodes.resultEmpty.hidden = true;
    nodes.resultContent.hidden = false;
    nodes.resultContent.replaceChildren();

    const heading = el("div", "result-heading");
    const headingText = el("div");
    headingText.appendChild(el("h3", "", answer.title));
    if (answer.subtitle) headingText.appendChild(el("p", "result-subtitle", answer.subtitle));

    const meta = el("div", "result-meta");
    if (answer.kind === "kb") {
      meta.appendChild(el("span", "", "知识库命中"));
      meta.appendChild(el("span", "", `置信度 ${answer.confidence}`));
    } else if (answer.kind === "safety") {
      meta.appendChild(el("span", "", "安全边界"));
      meta.appendChild(el("span", "", "不执行越界请求"));
    } else {
      meta.appendChild(el("span", "", "未命中知识库"));
      meta.appendChild(el("span", "", "需要补充信息"));
    }
    headingText.appendChild(meta);

    const badge = el("span", "result-badge", answer.badge);
    heading.appendChild(headingText);
    heading.appendChild(badge);
    nodes.resultContent.appendChild(heading);

    if (Array.isArray(answer.trace) && answer.trace.length) {
      nodes.resultContent.appendChild(renderTrace(answer.trace));
    }

    const sections = el("div", "result-sections");
    answer.sections.forEach((section, index) => {
      const card = el("section", "result-section");
      const title = el("h4");
      title.appendChild(el("span", "section-number", String(index + 1).padStart(2, "0")));
      title.appendChild(document.createTextNode(section.title));
      card.appendChild(title);

      if (section.body) {
        const p = el("p");
        appendInline(p, section.body);
        card.appendChild(p);
      }

      if (Array.isArray(section.items)) {
        const list = el("ul");
        section.items.forEach((item) => {
          const li = el("li");
          appendInline(li, item);
          list.appendChild(li);
        });
        card.appendChild(list);
      }

      if (section.source) {
        const source = el("div", "result-source");
        source.appendChild(el("span", "source-chip", `${section.source.file} · ${section.source.section}`));
        card.appendChild(source);
        if (section.source.detail) {
          const detail = el("p", "source-detail", section.source.detail);
          card.appendChild(detail);
        }
      }

      sections.appendChild(card);
    });
    nodes.resultContent.appendChild(sections);

    if (answer.note) {
      nodes.resultContent.appendChild(el("p", "result-note", answer.note));
    }

    if (answer.kind === "unknown") {
      const cta = el("div", "candidate-cta");
      const copy = el("p", "", "这个问题没有命中知识库。可以让 Agent 先生成一条候选，补来源后再审核。");
      const button = el("button", "button button-ghost", "生成知识候选");
      button.type = "button";
      button.addEventListener("click", () => openCandidate(state.lastQuery));
      cta.append(copy, button);
      nodes.resultContent.appendChild(cta);
    }

    nodes.resultContent.scrollTop = 0;
  };

  const responseFor = (category) => {
    const entry = KB.find((item) => item.id === category);
    if (entry) return kbAnswer(entry);
    if (category === "report" || category === "danger") return safetyAnswer(category);
    if (category === "greeting") return { kind: "greeting" };
    return unknownAnswer();
  };

  const traceClock = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

  const traceItem = (agent, label, status, summary, startedAt) => ({
    agent,
    label,
    status,
    summary,
    ms: Math.max(1, Math.round(traceClock() - startedAt))
  });

  const scopeAgent = (text) => {
    const startedAt = traceClock();
    const category = classify(text);
    const summaries = {
      report: "识别为“代写报告”，应拒绝",
      danger: "识别为危险命令 / 越界请求，应拦截",
      ping: "范围内：网络 ping 排障",
      docker: "范围内：Docker / 端口排障",
      permission: "范围内：Linux 权限排障",
      greeting: "打招呼，不进入排障流程",
      unknown: "未命中三类实验故障，需要补充信息",
      empty: "输入为空"
    };
    const entry = KB.find((item) => item.id === category);
    const status = category === "report" || category === "danger"
      ? "block"
      : category === "unknown" || category === "empty" || category === "greeting"
        ? "warn"
        : entry ? "pass" : "warn";
    return {
      category,
      trace: traceItem(
        "ScopeAgent",
        "范围判定",
        status,
        summaries[category] || (entry ? `范围内：候选知识「${entry.title}」` : "无法判定"),
        startedAt
      )
    };
  };

  const retrievalAgent = (scope) => {
    const startedAt = traceClock();
    if (scope.category === "report" || scope.category === "danger") {
      return {
        entry: null,
        trace: traceItem("RetrievalAgent", "知识库检索", "skip", "越界请求，不检索知识库", startedAt)
      };
    }
    const entry = KB.find((item) => item.id === scope.category) || null;
    return {
      entry,
      trace: traceItem(
        "RetrievalAgent",
        "知识库检索",
        entry ? "pass" : "warn",
        entry ? `命中 ${entry.file}（置信度 ${entry.confidence}）` : "知识库未命中",
        startedAt
      )
    };
  };

  const diagnosisAgent = (scope, retrieval) => {
    const startedAt = traceClock();
    const answer = responseFor(scope.category);
    const summary = answer.kind === "kb"
      ? "已生成五段式排查步骤"
      : answer.kind === "safety"
        ? "已生成安全边界回复"
        : answer.kind === "unknown"
          ? "信息不足，生成补充信息请求"
          : "无需生成排障结果";
    const status = answer.kind === "kb" ? "pass" : answer.kind === "safety" ? "block" : "warn";
    return {
      answer,
      trace: traceItem("DiagnosisAgent", "诊断生成", status, summary, startedAt)
    };
  };

  const reviewAgent = (scope, diagnosis) => {
    const startedAt = traceClock();
    const answer = diagnosis.answer;
    const issues = [];

    if (answer.kind === "kb") {
      if (!Array.isArray(answer.sections) || answer.sections.length !== 5) {
        issues.push("五段式结构不完整");
      }
      const source = answer.sections && answer.sections[4] && answer.sections[4].source;
      if (!source || !source.file) issues.push("缺少引用来源");
    }

    const approved = issues.length === 0;
    return {
      answer: approved ? answer : unknownAnswer(),
      approved,
      issues,
      trace: traceItem(
        "ReviewAgent",
        "审核",
        approved ? "pass" : "warn",
        approved ? "五段式与引用检查通过" : issues.join("；"),
        startedAt
      )
    };
  };

  const coordinate = (text) => {
    const scope = scopeAgent(text);
    const retrieval = retrievalAgent(scope);
    const diagnosis = diagnosisAgent(scope, retrieval);
    const review = reviewAgent(scope, diagnosis);
    const trace = [scope.trace, retrieval.trace, diagnosis.trace, review.trace];
    return {
      category: scope.category,
      trace,
      answer: { ...review.answer, trace }
    };
  };

  const renderTrace = (trace) => {
    const box = el("div", "agent-trace");
    const head = el("div", "trace-head");
    head.appendChild(el("span", "trace-kicker", "AGENT TRACE"));
    head.appendChild(el("span", "trace-count", `${trace.length} roles`));
    box.appendChild(head);

    const list = el("div", "trace-list");
    trace.forEach((item) => {
      const row = el("div", `trace-item status-${item.status}`);
      row.appendChild(el("span", "trace-dot"));
      const body = el("div", "trace-body");
      body.appendChild(el("span", "trace-agent", item.agent));
      body.appendChild(el("span", "trace-summary", item.summary));
      row.appendChild(body);
      row.appendChild(el("span", "trace-ms", `${item.ms}ms`));
      list.appendChild(row);
    });
    box.appendChild(list);
    return box;
  };

  const handleQuery = (raw) => {
    const text = raw.trim();
    if (!text || state.busy) return;

    const category = classify(text);
    if (category === "empty") return;

    state.lastQuery = text;
    addMessage("user", text);
    setBusy(true);
    nodes.chatInput.value = "";
    const typing = addMessage("bot", "", true);

    const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const delay = reduceMotion ? 80 : 560;
    window.setTimeout(() => {
      typing.remove();

      if (category === "greeting") {
        addMessage("bot", "你好，我是 LabMate。把实验名称、操作系统和完整报错发给我，我会按五段式帮你排查。");
        setBusy(false);
        nodes.chatInput.focus();
        return;
      }

      const outcome = coordinate(text);
      const answer = outcome.answer;
      renderResult(answer);

      if (category === "report") {
        addMessage("bot", "这个请求我不能代写。我可以给你报告结构，或者按五段式帮你定位实验问题。");
      } else if (category === "danger") {
        addMessage("bot", "这个操作超出安全边界，我不会提供执行步骤。如果你在课程隔离环境里做防御性排查，可以把授权范围和报错发来。");
      } else if (answer.kind === "kb") {
        const source = answer.sections[4] && answer.sections[4].source;
        addMessage("bot", `已按课程知识库生成五段式结果，引用 ${source ? source.file : "知识库"}。右侧可查看四个 Agent 的协作轨迹。`);
      } else {
        addMessage("bot", "当前描述没有命中知识库。请补充实验名称、系统和完整报错，我再帮你定位。");
      }

      setBusy(false);
      nodes.chatInput.focus();
    }, delay);
  };

  nodes.chatForm.addEventListener("submit", (event) => {
    event.preventDefault();
    handleQuery(nodes.chatInput.value);
  });

  nodes.resetChat.addEventListener("click", () => {
    if (state.busy) return;
    nodes.chatLog.innerHTML = initialChat;
    nodes.chatInput.value = "";
    nodes.resultEmpty.hidden = false;
    nodes.resultContent.hidden = true;
    nodes.resultContent.replaceChildren();
    nodes.resultCard.classList.remove("is-safety");
    scrollLog();
    nodes.chatInput.focus();
  });

  $$("[data-query]").forEach((button) => {
    button.addEventListener("click", () => {
      nodes.chatInput.value = button.dataset.query || "";
      handleQuery(nodes.chatInput.value);
    });
  });

  const caseQueries = {
    ping: "ping 不通先查什么？",
    docker: "Docker 端口被占用怎么排查？",
    permission: "Permission denied 怎么办？"
  };

  $$("[data-case]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.case;
      const query = caseQueries[key];
      if (!query) return;
      nodes.demo.scrollIntoView({ behavior: "smooth", block: "start" });
      window.setTimeout(() => {
        nodes.chatInput.value = query;
        handleQuery(query);
      }, 460);
    });
  });

  if (nodes.candidateForm) {
    nodes.candidateForm.addEventListener("submit", saveCandidate);
    nodes.candidateReset.addEventListener("click", resetCandidateForm);
    nodes.candidateList.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;
      if (button.dataset.action === "approve") approveCandidate(button.dataset.id);
      if (button.dataset.action === "reject") rejectCandidate(button.dataset.id);
    });
    renderCandidateList();
  }

  const closeNav = () => {
    if (!nodes.siteNav || !nodes.navToggle) return;
    nodes.siteNav.classList.remove("is-open");
    nodes.navToggle.setAttribute("aria-expanded", "false");
    nodes.navToggle.setAttribute("aria-label", "打开导航");
  };

  if (nodes.navToggle && nodes.siteNav) {
    nodes.navToggle.addEventListener("click", () => {
      const open = nodes.siteNav.classList.toggle("is-open");
      nodes.navToggle.setAttribute("aria-expanded", String(open));
      nodes.navToggle.setAttribute("aria-label", open ? "关闭导航" : "打开导航");
    });

    $$("a", nodes.siteNav).forEach((link) => link.addEventListener("click", closeNav));

    document.addEventListener("click", (event) => {
      if (!nodes.header || !nodes.header.contains(event.target)) closeNav();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeNav();
    });
  }

  if (nodes.header) {
    const onScroll = () => nodes.header.classList.toggle("is-scrolled", window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  const revealItems = $$(".reveal");
  if ("IntersectionObserver" in window && revealItems.length) {
    revealItems.forEach((item) => item.classList.add("reveal-ready"));
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -36px" });
    revealItems.forEach((item) => observer.observe(item));
  }

})();
