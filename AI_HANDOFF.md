# AI Development Handoff

> Audience: future ChatGPT/Codex agents. This is an operational handoff, not end-user documentation.
>
> Handoff date: 2026-07-27  
> Repository: `orange-lee-tech/ielts-learning-assistant`  
> Canonical branch: `main`  
> Product phase at handoff: initial development phase closed; future work is evolutionary development, refinement, testing, and maintenance.

## 0. Read this first

Before changing anything:

1. Read this file, `README.md`, `INSTALLATION.md`, `package.json`, `wxt.config.ts`, and all files under `entrypoints/`.
2. Inspect the current `main`; do not assume this handoff is newer than the repository.
3. Preserve old local notes. The storage key and record migration behavior are product contracts.
4. Keep the extension local-first and usable without VPN, remote servers, accounts, or AI APIs unless the user explicitly changes that requirement.
5. Treat Chrome and Edge as the primary supported browsers. Keep Firefox build compatibility, but remember unsigned Firefox packages are temporary-install only.
6. Make small, reversible changes. Do not rewrite the project or add a backend merely to implement a UI feature.
7. Never use force push, hard reset, destructive clean commands, or forced dependency upgrades without a separately verified reason and explicit authorization.

## 1. Product purpose and non-goals

IELTS Learning Assistant is a lightweight browser side-panel extension for the user's own IELTS preparation, especially work done on Chinese IELTS practice websites such as Tongzhuo English. It compensates for missing note-taking and review features.

Current product intent:

- capture selected text from a practice page;
- associate vocabulary with its original sentence and page;
- record notes, error reasons, tags, and Cambridge IELTS book number;
- review records by Cambridge IELTS year/book;
- edit, copy, delete, and export records;
- run locally on ordinary computers without VPN or a development terminal after installation;
- remain simple enough to share as an unpacked Chrome/Edge extension.

Explicit non-goals at this stage:

- commercialization or store distribution;
- cloud sync, login, collaboration, analytics, or remote telemetry;
- dependence on ChatGPT, AI APIs, a backend, VPN, or GitHub at runtime;
- a large knowledge-management platform;
- unnecessary architectural complexity.

When requirements conflict, prefer data safety, offline operation, simple UX, and backward compatibility over feature count.

## 2. Current stack and repository shape

- WXT browser-extension framework
- React 19 + TypeScript
- Chrome/Edge Manifest V3 builds
- Firefox build through the same WXT source
- browser-local storage through `browser.storage.local`

Important files:

| Path | Responsibility | Risk level |
|---|---|---|
| `entrypoints/sidepanel/App.tsx` | Data types, migration-on-read, Capture UI, Library UI, editing, deletion, copy, Markdown export | High: currently too many responsibilities in one file |
| `entrypoints/sidepanel/App.css` | Side-panel component styling | Medium |
| `entrypoints/sidepanel/style.css` | Global side-panel styling | Medium |
| `entrypoints/content.ts` | Reads page title, URL, and text selection; sends selection messages | High for website compatibility |
| `entrypoints/background.ts` | Opens Chromium side panel or Firefox sidebar from toolbar action | High for cross-browser behavior |
| `wxt.config.ts` | Manifest, permissions, icons, target browsers, Firefox extension ID | High for identity/data continuity |
| `package.json` / `package-lock.json` | Locked toolchain and build scripts | High; do not casually regenerate or force-upgrade |
| `INSTALLATION.md` | Real installation/update constraints | User-facing contract |
| `.github/workflows/` | CI production builds and downloadable artifacts | Verify actual workflow names before editing |

The current architecture is intentionally small. Refactor `App.tsx` only when a real feature or testability need justifies it. If refactoring, first extract pure data/export helpers and storage code without altering stored data.

## 3. Current implemented behavior

### Capture

- Reads the active page title, URL, and selected text.
- Allows manual editing of the captured sentence.
- Selects Cambridge IELTS books `21` through `4`.
- Stores multiple vocabulary items, split by commas or newlines and deduplicated.
- Stores freeform note text.
- Stores predefined error reasons.
- Supports default and custom tags.
- Existing records can be reopened in Capture and updated in place.

### Library

- Groups records by Cambridge IELTS book/year.
- Preserves vocabulary, context sentence, note, tags, error reasons, page title, URL, and timestamps in the same record.
- Supports filtering by book/year.
- Supports per-record copy, edit, and confirmed delete.
- Supports confirmed deletion of all records.
- Supports copying the complete Markdown document and downloading UTF-8-BOM `.md` output.

### Browser integration

- `content.ts` listens to `mouseup` and `keyup` and reports non-empty selections.
- Restricted/internal browser pages cannot run content scripts; failure there is expected, not automatically a bug.
- Chromium uses `browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })`.
- Firefox uses `sidebarAction.open()`.
- Runtime requires no network service.

## 4. Data contract — do not break this

Canonical storage key:

```text
ieltsNotes
```

Current conceptual record schema:

```ts
interface SavedNote {
  id: string;
  createdAt: string;
  updatedAt?: string;
  pageTitle: string;
  pageUrl: string;
  selectedText: string;
  note: string;
  errorReasons: string[];
  tags: string[];
  bookYear?: string;
  vocabulary?: string[];
}
```

Compatibility rules:

- Older records may lack `bookYear`, `vocabulary`, `updatedAt`, or valid arrays.
- On read, missing array fields must normalize to empty arrays.
- A record without `bookYear` belongs to “未分类旧笔记”; do not silently assign it to book 21.
- Editing must retain the same `id` and original `createdAt`; set/update `updatedAt`.
- Never clear, rename, or overwrite `ieltsNotes` as a migration shortcut.
- Any schema extension should be optional first, normalized on read, and written only when the user saves/updates a record.
- Before a destructive migration, add export/backup and migration tests. Prefer a versioned migration function over inline casts.

Important: notes live in the browser extension's local storage, not in the unpacked source folder. Normal replacement/reload should retain data only if the browser continues to recognize the same extension identity/profile. Removing the extension, changing identity, switching browser profiles, or certain reinstall flows can lose access to that storage. Always tell users to export Markdown before risky upgrades.

## 5. Known fragile areas and recurring failure modes

### A. Installation folder lifetime

Chrome/Edge “Load unpacked” reads the selected folder in place. The folder must not be deleted, moved, or renamed after loading. Share only the production folder (`chrome-mv3` or `edge-mv3`), not `chrome-mv3-dev`. The recipient must unzip it into a permanent location before loading it.

### B. False build-success messages

A previous PowerShell sequence printed “构建成功” with `Write-Host` even though `npm`/`npx` had failed. Never use an unconditional message as evidence. A successful build requires:

- zero exit status for install/type-check/build commands;
- WXT success output;
- actual `.output/<browser>/manifest.json` files;
- preferably CI success as an independent check.

### C. PowerShell execution policy

On the user's Windows system, `npm.ps1` and `npx.ps1` may be blocked. Use:

```powershell
npm.cmd ci
npm.cmd run build:chrome
npm.cmd run build:edge
```

Do not instruct the user to weaken the system execution policy when `.cmd` is sufficient.

### D. Locked native dependency (`EPERM`)

`npm ci` previously failed to unlink a Rolldown native binding because a Node/WXT/Vite process held the file. Safe recovery sequence:

1. close terminals/dev servers;
2. stop residual Node processes if appropriate;
3. remove only this repository's `node_modules`;
4. keep `package-lock.json`;
5. run `npm.cmd ci` again;
6. if still locked, reboot before opening editors/dev servers.

Do not accept `npx`'s prompt to install an arbitrary temporary WXT version when the locked local install is broken.

### E. Multiple GitHub accounts

The user's canonical remote is the orange account/repository. Expected remote:

```text
https://orange-lee-tech@github.com/orange-lee-tech/ielts-learning-assistant.git
```

Git Credential Manager may need path-specific credentials:

```powershell
git config --global credential.https://github.com.useHttpPath true
```

Do not delete unrelated GitHub credentials. Verify `git remote -v`, branch tracking, and account before push.

### F. Content-script restrictions

`<all_urls>` does not mean browser internal pages are injectable. `chrome://`, `edge://`, extension stores, some PDF/viewer pages, and protected pages may fail. Catching the message error is intentional. Test ordinary HTTPS pages separately before diagnosing a product failure.

### G. Selection timing

Selection capture depends on `mouseup`/`keyup`, side-panel open state, active tab, and message delivery. Changes to these listeners can cause duplicate messages, stale sentences, or missed keyboard selections. Verify mouse selection, keyboard selection, tab switching, page refresh, and opening the side panel after selection.

### H. Editing state

Editing a Library record copies its stored page context into Capture. A refresh or tab-change listener can potentially replace that context with the active page while editing. Future work should explicitly guard editing state if this becomes observable. Do not “fix” it by creating a duplicate record.

### I. Export correctness

Markdown export intentionally uses a UTF-8 BOM for Windows Notepad/WPS compatibility. Test Chinese, English, multiline text, Markdown punctuation, URLs containing special characters, blank fields, and old records. The current escaping is minimal and may require hardening before more complex content is supported.

### J. Firefox expectations

Firefox compatibility is secondary. Unsigned XPI/unpacked installation is not equivalent to Chrome/Edge persistent loading. Do not promise persistent Firefox distribution without Mozilla signing. Keep the Firefox extension ID stable unless a deliberate migration plan exists.

## 6. Build and verification baseline

Environment: Node.js 20 or newer.

Preferred clean verification:

```bash
npm ci
npm run compile
npm run build:chrome
npm run build:edge
npm run build:firefox
```

On the user's PowerShell system, prefer:

```powershell
npm.cmd ci
npm.cmd run compile
npm.cmd run build:chrome
npm.cmd run build:edge
npm.cmd run build:firefox
```

After building, verify:

```text
.output/chrome-mv3/manifest.json
.output/edge-mv3/manifest.json
```

Firefox output directory naming must be checked from the actual WXT output rather than assumed.

Minimum manual regression checklist:

1. Load the correct production folder in Chrome and Edge.
2. Click toolbar icon; side panel opens.
3. On a normal HTTPS page, select text with mouse; Capture receives sentence/title/URL.
4. Repeat using keyboard selection.
5. Save a book-21 record with two vocabulary items, multiline note, an error reason, and custom tag.
6. Confirm Library grouping and vocabulary-to-sentence context.
7. Edit the same record; confirm no duplicate and unchanged `id`/creation date behavior.
8. Copy sentence, note, one record, and full Markdown document.
9. Export Markdown; open it in Windows Notepad or WPS and confirm Chinese is not garbled.
10. Cancel a delete, then confirm a delete on a disposable record.
11. Reload/restart the browser; confirm records remain.
12. Test an old-format record or fixture lacking new fields; confirm it appears under “未分类旧笔记”.
13. Visit a restricted page; confirm graceful empty/manual-input behavior rather than a crash.
14. Run all three production builds and check GitHub Actions.

At handoff there is no mature automated test suite covering storage migrations or React interactions. Adding focused unit tests for pure migration/export functions and a small browser E2E smoke test is a high-value next step.

## 7. Development discipline for future AI agents

For each requested feature:

1. Restate the exact scope and identify whether it changes the stored schema, permissions, manifest, or install identity.
2. Inspect the latest code and uncommitted/local state before editing.
3. Define backward-compatible behavior for records created by previous versions.
4. Implement the smallest coherent change.
5. Run TypeScript and all three production builds.
6. Manually test the changed user flow and the old-data path.
7. Review the production manifest for unexpected permissions.
8. Update `README.md`, `INSTALLATION.md`, and this handoff when the operational contract changes.
9. Commit with a specific message and push only to the explicitly authorized target.
10. Verify the remote commit and CI; never report completion based only on local edits.

Avoid:

- replacing local storage with a database for convenience;
- introducing a framework/state library for a small feature;
- broad dependency upgrades mixed with feature work;
- changing permissions without explaining why;
- changing extension IDs/names casually;
- destructive data “cleanup”;
- generating duplicate notes during edit/save;
- assuming output folder names, CI artifact names, or current branch state;
- treating README claims as stronger evidence than current code/build output.

## 8. Recommended evolutionary roadmap

Priority order unless the user overrides it:

### P0 — stability and recoverability

- Extract and test `normalizeSavedNote(s)` and schema migration logic.
- Add explicit storage schema versioning without renaming `ieltsNotes`.
- Add import/restore from exported Markdown or, preferably, a lossless JSON backup format alongside human-readable Markdown.
- Add migration and export unit tests.
- Guard editing context from active-tab refresh overwrites.
- Add a minimal Chrome/Edge E2E smoke test.

### P1 — core learning usability

- Search and filter by vocabulary, tag, error reason, page, and date.
- Improve vocabulary-centric review while retaining sentence context.
- Add safe sorting and lightweight duplicate detection.
- Add undo or a trash/recovery window for deletion.
- Improve empty/error/status accessibility and keyboard navigation.

### P2 — portability and distribution

- Produce clearly named release artifacts with version information.
- Consider GitHub Releases for easier non-technical downloads.
- Document stable-folder upgrades more clearly.
- Only pursue store publication or Firefox signing if the user explicitly wants distribution beyond personal sharing.

Do not implement cloud sync or AI features merely because they are technically possible. Confirm that they serve the user's local, low-friction IELTS workflow.

## 9. Current acceptance boundary

The concluded development phase delivered a usable local-first foundation:

- cross-browser production builds;
- Chrome/Edge long-term unpacked loading;
- local note storage;
- capture, edit, tags, error reasons, and Cambridge IELTS classification;
- vocabulary linked to context sentence/page;
- Library grouping/filtering;
- copy/delete controls;
- Markdown export;
- install documentation and CI builds.

Future work should be treated as enhancement, stabilization, or maintenance—not as a fresh project initialization. Preserve what works and do not repeat scaffold/setup work.

## 10. Fast takeover prompt

A future AI can use this internal checklist:

```text
Open orange-lee-tech/ielts-learning-assistant on main. Read AI_HANDOFF.md first, then inspect README.md, INSTALLATION.md, package.json, wxt.config.ts, and entrypoints/. Preserve the ieltsNotes storage contract and old-data compatibility. Keep runtime local-only and Chrome/Edge-first. Before editing, identify schema/permission/identity impact. After editing, run TypeScript plus Chrome/Edge/Firefox production builds, test the affected flow and old records, verify CI and the remote commit, and update the handoff if operational assumptions changed.
```
