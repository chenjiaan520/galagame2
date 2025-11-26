
# 🌸 RenYuki: 意淫你的嘎拉

> **Powered by Google Gemini 2.5**
>
> 这是一个基于生成式 AI 的交互式 **嘎拉**（Gala/Galgame）生成器。用户只需上传一张照片或输入名字，AI 将实时生成剧本、角色立绘、配音和分支剧情，打造独一无二的日系校园嘎拉物语。

## ✨ 核心亮点

### 1. 🎭 极致面部还原 (Photorealistic Face Swap)
*   **真人穿越**：上传您的自拍，AI 会通过高保真面部重绘技术，将您的面部特征完美融合到日系高中生（Gakuran/水手服）的身体上。
*   **表情差分**：基于同一张人脸生成“惊讶”、“害羞”、“大笑”等多种夸张颜艺表情（参考《半泽直树》风格），同时保持身份一致性。
*   **双角色支持**：支持分别上传男主和女主照片；若不上传，AI 将自动生成高质量的“京都动画（Clannad）”风格角色。

### 2. 📖 无限分支剧本 (Infinite Branching Story)
*   **动态节点**：告别线性剧情。AI 生成包含逻辑分支的 JSON 剧本树，您的选择将直接改变剧情走向和好感度。
*   **中日双语**：中文剧情文本 + AI 生成的日文语音台词（包含“傲娇/软萌”语气）。
*   **智能修复**：内置 JSON 自动修复逻辑，防止因 AI 输出中断导致的剧本崩溃。

### 3. 🔊 三层立体音效 (Three-Layer Audio)
*   **AI 全语音**：集成 Gemini 2.5 TTS 模型，通过自定义 PCM 解码器（24kHz）在浏览器端实时渲染高质量日语配音。
*   **环境沉浸**：自动混合 BGM（背景音乐）、环境音效（钟声、白噪音）和角色语音。
*   **自动播放策略**：通过交互层设计，完美解决现代浏览器的音频自动播放限制问题。

### 4. 💾 本地存档系统 (Save & Load)
*   **自动归档**：嘎拉生成完毕后会自动保存。即使您不小心刷新了页面，也可以在“读取记忆”中找到它。
*   **IndexedDB 支持**：由于生成素材（Base64 图片/音频）体积较大，项目使用 IndexedDB 实现大容量本地存储。
*   **完整状态保存**：可保存当前剧情节点、好感度、生成的立绘资源包，随时读取进度。

---

## 🚀 部署到 GitHub Pages

该项目已配置好，可以轻松部署到 GitHub Pages，让任何拥有 Gemini API Key 的用户直接通过网页游玩。

### 1. 初始化 Git
```bash
git init
git add .
git commit -m "Initial commit"
```

### 2. 创建 GitHub 仓库
1. 登录 GitHub，创建一个新的 **Public** 仓库（例如命名为 `ai-gala`）。
2. 将本地代码关联到远程仓库：
```bash
git remote add origin https://github.com/您的用户名/ai-gala.git
git branch -M main
git push -u origin main
```

### 3. 安装依赖与部署
确保您已安装 Node.js。
```bash
# 1. 安装项目依赖
npm install

# 2. 运行部署脚本
# 此命令会自动构建项目并将 'dist' 目录推送到 gh-pages 分支
npm run deploy
```

### 4. 访问网站
*   部署完成后，GitHub 会自动开启 Pages 服务。
*   访问地址通常为：`https://您的用户名.github.io/仓库名/`
*   将此链接分享给朋友，他们输入自己的 API Key 即可开始生成嘎拉！

---

## 🛠 技术栈

*   **Frontend**: React 19, TypeScript, Tailwind CSS, Vite
*   **AI Core**: Google GenAI SDK (`@google/genai`)
*   **Storage**: IndexedDB (Browser Native)
*   **Deployment**: GitHub Pages (`gh-pages`)

---

## ⚠️ 注意事项

*   **API Key 安全**：本项目是纯前端应用（Client-side only）。用户输入的 API Key 仅存储在用户自己的浏览器内存中，直接发送给 Google 服务器，**绝不会**发送给您的 GitHub 服务器或任何第三方，因此部署在 GitHub Pages 是安全的。
*   **API 配额**：生成的嘎拉内容消耗用户的 API 配额。

---

## 📜 License

MIT License