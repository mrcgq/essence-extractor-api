# 🔬 高保真文档提炼器 · API版

> 双程高保真提取 · 五要素语义边界 · 禁止项强制保留
> 支持 Google Gemini · Anthropic Claude · OpenAI GPT

## 快速开始

### Web 界面

部署到 GitHub Pages 后访问即可使用。

**推荐：Google AI Studio（免费）**
1. 访问 https://aistudio.google.com/apikey 获取免费 API Key
2. 在工具页面填入 Key，选择 `gemini-2.0-flash`
3. 上传文件，点击提炼

### CLI 命令行

```bash
# 克隆项目（无需 npm install）
git clone https://github.com/你的用户名/essence-extractor-api.git
cd essence-extractor-api

# Google Gemini（推荐，免费）
node cli.js --file=文档.txt --provider=google --key=AIza...

# Anthropic Claude
node cli.js --file=文档.txt --provider=anthropic --key=sk-ant-...

# OpenAI GPT
node cli.js --file=文档.txt --provider=openai --key=sk-...

# 输出 Word 格式
node cli.js --file=文档.txt --provider=google --key=AIza... --format=docx

# 使用环境变量（更安全）
export GOOGLE_API_KEY=AIza...
node cli.js --file=文档.txt
```

## Cloudflare Worker 代理（解决CORS）

1. 登录 https://dash.cloudflare.com
2. Workers & Pages → 创建 Worker
3. 粘贴 `worker.js` 内容
4. 修改 `ALLOWED_ORIGINS` 为你的 GitHub Pages 地址
5. 部署后填入工具的代理地址框

## 提取质量保障

- **双程提取**：Pass1 全局骨架 → Pass2 局部细节
- **五要素锚定**：主体/约束/禁止/权责/时效
- **禁止项强制保留**：不允许省略或合并
- **反幻觉指令**：只提取原文存在的内容
- **原文优先**：核心定义必须精确引用原文
