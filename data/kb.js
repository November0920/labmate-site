window.LABMATE_KB = [
  {
    id: "ping",
    file: "01_网络实验_ping不通.md",
    section: "排查步骤",
    caseNo: "01",
    title: "ping 不通：先分段，再下结论",
    subtitle: "从本机、网关、DNS 到目标端口，逐段缩小范围。",
    confidence: "0.76",
    question: "ping 不通先查什么？",
    badge: "命中 01",
    tags: ["网络", "ICMP", "DNS"],
    keywords: ["ping", "网络", "网关", "dns", "ip", "route", "不通", "超时", "请求超时", "icmp", "网卡"],
    sections: [
      {
        title: "问题定位",
        body: "问题出在本机到目标之间的网络链路，或 DNS / ICMP 策略。先判断是“完全没网”“能通 IP 不能通域名”，还是“目标禁 ping”，不要一上来就重装系统。"
      },
      {
        title: "可能原因",
        items: [
          "本机没有拿到地址，或网卡未启用、IP 与网关不在同一网段。",
          "默认路由缺失，或实验环境的网关 / NAT 配置不正确。",
          "DNS 配错：能 ping 通 IP，但 ping 域名失败。",
          "目标主机或安全组禁用 ICMP；ping 不通不代表端口不通。",
          "虚拟机网卡模式（NAT / 桥接）与实验网段不匹配。"
        ]
      },
      {
        title: "解决步骤",
        items: [
          "先分段测试：`ping 127.0.0.1` → `ping 本机IP` → `ping 网关` → `ping 8.8.8.8` → `ping 域名`，看断在哪一段。",
          "看地址：Linux 用 `ip addr`，Windows 用 `ipconfig /all`；确认 IP、掩码、网关在同一网段。",
          "看路由：Linux 用 `ip route`，Windows 用 `route print`；确认默认路由指向实验网关。",
          "测 DNS：用 `nslookup 域名` 或 `dig 域名`；能通 IP 不能通域名时，优先修 DNS。",
          "目标可能禁 ICMP：改用 `curl -I http://目标:端口`、`nc -vz 目标 端口` 或 `telnet 目标 端口` 验证服务。",
          "检查虚拟机网卡模式、容器网络和防火墙；不要用“关闭防火墙”作为默认修复。"
        ]
      },
      {
        title: "验证方法",
        items: [
          "`ping 网关` 有回包，说明本机到网关的链路正常。",
          "`ping 8.8.8.8` 有回包，说明出口路由 / NAT 基本正常。",
          "`nslookup 域名` 返回正确记录，说明 DNS 解析正常。",
          "`nc -vz 目标 端口` 或 `curl -I` 成功，说明目标服务可达。"
        ]
      },
      {
        title: "引用来源",
        source: {
          file: "01_网络实验_ping不通.md",
          section: "排查步骤",
          detail: "按“本机地址 → 网关 → DNS → 目标端口”的顺序排查；ICMP 被禁时改用端口探测。"
        }
      }
    ],
    note: "实验环境优先查网段、网关和虚拟化网络模式；不要直接把问题归因于“学校网络坏了”。"
  },
  {
    id: "docker",
    file: "02_容器实验_端口占用.md",
    section: "排查步骤",
    caseNo: "02",
    title: "Docker 端口被占用：先找占用者",
    subtitle: "区分宿主机进程、旧容器和端口映射冲突。",
    confidence: "0.83",
    question: "Docker 端口被占用怎么排查？",
    badge: "score 0.83",
    tags: ["Docker", "端口", "容器"],
    keywords: ["docker", "端口", "port", "容器", "占用", "8080", "映射", "already allocated", "bind", "address already in use"],
    sections: [
      {
        title: "问题定位",
        body: "宿主机端口已经被其他进程或旧容器占用，或容器端口映射与现有服务冲突。先找“谁占着端口”，再决定停旧容器、停宿主机服务，还是换端口。"
      },
      {
        title: "可能原因",
        items: [
          "旧容器没有退出，仍然占用 `8080` 等端口。",
          "宿主机上的 Nginx / Python / Java 服务已经监听同一端口。",
          "两个容器映射到同一个宿主机端口。",
          "容器内应用只监听 `127.0.0.1`，没有监听 `0.0.0.0`，导致端口映射不生效。",
          "防火墙或安全组没有放行新端口。"
        ]
      },
      {
        title: "解决步骤",
        items: [
          "先看容器：`docker ps -a`，确认目标容器的状态和 `PORTS` 列。",
          "找占用者：Linux 用 `ss -lntp | grep :8080`，Windows 用 `netstat -ano | findstr :8080`，拿到 PID 后确认进程。",
          "如果是旧容器：`docker stop 容器名`；确认不需要保留数据后再删除，不要直接 `docker rm -f`。",
          "如果是宿主机服务：停止对应服务，或修改它的监听端口；不要影响课程环境里的其他服务。",
          "如果是端口映射冲突：换一个宿主机端口，例如 `docker run -p 8081:80 ...`，再更新访问地址。",
          "容器已启动但访问不了：看 `docker logs 容器名`，进容器用 `ss -lntp` 确认应用监听地址和端口。"
        ]
      },
      {
        title: "验证方法",
        items: [
          "`docker ps` 中容器状态为 `Up`，端口映射显示为 `0.0.0.0:8081->80/tcp`。",
          "`ss -lntp | grep :8081` 能看到 Docker 代理或容器进程。",
          "`curl -I http://localhost:8081` 返回 HTTP 响应。",
          "浏览器访问新端口能打开页面，日志中没有 `address already in use`。"
        ]
      },
      {
        title: "引用来源",
        source: {
          file: "02_容器实验_端口占用.md",
          section: "排查步骤",
          detail: "先 `docker ps -a`，再定位宿主机端口占用；优先停旧容器或换端口，不盲目删容器。"
        }
      }
    ],
    note: "如果容器里有数据库或课程数据，先备份再删除；端口冲突不是删容器的理由。"
  },
  {
    id: "permission",
    file: "03_Linux实验_权限不足.md",
    section: "排查步骤",
    caseNo: "03",
    title: "Permission denied：先看属主和父目录",
    subtitle: "不是所有权限错误都要 sudo，更不该直接 777。",
    confidence: "0.72",
    question: "Permission denied 怎么办？",
    badge: "命中 03",
    tags: ["Linux", "权限", "chmod"],
    keywords: ["permission", "denied", "权限", "chmod", "chown", "sudo", "root", "只读", "无法写入", "拒绝访问", "777"],
    sections: [
      {
        title: "问题定位",
        body: "当前用户对目标文件 / 目录缺少所需权限，或父目录缺少执行位。先确认“谁在操作、目标属主是谁、缺的是读 / 写 / 执行哪一位”，再决定用 sudo、chown 还是 chmod。"
      },
      {
        title: "可能原因",
        items: [
          "文件属主或所属组与当前用户不匹配。",
          "权限位缺少写权限或执行权限，例如脚本没有 `x`。",
          "父目录缺少执行位，导致无法进入或访问下级文件。",
          "挂载点被设为只读，或带有 `noexec`。",
          "SELinux / AppArmor 或 Windows ACL 拦截。"
        ]
      },
      {
        title: "解决步骤",
        items: [
          "先看身份：`id`；再看目标：`ls -ld 文件或目录`。",
          "逐级检查父目录：`namei -l /绝对路径/文件`，确认每一级都有执行位。",
          "如果是自己的脚本：`chmod u+x script.sh`；普通文件用 `chmod 644`，目录用 `chmod 755`。",
          "如果不是自己的文件，且课程允许：`sudo chown $USER 文件`，或只对单条命令用 `sudo`。",
          "父目录缺少执行位时，给所属用户补 `x`，不要直接 `chmod -R 777`。",
          "Windows 环境检查文件属性 / 安全选项卡，必要时用当前用户重新获取权限。"
        ]
      },
      {
        title: "验证方法",
        items: [
          "`ls -l` 能看到属主、组和权限位符合预期。",
          "`test -x script.sh && echo ok` 返回 `ok`。",
          "重新执行脚本或写入文件不再报 `Permission denied`。",
          "`namei -l` 显示路径每一级都可进入。"
        ]
      },
      {
        title: "引用来源",
        source: {
          file: "03_Linux实验_权限不足.md",
          section: "排查步骤",
          detail: "用 `id`、`ls -ld`、`namei -l` 定位；优先最小权限修复，避免 777。"
        }
      }
    ],
    note: "`chmod -R 777` 会让任何用户可写，课程环境也不建议；它掩盖问题，不解决问题。"
  }
];
