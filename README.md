# IELTS Learning Assistant

IELTS Learning Assistant 是一个本地优先的浏览器侧栏插件，用于在练习网页中收集选中文本、记录错因和笔记，并在本机学习库中复盘。

当前主仓库：

```text
orange-lee-tech/ielts-learning-assistant
```

## 当前功能

- 点击浏览器工具栏图标打开侧栏；
- 显示当前页面标题和网址；
- 捕获普通网页中的选中文本；
- 记录笔记、错因和 IELTS 科目标签；
- 将笔记保存到浏览器本地存储；
- 在 Library 查看最近笔记；
- 将全部笔记导出为 UTF-8 TXT 文件；
- 使用同一套源码构建 Chrome、Edge 和 Firefox 版本。

插件运行时不连接 AI 服务、远程服务器或 GitHub，也不依赖 VPN。

## 开发

环境要求：Node.js 20 或更高版本。

```bash
npm install
npm run dev
```

分别启动浏览器开发构建：

```bash
npm run dev:chrome
npm run dev:edge
npm run dev:firefox
```

## 正式构建

检查 TypeScript 并构建三个浏览器版本：

```bash
npm run build:all
```

生成分享用压缩包：

```bash
npm run zip:all
```

输出位于 `.output`。Chrome 与 Edge 使用各自的 Chromium MV3 构建；Firefox 使用 WXT 生成的 Firefox 目标构建。

每次更新 `main` 后，GitHub Actions 也会自动完成相同检查并保存四个构建产物 30 天。打开仓库的 `Actions` → `Build browser extension` → 最新成功记录，在页面底部下载 artifact 即可分享。

面向普通用户的安装步骤见 [INSTALLATION.md](./INSTALLATION.md)。

## 日常维护

每次开始开发：

```powershell
cd C:\Users\yulia\Desktop\itel
git status
git pull --ff-only
```

完成修改后：

```powershell
npm.cmd run build:all
git status
git diff --stat
git add .
git commit -m "本次改动说明"
git push
git status
```

当前远程仓库应为：

```text
origin  https://orange-lee-tech@github.com/orange-lee-tech/ielts-learning-assistant.git
```

多 GitHub 账号环境可启用按完整仓库路径区分凭据：

```powershell
git config --global credential.https://github.com.useHttpPath true
```

推送失败时，先运行：

```powershell
git status
git log --oneline -3
git remote -v
git ls-remote origin
```

不要在未确认原因时使用：

```text
git push --force
git reset --hard
git clean -fd
npm audit fix --force
```

VPN 或代理只可能影响 GitHub 下载、拉取和推送，不影响已经安装的插件日常运行。不要在仓库中写死某台电脑的代理端口。

## 隐私与备份

Version 0.1 的笔记保存在浏览器扩展本地存储中，不会自动上传。更换电脑、浏览器配置或删除插件前，请先在 Library 使用“导出 TXT”保存一份本地备份。
