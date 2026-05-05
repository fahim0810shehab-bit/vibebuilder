import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/state/store/auth';
import { contentService, testConnection } from '@/services/contentService';
import { SiteData, VibePage } from '@/types/vibe';
import { v4 as uuidv4 } from 'uuid';
import { decodeJWT } from '@/lib/utils/decode-jwt-utils';
import { ThemeSwitcher, LanguageSelector, ProfileMenu } from '@/components/core';
import { TEMPLATES } from '@/data/templates';

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
  const navigate = useNavigate();
  const { user, accessToken } = useAuthStore();
  const [site, setSite] = useState<SiteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newPageName, setNewPageName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editPageName, setEditPageName] = useState('');
  const [seoEditingPageId, setSeoEditingPageId] = useState<string | null>(null);
  const [seoData, setSeoData] = useState({ title: '', description: '', ogImage: '' });
  const [copied, setCopied] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Extract userId — fall back to JWT sub claim if user object hasn't hydrated yet
  const jwtPayload = accessToken ? decodeJWT(accessToken) as any : null;
  const userId = user?.itemId ?? user?.email ?? jwtPayload?.sub ?? jwtPayload?.itemId ?? jwtPayload?.userId ?? '';
  const username = user?.userName ?? user?.email?.split('@')[0] ?? jwtPayload?.preferred_username ?? 'user';

  const loadSite = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      let data = await Promise.race([
        contentService.getByUserId(userId),
        new Promise<null>((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
      ]);
      
      if (!data) {
        // Create default site
        const newSite = contentService.createDefault(userId, username);
        data = await contentService.saveSiteData(newSite);
      }
      if (data) {
        setSite(data);
      }
    } catch (e) {
      console.error('Dashboard load failed:', e);
      // Fallback
      const local = localStorage.getItem('vibe_site_' + userId);
      if (local) {
        try {
          setSite(JSON.parse(local));
        } catch {
          setError('Failed to load site from backup.');
        }
      } else {
        setError('Network timeout. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  }, [userId, username]);

  useEffect(() => {
    testConnection();
    loadSite();
  }, [loadSite]);

  // Also store token in localStorage for services that need it
  useEffect(() => {
    if (accessToken) localStorage.setItem('access_token', accessToken);
  }, [accessToken]);

  // If userId is empty but we have an accessToken, reload to wait for user to hydrate
  useEffect(() => {
    if (!userId && accessToken) {
      // Zustand is still rehydrating — wait briefly then retry
      const timer = setTimeout(() => {
        // Force re-render by setting a dummy state
        setError(null);
        setLoading(true);
        loadSite();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [userId, accessToken, loadSite]);

  const saveSite = async (updated: SiteData) => {
    if (!updated.user_id) return;
    setSaving(true);
    try {
      const saved = await contentService.saveSiteData(updated);
      if (saved) {
        setSite(saved);
        setLastSaved(new Date());
      }
    } catch (e) {
      console.error('Dashboard save failed:', e);
      setError('Save Failed');
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async () => {
    try {
      setSaving(true);

      // Load complete latest data from localStorage
      const localKey = 'vibe_site_' + userId;
      const raw = localStorage.getItem(localKey);

      if (!raw) {
        alert('No site data found. Please open the editor and save first.');
        return;
      }

      const latestData = JSON.parse(raw);

      // Verify pages are intact
      if (!latestData.pages || latestData.pages.length === 0) {
        alert('Site has no pages, cannot publish empty site.');
        return;
      }

      // Only change is_published - keep everything else exactly as it is in local draft
      const updated = {
        ...latestData,
        is_published: !latestData.is_published
      };

      // Save to localStorage immediately
      localStorage.setItem(localKey, JSON.stringify(updated));
      localStorage.setItem('vibe_site_user_' + updated.username, JSON.stringify(updated));

      // Save to Selise with complete data
      await saveSite(updated);

    } catch (err: any) {
      console.error('[PUBLISH] Failed:', err);
      setError('Publish failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const addPage = async () => {
    if (!site || !newPageName.trim()) return;
    const slug = newPageName.trim().toLowerCase().replace(/\s+/g, '-');
    const newPage = makeDefaultPage(newPageName.trim(), slug);
    const updated = { ...site, pages: [...site.pages, newPage] };
    setNewPageName('');
    await saveSite(updated);
  };

  const createFromTemplate = async (templateData: any) => {
    if (!userId) return;
    setLoading(true);
    try {
      const newSite: Omit<SiteData, 'id'> = {
        user_id: userId,
        username,
        is_published: false,
        pages: templateData.pages.map((p: any) => ({ ...p, id: uuidv4() })),
      };
      const saved = await contentService.saveSiteData(newSite);
      if (saved) {
        setSite(saved);
        if (saved.pages.length > 0) {
          navigate(`/editor?pageId=${saved.pages[0].id}`);
        }
      }
    } catch (e) {
      console.error('Template creation failed:', e);
      setError('Failed to create site from template');
    } finally {
      setLoading(false);
    }
  };

  const deletePage = async (pageId: string) => {
    if (!site) return;
    if (site.pages.length <= 1) {
      setError('Cannot delete the only page');
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

  const openSeoSettings = (page: VibePage) => {
    setSeoEditingPageId(page.id);
    setSeoData({
      title: page.seo?.title || '',
      description: page.seo?.description || '',
      ogImage: page.seo?.ogImage || ''
    });
  };

  const saveSeoSettings = async () => {
    if (!site || !seoEditingPageId) return;
    const updated = site.pages.map(p => 
      p.id === seoEditingPageId ? { ...p, seo: seoData } : p
    );
    await saveSite({ ...site, pages: updated });
    setSeoEditingPageId(null);
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
      <div className="w-full min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Loading site...</p>
        </div>
      </div>
    );
  }

  if (error && !site) {
    return (
      <div className="w-full min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">Something went wrong</h2>
        <p className="text-destructive mb-6">{error}</p>
        <button onClick={loadSite} className="px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-background text-foreground" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* ── Premium Topbar ── */}
      <header className="h-14 border-b border-border bg-card/90 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-6">
        {/* Left: Brand */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/40">
            <span className="text-primary-foreground font-bold text-xs">VB</span>
          </div>
          <span className="text-foreground font-bold text-base tracking-tight">VibeBuilder</span>
          <span className="hidden sm:block text-muted-foreground text-xs ml-1">/ Dashboard</span>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-1">
          <ThemeSwitcher />
          <LanguageSelector />
          <div className="w-px h-5 bg-border mx-1" />
          <ProfileMenu />
        </div>
      </header>

      {/* Gradient background glow */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <main className="relative z-10 max-w-6xl mx-auto px-6 py-12 space-y-12">
        {/* Welcome hero strip */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary/20 via-primary/5 to-transparent border border-primary/20 rounded-3xl p-8 lg:p-12 shadow-2xl shadow-primary/5">
          <div className="relative z-10">
            <span className="inline-block px-3 py-1 rounded-full bg-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest mb-4">Workspace</span>
            <h1 className="text-4xl lg:text-5xl font-black text-foreground tracking-tight leading-tight">
              Design your dream <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60">digital presence.</span>
            </h1>
            <p className="text-muted-foreground text-sm lg:text-base mt-4 max-w-xl">Welcome back, {user?.firstName ?? username}! Everything you need to build, manage, and scale your website is right here.</p>
          </div>
          <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-lg px-4 py-3 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-destructive hover:text-foreground ml-4">✕</button>
          </div>
        )}

        {/* Start from Template */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground">Start from Template</h2>
            <span className="text-xs text-muted-foreground bg-primary/10 px-2 py-1 rounded-full font-semibold">QUICK START</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {TEMPLATES.map((tmpl) => (
              <div 
                key={tmpl.id} 
                onClick={() => createFromTemplate(tmpl.data)}
                className="group relative bg-card border border-border hover:border-primary/50 rounded-xl overflow-hidden cursor-pointer transition-all hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1"
              >
                <div className="aspect-video w-full overflow-hidden relative">
                  <img src={tmpl.thumbnail} alt={tmpl.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                    <div className="w-full">
                      <p className="text-white text-[10px] font-bold uppercase tracking-wider mb-1 opacity-70">Template</p>
                      <span className="text-white text-sm font-bold block">Start with {tmpl.name} →</span>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-card/50 backdrop-blur-sm">
                  <h3 className="font-bold text-sm text-foreground">{tmpl.name}</h3>
                  <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{tmpl.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Site Info Card */}
        <div className="bg-card/40 backdrop-blur-md border border-border rounded-3xl p-8 space-y-6 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors" />
          <div className="flex items-center justify-between flex-wrap gap-6 relative z-10">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Site Information</p>
              <h2 className="text-2xl font-bold text-foreground">@{site?.username}</h2>
              <div className="flex items-center gap-2 mt-1">
                <a
                  href={`/site/${site?.username}/home`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80 text-sm transition-colors inline-block"
                >
                  {window.location.origin}/site/{site?.username}/home ↗
                </a>
                <button onClick={() => copyUrl(`${window.location.origin}/site/${site?.username}/home`)}
                  className="text-muted-foreground hover:text-foreground text-xs px-2 py-1 bg-muted rounded">
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  site?.is_published
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400 border border-green-200 dark:border-green-700'
                    : 'bg-muted text-muted-foreground border border-border'
                }`}
              >
                {site?.is_published ? '● Live' : '○ Draft'}
              </span>
              <button
                onClick={togglePublish}
                disabled={saving}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 ${
                  site?.is_published
                    ? 'bg-secondary hover:bg-secondary/80 text-secondary-foreground'
                    : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20'
                }`}
              >
                {saving ? 'Saving...' : site?.is_published ? 'Unpublish' : 'Publish'}
              </button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground uppercase">Total Pages</p>
            <p className="text-xl font-bold text-foreground mt-1">{site?.pages.length ?? 0}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground uppercase">Status</p>
            <p className="text-xl font-bold text-foreground mt-1">{site?.is_published ? 'Published' : 'Draft'}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground uppercase">Last Modified</p>
            <p className="text-xl font-bold text-foreground mt-1 text-sm">{lastSaved ? lastSaved.toLocaleTimeString() : 'Unknown'}</p>
          </div>
        </div>

        {/* Pages */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Your Pages</h3>
            <span className="text-sm text-muted-foreground">{site?.pages.length ?? 0} pages</span>
          </div>

          <div className="space-y-3">
            {site?.pages.map((page, index) => (
              <div
                key={page.id}
                className="group bg-card border border-border hover:border-primary/50 rounded-xl px-5 py-4 flex items-center justify-between transition-all"
              >
                <div className="flex-1 flex items-center gap-3">
                  <div className="flex flex-col">
                    <button onClick={() => movePage(index, -1)} disabled={index === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30">↑</button>
                    <button onClick={() => movePage(index, 1)} disabled={index === site.pages.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30">↓</button>
                  </div>
                  <div>
                    {editingPageId === page.id ? (
                      <input
                        autoFocus
                        value={editPageName}
                        onChange={(e) => setEditPageName(e.target.value)}
                        onBlur={() => savePageName(page.id)}
                        onKeyDown={(e) => e.key === 'Enter' && savePageName(page.id)}
                        className="bg-muted text-foreground px-2 py-1 rounded outline-none border border-primary"
                      />
                    ) : (
                      <p className="font-medium text-foreground cursor-pointer hover:text-primary" onClick={() => { setEditingPageId(page.id); setEditPageName(page.name); }}>
                        {page.name}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-muted-foreground">/{page.path}</p>
                      {page.path === 'home' && <span className="text-[10px] bg-primary/20 text-primary px-1.5 rounded">Homepage</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {page.path !== 'home' && (
                    <button onClick={() => setAsHomepage(page.id)} className="px-3 py-1.5 bg-muted hover:bg-accent text-muted-foreground rounded-lg text-sm transition-all hidden group-hover:block">
                      Set as Home
                    </button>
                  )}
                  <button onClick={() => openSeoSettings(page)} className="px-3 py-1.5 bg-muted hover:bg-accent text-muted-foreground rounded-lg text-sm transition-all hidden group-hover:block">
                    SEO
                  </button>
                  <button onClick={() => duplicatePage(page)} className="px-3 py-1.5 bg-muted hover:bg-accent text-muted-foreground rounded-lg text-sm transition-all hidden group-hover:block">
                    Duplicate
                  </button>
                  <button
                    onClick={() => navigate(`/editor?pageId=${page.id}`)}
                    className="px-4 py-1.5 bg-primary/20 hover:bg-primary/30 border border-primary/50 text-primary hover:text-primary/80 rounded-lg text-sm transition-all"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deletePage(page.id)}
                    disabled={site.pages.length <= 1}
                    className="px-3 py-1.5 bg-destructive/10 hover:bg-destructive/20 border border-destructive/20 text-destructive rounded-lg text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* SEO Settings Modal-ish overlay */}
          {seoEditingPageId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-background/80 backdrop-blur-sm">
              <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/30">
                  <h3 className="font-bold text-foreground">SEO Settings</h3>
                  <button onClick={() => setSeoEditingPageId(null)} className="text-muted-foreground hover:text-foreground text-lg">✕</button>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Page Title (Tab Title)</label>
                    <input 
                      type="text" 
                      value={seoData.title} 
                      onChange={(e) => setSeoData({...seoData, title: e.target.value})}
                      placeholder="E.g. Portfolio | My Site"
                      className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Meta Description</label>
                    <textarea 
                      value={seoData.description} 
                      onChange={(e) => setSeoData({...seoData, description: e.target.value})}
                      placeholder="Short summary for search engines..."
                      className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm outline-none focus:border-primary h-24 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">OG Image URL (Social Share)</label>
                    <input 
                      type="text" 
                      value={seoData.ogImage} 
                      onChange={(e) => setSeoData({...seoData, ogImage: e.target.value})}
                      placeholder="https://..."
                      className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm outline-none focus:border-primary"
                    />
                  </div>
                </div>
                <div className="px-6 py-4 bg-muted/30 border-t border-border flex justify-end gap-3">
                  <button onClick={() => setSeoEditingPageId(null)} className="px-4 py-2 text-sm font-medium hover:text-foreground transition-colors">Cancel</button>
                  <button onClick={saveSeoSettings} className="px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-bold shadow-lg shadow-primary/20">Save Settings</button>
                </div>
              </div>
            </div>
          )}

          {/* Add Page */}
          <div className="flex gap-3 mt-4">
            <input
              type="text"
              value={newPageName}
              onChange={(e) => setNewPageName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addPage()}
              placeholder="Enter page name..."
              className="flex-1 bg-card border border-border focus:border-primary rounded-lg px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground outline-none transition-colors"
            />
            <button
              onClick={addPage}
              disabled={!newPageName.trim() || saving}
              className="px-5 py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-40 text-primary-foreground rounded-lg text-sm font-medium transition-all"
            >
              Add Page
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
