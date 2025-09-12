# Idea → MEU 浏览器插件

> 从 **Idea** 到 **最小可执行单元 (Minimum Executable Unit, MEU)** —— 让 AI 在安全的 Linux 环境中一步步构建你的想法。  

---

## ✨ 项目简介
这是一个浏览器插件 + 后端系统，允许用户在插件中记录想法（idea），AI 会将其转化为可执行的最小代码单元（MEU），并在受控的 Linux 环境中运行。  
用户可以在每一步确认或扩展，逐步构建完整项目。  

---

## 🏗️ 架构设计
```
浏览器插件  →  后端 API  →  AI 解析与规划层  →  Linux 执行层  →  执行结果反馈
```

- **浏览器插件**：记录 idea，展示执行结果。  
- **AI 解析与规划层**：将 idea 拆解为 MEU，生成代码与命令。  
- **Linux 执行层**：容器化环境，执行并返回结果。  
- **数据存储**：保存 idea、执行日志、代码文件。  

---

## 🔑 功能特性
- **记录想法**：支持文本（未来可扩展语音）。  
- **AI 转换**：自动将 idea 转化为最小可执行代码。  
- **Linux 执行**：在沙箱容器中运行，保证安全。  
- **逐步构建**：每次只推进一个 MEU，用户可选择“继续 / 修改”。  
- **结果展示**：在插件中查看日志、代码和运行结果。  
- **历史管理**：保存 idea 与执行历史，可回溯。  

---

## 🚀 开发阶段

### 阶段 1：原型验证
- 插件输入 idea → API → AI 生成简单命令 → Docker 执行 → 返回结果  
- 示例：  
  - 输入：“做一个 Hello World 网页”  
  - 输出：生成 `index.html` 并返回页面截图  

### 阶段 2：最小执行单元框架
- 定义 MEU 分层（Hello World → 基础功能 → 扩展）。  
- 插件展示代码与日志。  
- 用户确认后再进入下一步。  

### 阶段 3：功能扩展
- 多语言支持（Python、Node.js、Rust）。  
- 插件内代码编辑与下载。  
- 增加语音输入/播报结果。  

### 阶段 4：协作与生态
- 多用户协作，团队共享 idea。  
- GitHub/GitLab 集成（自动 push 结果）。  
- 支持 AI Pair Programming 模式。  

---

## 🛠️ 技术栈
- **浏览器插件**：Chrome Extension (Manifest V3) + React/Vue  
- **后端**：Node.js + Express / FastAPI (Python)  
- **AI 模型**：OpenAI GPT-4/5 API / 本地模型 (Llama, vLLM)  
- **执行环境**：Docker / Firecracker VM  
- **数据库**：MongoDB（初期） → PostgreSQL（进阶） 。。。

---

## 📦 项目结构（建议）
```
idea-meu/
├── extension/       # 浏览器插件代码
│   ├── popup.html
│   ├── popup.js
│   └── manifest.json
├── backend/         # 后端服务
│   ├── api/
│   ├── ai/
│   ├── executor/
│   └── server.js
├── docker/          # 执行容器配置
│   └── Dockerfile
├── db/              # 数据库初始化
│   └── schema.js
└── README.md        # 项目说明
```

---

## 📌 使用示例
1. 在插件中输入：  
   ```
   做一个展示随机名言的网页
   ```
2. AI 转换为任务：  
   - 创建 `index.html`，展示一条固定的名言。  
3. Linux 容器执行并返回结果：  
   - 网页可运行，插件展示结果。  
4. 用户选择 “下一步”：  
   - AI 扩展为 “名言从数组随机选择”。  

---

## 🔮 未来展望
- 支持语音 → Idea → MEU  
- 插件内可直接运行 Web Demo  
- 与 VS Code 插件联动，支持本地开发  
- 面向校园/团队的“AI Hackathon”工具  
