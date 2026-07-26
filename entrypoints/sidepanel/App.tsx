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

const BOOK_YEARS = Array.from({ length: 18 }, (_, index) => String(21 - index));
const ERROR_OPTIONS = [
  '生词 Vocabulary',
  '连读 Linking',
  '弱读 Weak form',
  '语速 Speed',
  '注意力 Attention',
  '替换表达 Paraphrase',
];
const DEFAULT_TAGS = ['Listening', 'Reading', 'Writing', 'Speaking'];

const parseVocabulary = (value: string) =>
  [...new Set(value.split(/[,\n，；;]/).map((word) => word.trim()).filter(Boolean))];

const escapeMarkdown = (value: string) => value.replace(/\|/g, '\\|').trim();

const formatMarkdown = (notes: SavedNote[]) => {
  const grouped = notes.reduce<Record<string, SavedNote[]>>((result, item) => {
    const year = item.bookYear || '未分类';
    (result[year] ??= []).push(item);
    return result;
  }, {});

  const years = Object.keys(grouped).sort((a, b) => {
    if (a === '未分类') return 1;
    if (b === '未分类') return -1;
    return Number(b) - Number(a);
  });
  const lines = [
    '# IELTS Learning Assistant 学习笔记',
    '',
    `> 导出时间：${new Date().toLocaleString('zh-CN')}  `,
    `> 共 ${notes.length} 条记录`,
    '',
  ];

  years.forEach((year) => {
    lines.push(`## ${year === '未分类' ? '未分类' : `剑雅 ${year}`}`, '');
    grouped[year].forEach((item, index) => {
      lines.push(
        `### ${index + 1}. ${item.vocabulary?.join(' · ') || '学习记录'}`,
        '',
        `- **标签：** ${item.tags.map(escapeMarkdown).join('、') || '无'}`,
        `- **错因：** ${item.errorReasons.map(escapeMarkdown).join('、') || '无'}`,
        `- **日期：** ${new Date(item.createdAt).toLocaleString('zh-CN')}`,
        `- **页面：** ${escapeMarkdown(item.pageTitle || '无')}`,
        `- **链接：** ${item.pageUrl ? `[打开原页面](${item.pageUrl})` : '无'}`,
        '',
        '**语境原句**',
        '',
        `> ${(item.selectedText || '无').replace(/\n/g, '\n> ')}`,
        '',
        '**词汇**',
        '',
        item.vocabulary?.length ? item.vocabulary.map((word) => `- ${word}`).join('\n') : '- 无',
        '',
        '**笔记**',
        '',
        item.note || '无',
        '',
        '---',
        '',
      );
    });
  });
  return lines.join('\n');
};

const copyText = async (text: string) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const area = document.createElement('textarea');
  area.value = text;
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  document.execCommand('copy');
  area.remove();
};

function App() {
  const [view, setView] = useState<PanelView>('capture');
  const [page, setPage] = useState<PageContext>({
    title: '正在读取当前页面…',
    url: '',
    selectedText: '',
  });
  const [bookYear, setBookYear] = useState('21');
  const [vocabularyText, setVocabularyText] = useState('');
  const [note, setNote] = useState('');
  const [errorReasons, setErrorReasons] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>(['Listening']);
  const [customTag, setCustomTag] = useState('');
  const [savedNotes, setSavedNotes] = useState<SavedNote[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [libraryYear, setLibraryYear] = useState('all');
  const [status, setStatus] = useState('');

  const persistNotes = useCallback(async (notes: SavedNote[]) => {
    await browser.storage.local.set({ ieltsNotes: notes });
    setSavedNotes(notes);
  }, []);

  const loadSavedNotes = useCallback(async () => {
    const result = await browser.storage.local.get('ieltsNotes');
    const notes = Array.isArray(result.ieltsNotes)
      ? (result.ieltsNotes as SavedNote[]).map((item) => ({
          ...item,
          errorReasons: Array.isArray(item.errorReasons) ? item.errorReasons : [],
          tags: Array.isArray(item.tags) ? item.tags : [],
          vocabulary: Array.isArray(item.vocabulary) ? item.vocabulary : [],
        }))
      : [];
    setSavedNotes(notes);
  }, []);

  const refreshPageContext = useCallback(async () => {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    let selection: SelectionResponse | undefined;
    if (tab?.id !== undefined) {
      try {
        selection = (await browser.tabs.sendMessage(tab.id, {
          type: 'IELTS_GET_SELECTION',
        })) as SelectionResponse | undefined;
      } catch {
        // Browser internal pages do not allow content scripts.
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
    const handleTabActivated = () => void refreshPageContext();
    const handleTabUpdated = (_tabId: number, info: { status?: string }) => {
      if (info.status === 'complete') void refreshPageContext();
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

  const allTags = useMemo(
    () => [...new Set([...DEFAULT_TAGS, ...savedNotes.flatMap((item) => item.tags), ...tags])],
    [savedNotes, tags],
  );
  const selectedSummary = page.selectedText
    ? `${page.selectedText.length} characters selected`
    : '暂未捕获文本';
  const visibleNotes = savedNotes.filter(
    (item) => libraryYear === 'all' || (item.bookYear || 'unclassified') === libraryYear,
  );
  const groupedNotes = useMemo(
    () =>
      visibleNotes.reduce<Record<string, SavedNote[]>>((result, item) => {
        const year = item.bookYear || 'unclassified';
        (result[year] ??= []).push(item);
        return result;
      }, {}),
    [visibleNotes],
  );
  const groupYears = Object.keys(groupedNotes).sort((a, b) => {
    if (a === 'unclassified') return 1;
    if (b === 'unclassified') return -1;
    return Number(b) - Number(a);
  });

  const toggleValue = (
    value: string,
    current: string[],
    update: (values: string[]) => void,
  ) =>
    update(
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );

  const addCustomTag = () => {
    const value = customTag.trim();
    if (!value) return;
    if (!tags.includes(value)) setTags([...tags, value]);
    setCustomTag('');
    setStatus('标签已添加；保存笔记后会写入学习库。');
  };

  const resetForm = () => {
    setEditingId(null);
    setVocabularyText('');
    setNote('');
    setErrorReasons([]);
    setTags(['Listening']);
    setStatus('');
  };

  const saveNote = async () => {
    if (!page.selectedText.trim() && !note.trim() && !vocabularyText.trim()) {
      setStatus('请填写原句、词汇或笔记中的至少一项。');
      return;
    }
    const existing = editingId
      ? savedNotes.find((item) => item.id === editingId)
      : undefined;
    const savedNote: SavedNote = {
      id: existing?.id || crypto.randomUUID(),
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pageTitle: page.title,
      pageUrl: page.url,
      selectedText: page.selectedText.trim(),
      vocabulary: parseVocabulary(vocabularyText),
      note: note.trim(),
      errorReasons,
      tags,
      bookYear,
    };
    const nextNotes = existing
      ? savedNotes.map((item) => (item.id === existing.id ? savedNote : item))
      : [savedNote, ...savedNotes];
    await persistNotes(nextNotes);
    resetForm();
    setStatus(existing ? '修改已保存。' : '已保存到本机学习库。');
  };

  const editNote = (item: SavedNote) => {
    setEditingId(item.id);
    setBookYear(item.bookYear || '21');
    setVocabularyText((item.vocabulary || []).join('\n'));
    setNote(item.note);
    setErrorReasons(item.errorReasons);
    setTags(item.tags);
    setPage({
      title: item.pageTitle,
      url: item.pageUrl,
      selectedText: item.selectedText,
    });
    setStatus('正在编辑已有记录；保存后将覆盖原记录。');
    setView('capture');
  };

  const deleteNote = async (id: string) => {
    if (!window.confirm('确定删除这条学习记录吗？此操作无法撤销。')) return;
    await persistNotes(savedNotes.filter((item) => item.id !== id));
    if (editingId === id) resetForm();
    setStatus('记录已删除。');
  };

  const noteAsMarkdown = (item: SavedNote) => formatMarkdown([item]);

  const exportMarkdown = () => {
    if (!savedNotes.length) return;
    const blob = new Blob(['\ufeff', formatMarkdown(savedNotes)], {
      type: 'text/markdown;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `IELTS-Notes-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStatus(`已导出 ${savedNotes.length} 条记录为 Markdown。`);
  };

  const clearLibrary = async () => {
    if (!window.confirm(`确定删除全部 ${savedNotes.length} 条记录吗？请先导出 Markdown 备份。`)) return;
    await persistNotes([]);
    resetForm();
    setStatus('学习库已清空。');
  };

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand-mark" aria-hidden="true">IL</div>
        <div>
          <p className="eyebrow">STUDY COMPANION</p>
          <h1>IELTS Learning Assistant</h1>
        </div>
      </header>

      <nav className="view-tabs" aria-label="主导航">
        {(['capture', 'library', 'settings'] as PanelView[]).map((item) => (
          <button
            key={item}
            className={view === item ? 'active' : ''}
            onClick={() => setView(item)}
          >
            {item[0].toUpperCase() + item.slice(1)}
          </button>
        ))}
      </nav>

      {view === 'capture' && (
        <section className="view-content">
          {editingId && (
            <div className="editing-banner">
              <span>正在编辑已有记录</span>
              <button className="text-button" onClick={resetForm}>取消编辑</button>
            </div>
          )}
          <article className="page-card">
            <div className="section-heading">
              <span>Current page</span>
              <button className="text-button" onClick={refreshPageContext}>刷新</button>
            </div>
            <strong title={page.title}>{page.title}</strong>
            <p title={page.url}>{page.url || '当前页面不允许读取网址'}</p>
          </article>

          <section className="form-section compact-field">
            <label htmlFor="book-year">题库年份</label>
            <select id="book-year" value={bookYear} onChange={(e) => setBookYear(e.target.value)}>
              {BOOK_YEARS.map((year) => <option key={year} value={year}>剑雅 {year}</option>)}
            </select>
          </section>

          <section className="form-section">
            <div className="section-heading">
              <label htmlFor="selected-text">Selected sentence / 语境原句</label>
              <span>{selectedSummary}</span>
            </div>
            <textarea
              id="selected-text"
              value={page.selectedText}
              onChange={(e) => setPage((current) => ({ ...current, selectedText: e.target.value }))}
              placeholder="在网页中选中一句英文，或在这里手动输入。"
              rows={5}
            />
            <button className="inline-action" onClick={() => void copyText(page.selectedText)}>复制原句</button>
          </section>

          <section className="form-section">
            <label htmlFor="vocabulary">Vocabulary / 词汇</label>
            <textarea
              id="vocabulary"
              value={vocabularyText}
              onChange={(e) => setVocabularyText(e.target.value)}
              placeholder="每行填写一个词，也可用逗号分隔。"
              rows={3}
            />
          </section>

          <section className="form-section">
            <label htmlFor="note">Note</label>
            <textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="记录释义、错因、替换表达或复盘提醒。"
              rows={4}
            />
            <button className="inline-action" onClick={() => void copyText(note)}>复制笔记</button>
          </section>

          <section className="form-section">
            <span className="field-label">Error reasons</span>
            <div className="choice-grid">
              {ERROR_OPTIONS.map((option) => (
                <label className="choice" key={option}>
                  <input
                    type="checkbox"
                    checked={errorReasons.includes(option)}
                    onChange={() => toggleValue(option, errorReasons, setErrorReasons)}
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          </section>

          <section className="form-section">
            <span className="field-label">Tags / 标签</span>
            <div className="tag-row">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  className={tags.includes(tag) ? 'tag selected' : 'tag'}
                  onClick={() => toggleValue(tag, tags, setTags)}
                  title="点击添加或移除"
                >
                  {tag}
                </button>
              ))}
            </div>
            <div className="add-row">
              <input
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addCustomTag(); }}
                placeholder="添加自定义标签"
              />
              <button className="secondary-button" onClick={addCustomTag}>添加</button>
            </div>
            {tags.length > 0 && (
              <div className="selected-tags">
                {tags.map((tag) => (
                  <span key={tag}>
                    {tag}
                    <button aria-label={`删除标签 ${tag}`} onClick={() => setTags(tags.filter((x) => x !== tag))}>×</button>
                  </span>
                ))}
              </div>
            )}
          </section>

          <button className="primary-button" onClick={saveNote}>
            {editingId ? '保存修改' : '保存笔记'}
          </button>
          <p className="status" aria-live="polite">{status}</p>
        </section>
      )}

      {view === 'library' && (
        <section className="view-content">
          <div className="library-heading">
            <div>
              <p className="eyebrow">LOCAL LIBRARY</p>
              <h2>{savedNotes.length} saved notes</h2>
            </div>
            <button className="secondary-button" onClick={exportMarkdown} disabled={!savedNotes.length}>
              导出 Markdown
            </button>
          </div>
          <div className="library-tools">
            <select value={libraryYear} onChange={(e) => setLibraryYear(e.target.value)}>
              <option value="all">全部题库</option>
              {BOOK_YEARS.map((year) => <option key={year} value={year}>剑雅 {year}</option>)}
              <option value="unclassified">未分类旧笔记</option>
            </select>
            <button
              className="secondary-button"
              disabled={!savedNotes.length}
              onClick={() => void copyText(formatMarkdown(savedNotes)).then(() => setStatus('Markdown 已复制。'))}
            >
              复制文档
            </button>
          </div>
          {status && <p className="library-status">{status}</p>}

          {!visibleNotes.length ? (
            <div className="empty-state">
              <strong>当前分类没有记录</strong>
              <p>回到 Capture，保存第一条精听或阅读笔记。</p>
            </div>
          ) : (
            <div className="year-groups">
              {groupYears.map((year) => (
                <section className="year-group" key={year}>
                  <h3>{year === 'unclassified' ? '未分类旧笔记' : `剑雅 ${year}`}</h3>
                  <div className="note-list">
                    {groupedNotes[year].map((item) => (
                      <article className="note-card" key={item.id}>
                        <div className="note-meta">
                          <span>{item.tags.join(' · ') || 'Uncategorised'}</span>
                          <time dateTime={item.createdAt}>
                            {new Date(item.createdAt).toLocaleDateString('zh-CN')}
                          </time>
                        </div>
                        {!!item.vocabulary?.length && (
                          <div className="vocabulary-row">
                            {item.vocabulary.map((word) => <span key={word}>{word}</span>)}
                          </div>
                        )}
                        <blockquote>{item.selectedText || '无语境原句'}</blockquote>
                        {item.note && <p>{item.note}</p>}
                        <small title={item.pageTitle}>{item.pageTitle}</small>
                        <div className="card-actions">
                          <button onClick={() => void copyText(noteAsMarkdown(item)).then(() => setStatus('记录已复制。'))}>复制</button>
                          <button onClick={() => editNote(item)}>编辑</button>
                          <button className="danger-text" onClick={() => void deleteNote(item.id)}>删除</button>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
          {!!savedNotes.length && (
            <button className="danger-button" onClick={() => void clearLibrary()}>删除全部记录</button>
          )}
        </section>
      )}

      {view === 'settings' && (
        <section className="view-content">
          <div className="settings-card">
            <p className="eyebrow">VERSION 0.2</p>
            <h2>Local-first learning workspace</h2>
            <p>笔记只保存在本机浏览器中，不上传学习内容，也不连接 AI 服务。</p>
          </div>
          <div className="settings-card">
            <h3>Current scope</h3>
            <ul>
              <li>按剑雅年份保存和整理记录</li>
              <li>词汇与网页语境原句保持关联</li>
              <li>笔记、标签可再次编辑</li>
              <li>单条记录可复制、编辑和删除</li>
              <li>全部记录可导出为 Markdown 文档</li>
            </ul>
          </div>
        </section>
      )}
    </main>
  );
}

export default App;
