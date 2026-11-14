# IELTS Learning Assistant

IELTS Learning Assistant 是一款本地优先的浏览器侧栏插件，可在练习网页中收集词汇和语境原句、记录错因与笔记，并按剑桥雅思真题集（剑雅）年份进行复盘。

IELTS Learning Assistant is a local-first browser sidebar extension. It collects vocabulary and contextual sentences from practice webpages, records notes and reasons for mistakes, and organizes review by Cambridge IELTS book.

当前主仓库：

The primary repository is:

```text
orange-lee-tech/ielts-learning-assistant
```

## 当前功能 | Current Features

- 点击浏览器工具栏图标打开侧栏；
  Click the browser toolbar icon to open the sidebar.
- 捕获普通网页中的选中文本；
  Capture selected text from ordinary webpages.
- 选择剑雅 21 至剑雅 4 的题库年份；
  Select a question-bank year from Cambridge IELTS 21 through Cambridge IELTS 4.
- 记录词汇、语境原句、笔记、错因及自由标签；
  Record vocabulary, contextual sentences, notes, reasons for mistakes, and custom tags.
- 再次编辑和保存已有记录；
  Re-edit and save existing records.
- 按剑雅年份自动整理 Library；
  Automatically organize the Library by Cambridge IELTS year.
- 将词汇与记录时的原句和原网页链接保持关联；
  Keep each vocabulary item linked to its original sentence and source webpage.
- 复制、编辑或删除单条记录；
  Copy, edit, or delete individual records.
- 复制全部记录或导出 UTF-8 Markdown 文档；
  Copy all records or export them as a UTF-8 Markdown document.
- 使用同一套源码构建 Chrome、Edge 和 Firefox 版本。
  Build versions for Chrome, Edge, and Firefox from the same source code.

插件运行时不连接 AI 服务、远程服务器或 GitHub，也不依赖 VPN。

At runtime, the extension does not connect to AI services, remote servers, or GitHub, and it does not require a VPN.

## 数据兼容 | Data Compatibility

本次更新继续读取此前版本已保存的 `ieltsNotes`。旧笔记不会因升级而删除；由于旧数据没有题库年份和词汇字段，它们会显示在 Library 的“未分类旧笔记”中，可通过“编辑”补充后重新保存。

This release continues to read `ieltsNotes` saved by previous versions. Existing notes are not deleted during upgrades. Because legacy records do not contain question-bank year or vocabulary fields, they appear under “Uncategorized Legacy Notes” in the Library. You can add the missing information by selecting “Edit” and saving the record again.

## 开发与正式构建 | Development and Production Builds

环境要求：Node.js 20 或更高版本。

Requirement: Node.js 20 or later.

```bash
npm install
npm run dev
npm run build:all
npm run zip:all
```

输出位于 `.output`。每次更新 `main` 后，GitHub Actions 会自动构建 Chrome、Edge 和 Firefox 分享包。面向普通用户的安装和升级步骤见 [INSTALLATION.md](./INSTALLATION.md)。

Build outputs are placed in `.output`. Whenever `main` is updated, GitHub Actions automatically builds distributable packages for Chrome, Edge, and Firefox. For installation and upgrade instructions for end users, see [INSTALLATION.md](./INSTALLATION.md).

## 日常维护 | Routine Maintenance

以下为常用的 Windows PowerShell 维护流程：

The following is a commonly used maintenance workflow in Windows PowerShell:

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

The configured remote repository should be:

```text
origin  https://orange-lee-tech@github.com/orange-lee-tech/ielts-learning-assistant.git
```

多 GitHub 账号环境可启用按完整仓库路径区分凭据：

In an environment with multiple GitHub accounts, credentials can be distinguished by the full repository path:

```powershell
git config --global credential.https://github.com.useHttpPath true
```

不要在未确认原因时使用：

Do not use the following commands unless you have identified the reason and understand the consequences:

```text
git push --force
git reset --hard
git clean -fd
npm audit fix --force
```

VPN 或代理只可能影响 GitHub 下载、拉取和推送，不影响已经安装的插件日常运行。

A VPN or proxy may affect GitHub downloads, pulls, and pushes, but it does not affect the day-to-day operation of an already installed extension.

## 隐私与备份 | Privacy and Backups

所有学习记录保存在浏览器扩展本地存储中，不会自动上传。更换电脑、浏览器配置、扩展版本或删除插件前，请先在 Library 使用“导出 Markdown”保存本地备份。

All learning records are stored locally by the browser extension and are not uploaded automatically. Before changing computers or browser profiles, upgrading or removing the extension, export a Markdown backup from the Library and save it locally.
