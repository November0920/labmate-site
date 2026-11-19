# LabMate · 网安实验排障助教

课程项目《智能体设计与应用》的产品官网 + 在线排障演示。纯静态 HTML / CSS / JS，无框架、无构建步骤，离线可演示。

## 本地运行

```bash
cd D:\App\DSH\labmate-site
node server.js
```

打开 `http://localhost:4173`。也可以直接用浏览器打开 `index.html`，但本地服务器更接近真实部署。

## 目录

```text
index.html          页面结构
styles.css          视觉与响应式布局
app.js              对话、检索、五段式渲染、四角色 trace、候选池、安全边界
data/kb.js          三类课程知识库与答案模板
assets/favicon.svg  站点图标
server.js           零依赖静态服务器 + /api/health
```

## 演示能力

- 输入 `ping 不通`、`Docker 端口被占用`、`Permission denied`，返回固定五段式结果。
- 输入 `帮我写实验报告`，触发“可以帮结构、不能代写”的范围外回应。
- 输入其他问题，返回“信息不足”，要求补充实验名称、系统、完整报错，不编造来源。
- 知识库命中时展示文件名与章节；演示版不连接真实模型。
- 结果卡展示四个前端角色：`ScopeAgent → RetrievalAgent → DiagnosisAgent → ReviewAgent`，共 4 条 `AGENT TRACE`。
- 未命中知识库时，结果卡出现“生成知识候选”；候选经人工审核后写入浏览器 `localStorage`，再次提问同一问题可命中。

> 说明：AgentArts 平台内仍是单 Agent；四角色是网站演示层的前端编排，不是平台内四个独立 Agent。

## 知识扩展（候选池）

1. 在 Demo 输入知识库未覆盖的问题（例如 `Wireshark 抓包看不到包`）。
2. 点击“生成知识候选”，补全原因、步骤、验证、来源和关键词。
3. 保存为待审核，到页面“知识扩展”区点击“通过”。
4. 再次提问同一问题，候选会作为本地知识条目参与检索，并显示来源与置信度。

候选不会自动写入 AgentArts 知识库，只保存在当前浏览器的 `localStorage`（key：`labmate.kb.candidates.v1`）；换浏览器或清缓存会丢失。这是有意的 Human-in-the-loop 设计，避免把模型幻觉固化成知识。

## 部署

这是一个静态站点，以下方式任选其一：

1. **GitHub Pages**：把本目录推到仓库根目录，`Settings → Pages → Deploy from a branch`，选择 `main` 和 `/ (root)`。
2. **任意静态托管**：Cloudflare Pages / Vercel / Netlify，构建命令留空，输出目录填仓库根目录。
3. **本地临时公网预览**：用 Cloudflare Tunnel、ngrok 或 localhost.run 指向 `http://localhost:4173`。
4. **接入真实模型**：不要在前端放 MaaS API Key。新增服务端 `/api/chat` 代理，由服务端读取环境变量并调用 MaaS，再把五段式结果返回前端。

## 事实边界

- 网站是课程演示，不是生产系统。
- AgentArts Managed Agent 当前为 v4；平台内为单 Agent，知识库命中测试在 AgentArts 知识库页面完成，平台版未开放知识库直连。
- 公网域名根路径返回 404，不作为公网网站；演示以本网站和 Playground 截图为准。
- 知识候选只存在浏览器本地，不自动写入 AgentArts 知识库，也不跨设备同步。
- 不提供真实攻击、提权、免杀或破坏性命令指导；不代写课程报告。
