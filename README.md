# 📚 电子书阅读器

一个精美的在线 PDF 电子书阅读器，具有**液态玻璃（Glassmorphism）UI 效果**，纯前端实现，无需服务器。

## ✨ 功能特色

- 📤 **PDF 上传** — 支持拖拽 / 点击上传，本地 IndexedDB 存储
- 📖 **在线阅读** — PDF.js 渲染，流畅翻页
- 💾 **进度保存** — 自动记录每本书的阅读进度
- 🔍 **缩放控制** — 支持放大/缩小，键盘快捷键
- 📱 **移动端适配** — 触摸滑动翻页
- 🗑️ **书库管理** — 添加、删除书籍

## 🎨 UI 设计

- 动态渐变深色背景 + 光晕动效
- 所有面板采用毛玻璃效果（`backdrop-filter: blur`）
- 书籍卡片 3D 悬浮倾斜效果
- 玻璃质感按钮，hover 时扫光动画
- 阅读进度彩色渐变条

## 🚀 快速开始

### 方法一：GitHub Pages 部署

1. Fork 本仓库
2. 进入仓库 Settings → Pages
3. 选择 `main` 分支，保存
4. 访问 `https://<你的用户名>.github.io/<仓库名>/`

### 方法二：本地运行

```bash
# 使用任意静态文件服务器
npx serve .
# 或
python -m http.server 8080
```

> ⚠️ 注意：不能直接双击 `index.html` 打开，需通过 HTTP 服务器访问（IndexedDB 需要 HTTP 协议）

## ⌨️ 键盘快捷键

| 按键 | 功能 |
|------|------|
| `→` / `↓` / `空格` | 下一页 |
| `←` / `↑` | 上一页 |
| `+` / `=` | 放大 |
| `-` | 缩小 |
| `F` | 全屏切换 |

## 🛠️ 技术栈

- **PDF.js** (Mozilla) — PDF 渲染引擎
- **IndexedDB** — 存储 PDF 二进制数据
- **localStorage** — 存储书籍元数据和阅读进度
- 纯 HTML + CSS + JavaScript，零依赖

## 📁 文件结构

```
├── index.html    # 书库主页
├── reader.html   # 阅读器页面
├── style.css     # 液态玻璃主题样式
├── app.js        # 书库管理逻辑
├── reader.js     # 阅读器逻辑
└── README.md     # 说明文档
```

## 📝 注意事项

- PDF 文件存储在浏览器本地（IndexedDB），清除浏览器数据会导致书籍丢失
- 大文件（>100MB）可能加载较慢，请耐心等待
- 推荐使用 Chrome / Edge / Firefox 等现代浏览器
