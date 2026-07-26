# IELTS Learning Assistant

IELTS Learning Assistant 是一个本地优先的浏览器侧栏插件，用于在练习网页中收集词汇和语境原句、记录错因与笔记，并按剑雅题库年份复盘。

当前主仓库：

```text
orange-lee-tech/ielts-learning-assistant
```

## 当前功能

- 点击浏览器工具栏图标打开侧栏；
- 捕获普通网页中的选中文本；
- 选择剑雅 21 至剑雅 4 的题库年份；
- 记录词汇、语境原句、笔记、错因及自由标签；
- 再次编辑和保存已有记录；
- 按剑雅年份自动整理 Library；
- 将词汇与记录时的原句和原网页链接保持关联；
- 复制、编辑或删除单条记录；
- 复制全部记录或导出 UTF-8 Markdown 文档；
- 使用同一套源码构建 Chrome、Edge 和 Firefox 版本。

插件运行时不连接 AI 服务、远程服务器或 GitHub，也不依赖 VPN。

## 数据兼容

本次更新继续读取此前版本已保存的 `ieltsNotes`。旧笔记不会因升级而删除；由于旧数据没有题库年份和词汇字段，它们会显示在 Library 的“未分类旧笔记”中，可通过“编辑”补充后重新保存。

## 开发与正式构建

环境要求：Node.js 20 或更高版本。

```bash
npm install
npm run dev
npm run build:all
npm run zip:all
```

输出位于 `.output`。每次更新 `main` 后，GitHub Actions 会自动构建 Chrome、Edge 和 Firefox 分享包。面向普通用户的安装和升级步骤见 [INSTALLATION.md](./INSTALLATION.md)。

## 日常维护

```powershell
cd C:\Users\yulia\Desktop\itel
git status
git pull --ff-only
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

不要在未确认原因时使用：

```text
git push --force
git reset --hard
git clean -fd
npm audit fix --force
```

VPN 或代理只可能影响 GitHub 下载、拉取和推送，不影响已经安装的插件日常运行。

## 隐私与备份

所有学习记录保存在浏览器扩展本地存储中，不会自动上传。更换电脑、浏览器配置、扩展版本或删除插件前，请先在 Library 使用“导出 Markdown”保存本地备份。
