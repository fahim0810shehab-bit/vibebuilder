import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/state/store/auth';
import { contentService } from '@/services/contentService';
import { SiteData, VibePage } from '@/types/vibe';
import { v4 as uuidv4 } from 'uuid';

function makeDefaultPage(name: string, path: string): VibePage {
  return {
    id: uuidv4(),
    name,
    path,
    rootNode: {
      id: uuidv4(),
      type: 'section',
      props: { padding: '40px 20px', backgroundColor: '#ffffff' },
      children: [
        {
          id: uuidv4(),
          type: 'text',
          content: `Welcome to ${name}!`,
          props: { fontSize: '2rem', fontWeight: '700', color: '#111827', textAlign: 'center' },
          children: [],
        },
      ],
    },
  };
}

export default function VibeBuilderDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, accessToken } = useAuthStore();
  const [site, setSite] = useState<SiteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newPageName, setNewPageName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editPageName, setEditPageName] = useState('');
  const [copied, setCopied] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const userId = user?.itemId ?? user?.email ?? '';
  const username = user?.userName ?? user?.email?.split('@')[0] ?? 'user';

  const loadSite = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      let data = await contentService.getByUserId(userId);
      if (!data) {
        // Create default site
        data = await contentService.create({
          user_id: userId,
          username,
          is_published: false,
          pages: [makeDefaultPage('Home', 'home')],
        });
      }
      setSite(data);
    } catch (e) {
      setError(t('DASHBOARD_ERR_LOAD_FAILED'));
    } finally {
      setLoading(false);
    }
  }, [userId, username]);

  useEffect(() => {
    loadSite();
  }, [loadSite]);

  // Also store token in localStorage for services that need it
  useEffect(() => {
    if (accessToken) localStorage.setItem('access_token', accessToken);
  }, [accessToken]);

  const saveSite = async (updated: SiteData) => {
    if (!updated.id) return;
    setSaving(true);
    try {
      await contentService.update(updated.id, {
        is_published: updated.is_published,
        pages: updated.pages,
      });
      setSite(updated);
      setLastSaved(new Date());
    } catch {
      setError(t('DASHBOARD_ERR_SAVE_FAILED'));
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async () => {
    if (!site) return;
    const updated = { ...site, is_published: !site.is_published };
    await saveSite(updated);
  };

  const addPage = async () => {
    if (!site || !newPageName.trim()) return;
    const slug = newPageName.trim().toLowerCase().replace(/\s+/g, '-');
    const newPage = makeDefaultPage(newPageName.trim(), slug);
    const updated = { ...site, pages: [...site.pages, newPage] };
    setNewPageName('');
    await saveSite(updated);
  };

  const deletePage = async (pageId: string) => {
    if (!site) return;
    if (site.pages.length <= 1) {
      setError(t('DASHBOARD_ERR_DELETE_LAST_PAGE'));
      return;
    }
    const updated = { ...site, pages: site.pages.filter((p) => p.id !== pageId) };
    await saveSite(updated);
  };

  const duplicatePage = async (page: VibePage) => {
    if (!site) return;
    const newPage = { ...page, id: uuidv4(), name: `${page.name} (Copy)`, path: `${page.path}-copy` };
    const updated = { ...site, pages: [...site.pages, newPage] };
    await saveSite(updated);
  };

  const movePage = async (index: number, direction: -1 | 1) => {
    if (!site) return;
    if (index + direction < 0 || index + direction >= site.pages.length) return;
    const newPages = [...site.pages];
    [newPages[index], newPages[index + direction]] = [newPages[index + direction], newPages[index]];
    const updated = { ...site, pages: newPages };
    await saveSite(updated);
  };

  const setAsHomepage = async (pageId: string) => {
    if (!site) return;
    const newPages = site.pages.map(p => {
      if (p.id === pageId) return { ...p, path: 'home' };
      if (p.path === 'home') return { ...p, path: `${p.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}` };
      return p;
    });
    await saveSite({ ...site, pages: newPages });
  };

  const savePageName = async (pageId: string) => {
    if (!site || !editPageName.trim()) {
      setEditingPageId(null);
      return;
    }
    const newPages = site.pages.map(p => p.id === pageId ? { ...p, name: editPageName.trim() } : p);
    await saveSite({ ...site, pages: newPages });
    setEditingPageId(null);
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">{t('DASHBOARD_LOADING_SITE')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-xs">VB</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight">VibeBuilder</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">
              {user?.firstName ?? username}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-lg px-4 py-3 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-white ml-4">✕</button>
          </div>
        )}

        {/* Site Info Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">{t('DASHBOARD_SITE_INFO_LABEL')}</p>
              <h2 className="text-2xl font-bold text-white">@{site?.username}</h2>
              <div className="flex items-center gap-2 mt-1">
                <a
                  href={`/site/${site?.username}/home`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-violet-400 hover:text-violet-300 text-sm transition-colors inline-block"
                >
                  {window.location.origin}/site/{site?.username}/home ↗
                </a>
                <button onClick={() => copyUrl(`${window.location.origin}/site/${site?.username}/home`)}
                  className="text-gray-400 hover:text-white text-xs px-2 py-1 bg-gray-800 rounded">
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  site?.is_published
                    ? 'bg-green-900/50 text-green-400 border border-green-700'
                    : 'bg-gray-800 text-gray-400 border border-gray-700'
                }`}
              >
                {site?.is_published ? `● ${t('DASHBOARD_STATUS_LIVE')}` : `○ ${t('DASHBOARD_STATUS_DRAFT')}`}
              </span>
              <button
                onClick={togglePublish}
                disabled={saving}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 ${
                  site?.is_published
                    ? 'bg-gray-700 hover:bg-gray-600 text-white'
                    : 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white shadow-lg shadow-violet-900/30'
                }`}
              >
                {saving ? t('DASHBOARD_SAVING') : site?.is_published ? t('DASHBOARD_UNPUBLISH') : t('DASHBOARD_PUBLISH')}
              </button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase">Total Pages</p>
            <p className="text-xl font-bold text-white mt-1">{site?.pages.length ?? 0}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase">Status</p>
            <p className="text-xl font-bold text-white mt-1">{site?.is_published ? 'Published' : 'Draft'}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase">Last Modified</p>
            <p className="text-xl font-bold text-white mt-1 text-sm">{lastSaved ? lastSaved.toLocaleTimeString() : 'Unknown'}</p>
          </div>
        </div>

        {/* Pages */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">{t('DASHBOARD_PAGES_HEADING')}</h3>
            <span className="text-sm text-gray-500">{t('DASHBOARD_PAGE_COUNT', { count: site?.pages.length ?? 0 })}</span>
          </div>

          <div className="space-y-3">
            {site?.pages.map((page, index) => (
              <div
                key={page.id}
                className="group bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl px-5 py-4 flex items-center justify-between transition-all"
              >
                <div className="flex-1 flex items-center gap-3">
                  <div className="flex flex-col">
                    <button onClick={() => movePage(index, -1)} disabled={index === 0} className="text-gray-500 hover:text-white disabled:opacity-30">↑</button>
                    <button onClick={() => movePage(index, 1)} disabled={index === site.pages.length - 1} className="text-gray-500 hover:text-white disabled:opacity-30">↓</button>
                  </div>
                  <div>
                    {editingPageId === page.id ? (
                      <input
                        autoFocus
                        value={editPageName}
                        onChange={(e) => setEditPageName(e.target.value)}
                        onBlur={() => savePageName(page.id)}
                        onKeyDown={(e) => e.key === 'Enter' && savePageName(page.id)}
                        className="bg-gray-800 text-white px-2 py-1 rounded outline-none border border-violet-500"
                      />
                    ) : (
                      <p className="font-medium text-white cursor-pointer hover:text-violet-400" onClick={() => { setEditingPageId(page.id); setEditPageName(page.name); }}>
                        {page.name}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-gray-500">/{page.path}</p>
                      {page.path === 'home' && <span className="text-[10px] bg-violet-900/50 text-violet-300 px-1.5 rounded">Homepage</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {page.path !== 'home' && (
                    <button onClick={() => setAsHomepage(page.id)} className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition-all hidden group-hover:block">
                      Set as Home
                    </button>
                  )}
                  <button onClick={() => duplicatePage(page)} className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition-all hidden group-hover:block">
                    Duplicate
                  </button>
                  <button
                    onClick={() => navigate(`/editor?pageId=${page.id}`)}
                    className="px-4 py-1.5 bg-violet-600/20 hover:bg-violet-600/40 border border-violet-700/50 text-violet-300 hover:text-white rounded-lg text-sm transition-all"
                  >
                    {t('DASHBOARD_EDIT')}
                  </button>
                  <button
                    onClick={() => deletePage(page.id)}
                    disabled={site.pages.length <= 1}
                    className="px-3 py-1.5 bg-red-900/20 hover:bg-red-900/40 border border-red-800/50 text-red-400 hover:text-red-300 rounded-lg text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {t('DASHBOARD_DELETE')}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add Page */}
          <div className="flex gap-3 mt-4">
            <input
              type="text"
              value={newPageName}
              onChange={(e) => setNewPageName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addPage()}
              placeholder={t('DASHBOARD_INPUT_NEW_PAGE_PLACEHOLDER')}
              className="flex-1 bg-gray-900 border border-gray-700 focus:border-violet-500 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none transition-colors"
            />
            <button
              onClick={addPage}
              disabled={!newPageName.trim() || saving}
              className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition-all"
            >
              {t('DASHBOARD_ADD_PAGE')}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
