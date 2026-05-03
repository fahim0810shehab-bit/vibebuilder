import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { contentService } from '@/services/contentService';
import { SiteData, VibeNode } from '@/types/vibe';

function RenderNode({ node }: { node: VibeNode }) {
  const { type, props, content, src, href, children } = node;
  const style = props as React.CSSProperties;

  switch (type) {
    case 'section':
    case 'hero':
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
      return <img src={src} style={style} alt="" />;
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
  const [site, setSite] = useState<SiteData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username) return;
    (async () => {
      setLoading(true);
      const data = await contentService.getByUsername(username);
      setSite(data);
      setLoading(false);
    })();
  }, [username]);

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
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Site not found</h1>
          <p className="text-gray-500 mt-2">This site might be private or does not exist.</p>
        </div>
      </div>
    );
  }

  const activePage = pageSlug
    ? site.pages.find((p) => p.path === pageSlug)
    : site.pages[0];

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
      {site.pages.length > 1 && (
        <nav className="border-b bg-white/80 backdrop-blur sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-6 h-14 flex items-center gap-6">
            {site.pages.map((p) => (
              <a
                key={p.id}
                href={`/site/${username}/${p.path}`}
                className={`text-sm font-medium transition-colors ${
                  activePage.id === p.id ? 'text-violet-600' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {p.name}
              </a>
            ))}
          </div>
        </nav>
      )}

      <main className="flex-1">
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
