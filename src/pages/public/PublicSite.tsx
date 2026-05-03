import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuthStore } from '@/state/store/auth';
import { contentService } from '@/services/contentService';
import { SiteData, VibeNode } from '@/types/vibe';

function RenderNode({ node }: { node: VibeNode }) {
  const { type, props, content, src, href, children } = node;
  const style = props as React.CSSProperties;

  switch (type) {
    case 'section':
    case 'hero':
    case 'gallery':
    case 'testimonial':
    case 'social-links':
    case 'card':
    case 'two-columns':
    case 'navbar':
    case 'footer':
      return (
        <div style={style}>
          {children?.map((child) => (
            <RenderNode key={child.id} node={child} />
          ))}
        </div>
      );
    case 'text':
      return <p style={style}>{content}</p>;
    case 'image':
      return <img src={src} style={style} alt={node.alt ?? ''} />;
    case 'video':
      return (
        <iframe
          src={src}
          style={style}
          title="Video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="block border-0"
        />
      );
    case 'button':
      return (
        <a href={href} style={style}>
          {content}
        </a>
      );
    case 'divider':
      return <hr style={style} />;
    case 'spacer':
      return <div style={{ height: props.height || '48px' }} />;
    case 'form':
      return (
        <form style={style}>
          {children?.map((child) => (
            <RenderNode key={child.id} node={child} />
          ))}
        </form>
      );
    default:
      return null;
  }
}

export default function PublicSite() {
  const { username, pageSlug } = useParams();
  const { user } = useAuthStore();
  const [site, setSite] = useState<SiteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [activePageSlug, setActivePageSlug] = useState(pageSlug);

  const userId = user?.itemId ?? user?.email ?? '';
  const isOwner = site?.user_id === userId;

  useEffect(() => {
    if (!username) return;
    (async () => {
      setLoading(true);
      const data = await contentService.getByUsername(username);
      setSite(data);
      setLoading(false);
    })();
  }, [username]);

  // Page transition effect
  useEffect(() => {
    if (pageSlug !== activePageSlug) {
      setIsTransitioning(true);
      const timer = setTimeout(() => {
        setActivePageSlug(pageSlug);
        setIsTransitioning(false);
        setMobileMenuOpen(false);
        window.scrollTo(0, 0);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [pageSlug, activePageSlug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!site || !site.is_published) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-2xl shadow-xl max-w-md w-full border border-gray-100">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-2xl">🚧</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Site Not Found</h1>
          <p className="text-gray-500 mb-8">This site might be private, unpublished, or the URL is incorrect.</p>
          <a href="/vibebuilder" className="inline-flex items-center justify-center w-full px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-xl transition-colors">
            Create your own site
          </a>
        </div>
      </div>
    );
  }

  const activePage = activePageSlug
    ? site.pages.find((p) => p.path === activePageSlug)
    : site.pages.find((p) => p.path === 'home') || site.pages[0];

  if (!activePage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Page not found</h1>
          <p className="text-gray-500 mt-2">The requested page does not exist on this site.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <title>{site.username} - {activePage.name}</title>
      <meta name="description" content={`Welcome to ${site.username}'s website. Visit the ${activePage.name} page.`} />

      {isOwner && (
        <a href={`/editor?pageId=${activePage.id}`} className="fixed bottom-6 right-6 z-50 bg-violet-600 hover:bg-violet-700 text-white shadow-xl shadow-violet-900/20 px-4 py-3 rounded-full font-medium flex items-center gap-2 transition-transform hover:scale-105">
          <span>✎</span> Edit this site
        </a>
      )}

      {site.pages.length > 1 && (
        <nav className="border-b bg-white/90 backdrop-blur sticky top-0 z-40 shadow-sm">
          <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="font-bold text-lg tracking-tight text-gray-900 hidden sm:block">
              {site.username}
            </div>
            
            {/* Desktop Nav */}
            <div className="hidden sm:flex items-center gap-6">
              {site.pages.map((p) => (
                <Link
                  key={p.id}
                  to={`/site/${username}/${p.path}`}
                  className={`text-sm font-medium transition-colors ${
                    activePage.id === p.id ? 'text-violet-600' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {p.name}
                </Link>
              ))}
            </div>

            {/* Mobile Menu Button */}
            <div className="sm:hidden flex-1 flex justify-end">
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 -mr-2 text-gray-600">
                {mobileMenuOpen ? '✕' : '☰'}
              </button>
            </div>
          </div>
          
          {/* Mobile Nav */}
          {mobileMenuOpen && (
            <div className="sm:hidden border-t bg-white absolute w-full left-0 py-4 px-6 shadow-xl flex flex-col gap-4">
              {site.pages.map((p) => (
                <Link
                  key={p.id}
                  to={`/site/${username}/${p.path}`}
                  className={`text-base font-medium transition-colors ${
                    activePage.id === p.id ? 'text-violet-600' : 'text-gray-600'
                  }`}
                >
                  {p.name}
                </Link>
              ))}
            </div>
          )}
        </nav>
      )}

      <main className={`flex-1 transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
        <RenderNode node={activePage.rootNode} />
      </main>

      <footer className="py-8 border-t bg-gray-50">
        <div className="max-w-5xl mx-auto px-6 flex justify-center">
          <div className="inline-flex items-center gap-2 bg-white border rounded-full px-4 py-1.5 shadow-sm text-xs font-medium text-gray-600">
            <span>Built with</span>
            <span className="text-violet-600 font-bold">VibeBuilder</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
