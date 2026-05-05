import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuthStore } from '@/state/store/auth';
import { contentService } from '@/services/contentService';
import { SiteData, VibeNode } from '@/types/vibe';

function RenderNode({ node }: { node: VibeNode }) {
  const { type, props, content, src, href, children, animation } = node;
  const style = props as React.CSSProperties;
  const elementRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!animation || animation.type === 'none') {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1 }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [animation]);

  const animationStyle: React.CSSProperties = animation && animation.type !== 'none' ? {
    opacity: isVisible ? 1 : 0,
    transform: isVisible 
      ? 'translate(0,0) scale(1)' 
      : animation.type === 'slideUp' ? 'translateY(30px)' 
      : animation.type === 'slideLeft' ? 'translateX(30px)'
      : animation.type === 'zoomIn' ? 'scale(0.9)'
      : 'none',
    transition: `all ${animation.duration} ease-out ${animation.delay}`,
  } : {};

  const renderContent = () => {
    switch (type) {
      case 'image': {
        // Try both src and props.src - same as vibe.ts structure
        const imgSrc = src || props?.src || '';
        
        console.log('[PUBLIC-RENDER] Image node:', node.id);
        console.log('[PUBLIC-RENDER] src:', src);
        console.log('[PUBLIC-RENDER] props.src:', props?.src);
        console.log('[PUBLIC-RENDER] Using:', imgSrc);
        
        if (!imgSrc || imgSrc.startsWith('blob:')) {
          return null; // Don't render broken images
        }
        
        return (
          <img
            key={node.id}
            src={imgSrc}
            alt={node.alt || props?.alt || ''}
            style={{
              width: props?.width || '100%',
              height: props?.height || 'auto',
              objectFit: props?.objectFit || 'cover',
              display: 'block',
              maxWidth: '100%',
              ...style,
              src: undefined // Remove src from style if it exists
            }}
            onError={() => {
              console.error('[PUBLIC-RENDER] Load failed:', imgSrc);
            }}
          />
        );
      }

      case 'text':
      case 'heading':
      case 'paragraph':
        return (
          <div
            style={style}
            dangerouslySetInnerHTML={{ __html: content || '' }}
          />
        );

      case 'button':
        return (
          <a
            href={href || props?.href || '#'}
            style={{
              display: 'inline-block',
              cursor: 'pointer',
              textDecoration: 'none',
              ...style
            }}
            target={props?.target || '_self'}
          >
            {content || 'Button'}
          </a>
        );

      case 'video': {
        const videoUrl = src || props?.src || content || '';
        if (!videoUrl) return null;
        const embedUrl = videoUrl.includes('youtube.com/watch')
          ? videoUrl.replace('watch?v=', 'embed/')
          : videoUrl.includes('youtu.be')
          ? videoUrl.replace('youtu.be/', 'youtube.com/embed/')
          : videoUrl;
        return (
          <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, ...style }}>
            <iframe
              src={embedUrl}
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
              frameBorder="0"
              allowFullScreen
            />
          </div>
        );
      }

      case 'divider':
        return <hr style={{ border: 'none', borderTop: '1px solid #e0e0e0', ...style }} />;

      case 'spacer':
        return <div style={{ height: props?.height || '48px', ...style }} />;

      case 'icon':
        return <div style={style} className="flex items-center justify-center font-bold">[{content}]</div>;

      case 'section':
      case 'container':
      case 'hero':
      case 'gallery':
      case 'testimonial':
      case 'social-links':
      case 'card':
      case 'two-columns':
      case 'three-columns':
      case 'navbar':
      case 'footer':
      case 'form':
      case 'feature':
      case 'pricing':
      case 'team':
      case 'stats':
      case 'faq':
      case 'grid':
      default:
        return (
          <div style={style}>
            {(children || []).map((child: any) => (
              <RenderNode key={child.id} node={child} />
            ))}
          </div>
        );
    }
  };

  return (
    <div 
      ref={elementRef} 
      style={{ ...animationStyle, display: style.display || 'block', position: style.position as any, top: style.top, left: style.left, right: style.right, bottom: style.bottom, zIndex: style.zIndex }}
    >
      {renderContent()}
    </div>
  );
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
  const isOwner = site && (site.user_id === userId);

  // Helper to sanitize path for comparison (strip leading/trailing slashes)
  const cleanPath = (p: string) => p.replace(/^\/+|\/+$/g, '');

  useEffect(() => {
    if (!username) return;
    (async () => {
      setLoading(true);
      // Try to fetch with authentication if available (to see drafts)
      const data = await contentService.getSiteByUsername(username, false);
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

  if (!site || (!site.is_published && !isOwner)) {
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
    ? site.pages.find((p) => cleanPath(p.path) === cleanPath(activePageSlug))
    : site.pages.find((p) => cleanPath(p.path) === 'home') || site.pages[0];

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
    <div 
      style={{
        all: 'unset',
        display: 'flex',
        flexDirection: 'column',
        width: '100vw',
        minHeight: '100vh',
        margin: 0,
        padding: 0,
        fontFamily: site?.theme?.font || 'inherit',
        backgroundColor: site?.theme?.bg || '#ffffff',
        ['--vibe-primary' as any]: site?.theme?.primary || '#7c3aed',
        ['--vibe-secondary' as any]: site?.theme?.secondary || '#06b6d4',
        ['--vibe-accent' as any]: site?.theme?.accent || '#f59e0b',
        ['--vibe-bg' as any]: site?.theme?.bg || '#ffffff',
        ['--vibe-text' as any]: site?.theme?.text || '#09090b'
      }}
    >
      <title>{activePage.seo?.title || `${site.username} - ${activePage.name}`}</title>
      <meta name="description" content={activePage.seo?.description || `Welcome to ${site.username}'s website. Visit the ${activePage.name} page.`} />
      {activePage.seo?.ogImage && <meta property="og:image" content={activePage.seo.ogImage} />}

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
