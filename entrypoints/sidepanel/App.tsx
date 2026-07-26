import { useCallback, useEffect, useMemo, useState } from 'react';
import { browser } from 'wxt/browser';
import './App.css';

type PanelView = 'capture' | 'library' | 'settings';

interface PageContext {
  title: string;
  url: string;
  selectedText: string;
}

interface SelectionResponse {
  title?: string;
  url?: string;
  selectedText?: string;
}

interface SavedNote {
  id: string;
  createdAt: string;
  pageTitle: string;
  pageUrl: string;
  selectedText: string;
  note: string;
  errorReasons: string[];
  tags: string[];
}

const ERROR_OPTIONS = [
  '生词 Vocabulary',
  '连读 Linking',
  '弱读 Weak form',
  '语速 Speed',
  '注意力 Attention',
  '替换表达 Paraphrase',
];

const TAG_OPTIONS = ['Listening', 'Reading', 'Writing', 'Speaking'];

const formatTextExport = (notes: SavedNote[]) => {
  const lines = [
    'IELTS Learning Assistant - Notes Export',
    `Exported at: ${new Date().toLocaleString('zh-CN')}`,
    `Total notes: ${notes.length}`,
    '',
  ];

  notes.forEach((item, index) => {
    lines.push(
      '='.repeat(64),
      `Note ${index + 1}`,
      `Created: ${new Date(item.createdAt).toLocaleString('zh-CN')}`,
      `Tags: ${item.tags.join(', ') || '-'}`,
      `Error reasons: ${item.errorReasons.join(', ') || '-'}`,
      `Page: ${item.pageTitle || '-'}`,
      `URL: ${item.pageUrl || '-'}`,
      '',
      'Selected sentence:',
      item.selectedText || '-',
      '',
      'Note:',
      item.note || '-',
      '',
    );
  });

  return lines.join('\r\n');
};

function App() {
  const [view, setView] = useState<PanelView>('capture');
  const [page, setPage] = useState<PageContext>({
    title: '正在读取当前页面…',
    url: '',
    selectedText: '',
  });
  const [note, setNote] = useState('');
  const [errorReasons, setErrorReasons] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>(['Listening']);
  const [savedNotes, setSavedNotes] = useState<SavedNote[]>([]);
  const [status, setStatus] = useState('');
  const [exportStatus, setExportStatus] = useState('');

  const loadSavedNotes = useCallback(async () => {
    const result = await browser.storage.local.get('ieltsNotes');
    const notes = Array.isArray(result.ieltsNotes)
      ? (result.ieltsNotes as SavedNote[])
      : [];
    setSavedNotes(notes);
  }, []);

  const refreshPageContext = useCallback(async () => {
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });

    let selection: SelectionResponse | undefined;

    if (tab?.id !== undefined) {
      try {
        selection = (await browser.tabs.sendMessage(tab.id, {
          type: 'IELTS_GET_SELECTION',
        })) as SelectionResponse | undefined;
      } catch {
        // Browser internal pages do not allow content scripts. Page title and URL
        // can still be displayed, so this is intentionally ignored.
      }
    }

    setPage({
      title: selection?.title || tab?.title || '当前页面',
      url: selection?.url || tab?.url || '',
      selectedText: selection?.selectedText?.trim() || '',
    });
  }, []);

  useEffect(() => {
    void loadSavedNotes();
    void refreshPageContext();

    const handleMessage = (message: unknown) => {
      if (
        typeof message === 'object' &&
        message !== null &&
        'type' in message &&
        message.type === 'IELTS_SELECTION_CHANGED' &&
        'payload' in message
      ) {
        const payload = message.payload as SelectionResponse;
        setPage((current) => ({
          title: payload.title || current.title,
          url: payload.url || current.url,
          selectedText: payload.selectedText?.trim() || '',
        }));
      }
    };

    const handleTabActivated = () => {
      void refreshPageContext();
    };

    const handleTabUpdated = (
      _tabId: number,
      changeInfo: { status?: string },
    ) => {
      if (changeInfo.status === 'complete') {
        void refreshPageContext();
      }
    };

    browser.runtime.onMessage.addListener(handleMessage);
    browser.tabs.onActivated.addListener(handleTabActivated);
    browser.tabs.onUpdated.addListener(handleTabUpdated);

    return () => {
      browser.runtime.onMessage.removeListener(handleMessage);
      browser.tabs.onActivated.removeListener(handleTabActivated);
      browser.tabs.onUpdated.removeListener(handleTabUpdated);
    };
  }, [loadSavedNotes, refreshPageContext]);

  const selectedSummary = useMemo(() => {
    if (!page.selectedText) return '暂未捕获文本';
    return `${page.selectedText.length} characters selected`;
  }, [page.selectedText]);

  const toggleValue = (
    value: string,
    current: string[],
    update: (values: string[]) => void,
  ) => {
    update(
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  };

  const saveNote = async () => {
    if (!page.selectedText.trim() && !note.trim()) {
      setStatus('请先选择英文句子，或填写一条笔记。');
      return;
    }

    const savedNote: SavedNote = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      pageTitle: page.title,
      pageUrl: page.url,
      selectedText: page.selectedText.trim(),
      note: note.trim(),
      errorReasons,
      tags,
    };

    const nextNotes = [savedNote, ...savedNotes];
    await browser.storage.local.set({ ieltsNotes: nextNotes });
    setSavedNotes(nextNotes);
    setNote('');
    setErrorReasons([]);
    setStatus('已保存到本机学习库。');
  };

  const exportNotesAsText = () => {
    if (savedNotes.length === 0) {
      setExportStatus('暂无笔记可导出。');
      return;
    }

    const blob = new Blob(['\ufeff', formatTextExport(savedNotes)], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);

    link.href = url;
    link.download = `IELTS-Notes-${date}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setExportStatus(`已导出 ${savedNotes.length} 条笔记。`);
  };

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand-mark" aria-hidden="true">
          IL
        </div>
        <div>
          <p className="eyebrow">STUDY COMPANION</p>
          <h1>IELTS Learning Assistant</h1>
        </div>
      </header>

      <nav className="view-tabs" aria-label="主导航">
        <button
          className={view === 'capture' ? 'active' : ''}
          onClick={() => setView('capture')}
        >
          Capture
        </button>
        <button
          className={view === 'library' ? 'active' : ''}
          onClick={() => setView('library')}
        >
          Library
        </button>
        <button
          className={view === 'settings' ? 'active' : ''}
          onClick={() => setView('settings')}
        >
          Settings
        </button>
      </nav>

      {view === 'capture' && (
        <section className="view-content">
          <article className="page-card">
            <div className="section-heading">
              <span>Current page</span>
              <button className="text-button" onClick={refreshPageContext}>
                刷新
              </button>
            </div>
            <strong title={page.title}>{page.title}</strong>
            <p title={page.url}>{page.url || '当前页面不允许读取网址'}</p>
          </article>

          <section className="form-section">
            <div className="section-heading">
              <label htmlFor="selected-text">Selected sentence</label>
              <span>{selectedSummary}</span>
            </div>
            <textarea
              id="selected-text"
              value={page.selectedText}
              onChange={(event) =>
                setPage((current) => ({
                  ...current,
                  selectedText: event.target.value,
                }))
              }
              placeholder="在网页中选中一句英文，文本会自动出现在这里。"
              rows={5}
            />
          </section>

          <section className="form-section">
            <label htmlFor="note">Note</label>
            <textarea
              id="note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="记录错因、理解、替换表达或复盘提醒。"
              rows={4}
            />
          </section>

          <section className="form-section">
            <span className="field-label">Error reasons</span>
            <div className="choice-grid">
              {ERROR_OPTIONS.map((option) => (
                <label className="choice" key={option}>
                  <input
                    type="checkbox"
                    checked={errorReasons.includes(option)}
                    onChange={() =>
                      toggleValue(option, errorReasons, setErrorReasons)
                    }
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          </section>

          <section className="form-section">
            <span className="field-label">Tags</span>
            <div className="tag-row">
              {TAG_OPTIONS.map((tag) => (
                <button
                  key={tag}
                  className={tags.includes(tag) ? 'tag selected' : 'tag'}
                  onClick={() => toggleValue(tag, tags, setTags)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </section>

          <button className="primary-button" onClick={saveNote}>
            Save note
          </button>
          <p className="status" aria-live="polite">
            {status}
          </p>
        </section>
      )}

      {view === 'library' && (
        <section className="view-content">
          <div className="library-heading">
            <div>
              <p className="eyebrow">LOCAL LIBRARY</p>
              <h2>{savedNotes.length} saved notes</h2>
            </div>
            <button
              className="secondary-button"
              onClick={exportNotesAsText}
              disabled={savedNotes.length === 0}
            >
              导出 TXT
            </button>
          </div>
          {exportStatus && (
            <p className="export-status" aria-live="polite">
              {exportStatus}
            </p>
          )}

          {savedNotes.length === 0 ? (
            <div className="empty-state">
              <strong>学习库还是空的</strong>
              <p>回到 Capture，保存第一条精听或阅读笔记。</p>
            </div>
          ) : (
            <div className="note-list">
              {savedNotes.slice(0, 20).map((item) => (
                <article className="note-card" key={item.id}>
                  <div className="note-meta">
                    <span>{item.tags.join(' · ') || 'Uncategorised'}</span>
                    <time dateTime={item.createdAt}>
                      {new Date(item.createdAt).toLocaleDateString('zh-CN')}
                    </time>
                  </div>
                  <strong>{item.selectedText || item.note}</strong>
                  {item.note && <p>{item.note}</p>}
                  <small>{item.pageTitle}</small>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {view === 'settings' && (
        <section className="view-content">
          <div className="settings-card">
            <p className="eyebrow">VERSION 0.1</p>
            <h2>Local-first learning workspace</h2>
            <p>
              当前版本只把笔记保存在本机浏览器中，不上传学习内容，也不连接任何 AI
              服务。
            </p>
          </div>
          <div className="settings-card">
            <h3>Current scope</h3>
            <ul>
              <li>读取当前网页标题和网址</li>
              <li>捕获网页选中文本</li>
              <li>记录笔记、错因和技能标签</li>
              <li>在本机学习库中复盘</li>
              <li>把全部笔记导出为本地 TXT 文件</li>
            </ul>
          </div>
        </section>
      )}
    </main>
  );
}

export default App;
