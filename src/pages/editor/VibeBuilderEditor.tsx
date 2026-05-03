import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/state/store/auth';
import { contentService } from '@/services/contentService';
import { mediaService } from '@/services/mediaService';
import { SiteData, VibeNode, VibePage } from '@/types/vibe';
import { v4 as uuidv4 } from 'uuid';

// ─── Node factory ────────────────────────────────────────────────────────────
function createNode(type: VibeNode['type']): VibeNode {
  const base = { id: uuidv4(), type, props: {}, children: [] };
  switch (type) {
    case 'hero':
      return { ...base, props: { backgroundColor: '#6d28d9', padding: '80px 40px', textAlign: 'center' }, children: [
        { id: uuidv4(), type: 'text', content: 'Your Headline Here', props: { fontSize: '3rem', fontWeight: '800', color: '#ffffff' }, children: [] },
        { id: uuidv4(), type: 'text', content: 'A subtitle that describes your value proposition.', props: { fontSize: '1.125rem', color: '#ddd6fe', marginTop: '16px' }, children: [] },
      ]};
    case 'section':
      return { ...base, props: { padding: '40px 20px', backgroundColor: '#f9fafb' } };
    case 'text':
      return { ...base, content: 'Edit this text', props: { fontSize: '1rem', color: '#111827', padding: '8px 0' } };
    case 'image':
      return { ...base, src: 'https://placehold.co/800x400/6d28d9/ffffff?text=Image', props: { width: '100%', borderRadius: '8px' } };
    case 'button':
      return { ...base, content: 'Click Me', href: '#', props: { backgroundColor: '#6d28d9', color: '#ffffff', padding: '12px 24px', borderRadius: '8px', fontSize: '1rem', fontWeight: '600', display: 'inline-block', textDecoration: 'none' } };
    case 'divider':
      return { ...base, props: { borderColor: '#e5e7eb', margin: '16px 0' } };
    case 'spacer':
      return { ...base, props: { height: '48px' } };
    case 'form':
      return { ...base, props: { padding: '24px', backgroundColor: '#f3f4f6', borderRadius: '8px' } };
    default:
      return base;
  }
}

// ─── Canvas Node Renderer ─────────────────────────────────────────────────────
function CanvasNode({
  node,
  selectedId,
  onSelect,
  onDelete,
  onMoveUp,
  onMoveDown,
  onUpdate,
  canUp,
  canDown,
}: {
  node: VibeNode;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onUpdate: (id: string, field: string, value: string) => void;
  canUp: boolean;
  canDown: boolean;
}) {
  const isSelected = selectedId === node.id;

  const controlBar = (
    <div className="absolute top-1 right-1 flex gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
      {canUp && (
        <button onClick={(e) => { e.stopPropagation(); onMoveUp(node.id); }}
          className="bg-gray-800 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded">↑</button>
      )}
      {canDown && (
        <button onClick={(e) => { e.stopPropagation(); onMoveDown(node.id); }}
          className="bg-gray-800 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded">↓</button>
      )}
      <button onClick={(e) => { e.stopPropagation(); onDelete(node.id); }}
        className="bg-red-800 hover:bg-red-700 text-white text-xs px-2 py-1 rounded">✕</button>
    </div>
  );

  const wrapperClass = `group relative cursor-pointer transition-all rounded ${
    isSelected ? 'ring-2 ring-violet-500 ring-offset-2 ring-offset-gray-900' : 'hover:ring-1 hover:ring-gray-600'
  }`;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(node.id);
  };

  if (node.type === 'text') {
    return (
      <div className={wrapperClass} onClick={handleClick}>
        {controlBar}
        <p
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => onUpdate(node.id, 'content', e.currentTarget.textContent ?? '')}
          style={node.props as React.CSSProperties}
          className="outline-none min-h-[1em] whitespace-pre-wrap"
        >
          {node.content}
        </p>
      </div>
    );
  }

  if (node.type === 'image') {
    return (
      <div className={wrapperClass} onClick={handleClick}>
        {controlBar}
        <img src={node.src} alt="" style={node.props as React.CSSProperties} className="block" />
      </div>
    );
  }

  if (node.type === 'button') {
    return (
      <div className={wrapperClass} onClick={handleClick}>
        {controlBar}
        <a href={node.href} style={node.props as React.CSSProperties} onClick={(e) => e.preventDefault()}>
          {node.content}
        </a>
      </div>
    );
  }

  if (node.type === 'divider') {
    return (
      <div className={wrapperClass} onClick={handleClick}>
        {controlBar}
        <hr style={{ borderColor: node.props.borderColor, margin: node.props.margin }} />
      </div>
    );
  }

  if (node.type === 'spacer') {
    return (
      <div className={wrapperClass} onClick={handleClick}
        style={{ height: node.props.height || '48px', backgroundColor: 'rgba(109,40,217,0.05)', border: '1px dashed #4c1d95' }}>
        {controlBar}
        <span className="text-xs text-violet-400 flex items-center justify-center h-full">Spacer</span>
      </div>
    );
  }

  // section / hero / form — container types
  return (
    <div className={wrapperClass} onClick={handleClick} style={node.props as React.CSSProperties}>
      {controlBar}
      {node.children.map((child, i) => (
        <CanvasNode
          key={child.id}
          node={child}
          selectedId={selectedId}
          onSelect={onSelect}
          onDelete={onDelete}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          onUpdate={onUpdate}
          canUp={i > 0}
          canDown={i < node.children.length - 1}
        />
      ))}
    </div>
  );
}

// ─── Inspector ────────────────────────────────────────────────────────────────
function Inspector({ node, onChange, onImageUpload }: {
  node: VibeNode;
  onChange: (field: string, value: string) => void;
  onImageUpload: (file: File) => void;
}) {
  const fields: { label: string; key: string; type?: string }[] = [
    { label: 'Content', key: 'content' },
    { label: 'Background', key: 'backgroundColor', type: 'color' },
    { label: 'Text Color', key: 'color', type: 'color' },
    { label: 'Font Size', key: 'fontSize' },
    { label: 'Padding', key: 'padding' },
    { label: 'Text Align', key: 'textAlign' },
    { label: 'Border Radius', key: 'borderRadius' },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-gray-800/50 rounded-lg px-3 py-2">
        <span className="text-xs text-gray-500 uppercase tracking-wider">Type: </span>
        <span className="text-xs font-semibold text-violet-400 uppercase">{node.type}</span>
      </div>

      {node.type === 'image' && (
        <div>
          <label className="block text-xs text-gray-400 mb-1">Image Source</label>
          <input
            type="text"
            value={node.src ?? ''}
            onChange={(e) => onChange('src', e.target.value)}
            placeholder="https://..."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-violet-500"
          />
          <label className="mt-2 flex items-center gap-2 cursor-pointer">
            <span className="text-xs bg-violet-700 hover:bg-violet-600 text-white px-3 py-1.5 rounded-lg transition-colors">Upload Image</span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onImageUpload(f);
            }} />
          </label>
        </div>
      )}

      {fields.map(({ label, key, type }) => {
        if (key === 'content' && !['text', 'button'].includes(node.type)) return null;
        const value = key === 'content' ? (node.content ?? '') : (node.props[key] ?? '');
        return (
          <div key={key}>
            <label className="block text-xs text-gray-400 mb-1">{label}</label>
            {type === 'color' ? (
              <div className="flex items-center gap-2">
                <input type="color" value={value || '#000000'} onChange={(e) => onChange(key, e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer bg-transparent border-0" />
                <input type="text" value={value} onChange={(e) => onChange(key, e.target.value)}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-violet-500" />
              </div>
            ) : (
              <input type="text" value={value} onChange={(e) => onChange(key, e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-violet-500" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Editor ──────────────────────────────────────────────────────────────
const COMPONENT_TYPES: VibeNode['type'][] = ['hero', 'section', 'text', 'image', 'button', 'divider', 'spacer', 'form'];

export default function VibeBuilderEditor() {
  const [searchParams] = useSearchParams();
  const pageId = searchParams.get('pageId');
  const { user, accessToken } = useAuthStore();

  const [site, setSite] = useState<SiteData | null>(null);
  const [page, setPage] = useState<VibePage | null>(null);
  const [nodes, setNodes] = useState<VibeNode[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string>('');

  // Undo/redo history
  const [history, setHistory] = useState<VibeNode[][]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const isUndoRedo = useRef(false);

  const userId = user?.itemId ?? user?.email ?? '';
  const username = user?.userName ?? user?.email?.split('@')[0] ?? 'user';

  // Store token
  useEffect(() => {
    if (accessToken) localStorage.setItem('access_token', accessToken);
  }, [accessToken]);

  // Load site & page
  useEffect(() => {
    if (!userId || !pageId) return;
    (async () => {
      setLoading(true);
      const data = await contentService.getByUserId(userId);
      if (data) {
        setSite(data);
        const pg = data.pages.find((p) => p.id === pageId) ?? null;
        setPage(pg);
        const initial = pg?.rootNode?.children ?? [];
        setNodes(initial);
        setHistory([initial]);
        setHistIdx(0);
      }
      setLoading(false);
    })();
  }, [userId, pageId]);

  // Push to history on nodes change
  const pushHistory = useCallback((newNodes: VibeNode[]) => {
    if (isUndoRedo.current) { isUndoRedo.current = false; return; }
    setHistory((prev) => {
      const trimmed = prev.slice(0, histIdx + 1);
      return [...trimmed, newNodes];
    });
    setHistIdx((prev) => prev + 1);
  }, [histIdx]);

  // Update nodes helper
  const updateNodes = useCallback((newNodes: VibeNode[]) => {
    setNodes(newNodes);
    pushHistory(newNodes);
  }, [pushHistory]);

  const undo = () => {
    if (histIdx <= 0) return;
    isUndoRedo.current = true;
    const prev = history[histIdx - 1];
    setNodes(prev);
    setHistIdx(histIdx - 1);
  };

  const redo = () => {
    if (histIdx >= history.length - 1) return;
    isUndoRedo.current = true;
    const next = history[histIdx + 1];
    setNodes(next);
    setHistIdx(histIdx + 1);
  };

  // Add node
  const addNode = (type: VibeNode['type']) => {
    const node = createNode(type);
    updateNodes([...nodes, node]);
  };

  // Delete node
  const deleteNode = (id: string) => {
    updateNodes(nodes.filter((n) => n.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  // Move node
  const moveUp = (id: string) => {
    const idx = nodes.findIndex((n) => n.id === id);
    if (idx <= 0) return;
    const arr = [...nodes];
    [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
    updateNodes(arr);
  };

  const moveDown = (id: string) => {
    const idx = nodes.findIndex((n) => n.id === id);
    if (idx < 0 || idx >= nodes.length - 1) return;
    const arr = [...nodes];
    [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
    updateNodes(arr);
  };

  // Update node field
  const updateNode = (id: string, field: string, value: string) => {
    const updated = nodes.map((n) => {
      if (n.id !== id) return n;
      if (field === 'content') return { ...n, content: value };
      if (field === 'src') return { ...n, src: value };
      if (field === 'href') return { ...n, href: value };
      return { ...n, props: { ...n.props, [field]: value } };
    });
    updateNodes(updated);
  };

  // Inspector update for selected node
  const handleInspectorChange = (field: string, value: string) => {
    if (!selectedId) return;
    updateNode(selectedId, field, value);
  };

  // Image upload
  const handleImageUpload = async (file: File) => {
    if (!selectedId) return;
    const url = await mediaService.uploadImage(file);
    const updated = nodes.map((n) => n.id === selectedId ? { ...n, src: url } : n);
    updateNodes(updated);
  };

  // Save
  const save = useCallback(async () => {
    if (!site?.id || !page) return;
    setSaving(true);
    setStatus('Saving...');
    const updatedPage: VibePage = {
      ...page,
      rootNode: { ...page.rootNode, children: nodes },
    };
    const updatedPages = site.pages.map((p) => (p.id === page.id ? updatedPage : p));
    try {
      await contentService.update(site.id, { is_published: site.is_published, pages: updatedPages });
      setSite({ ...site, pages: updatedPages });
      setPage(updatedPage);
      setStatus('Saved ✓');
    } catch {
      setStatus('Save failed');
    } finally {
      setSaving(false);
      setTimeout(() => setStatus(''), 2000);
    }
  }, [site, page, nodes]);

  // Auto-save debounce
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!site?.id || loading) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(save, 2500);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [nodes]);  // eslint-disable-line react-hooks/exhaustive-deps

  const selectedNode = nodes.find((n) => n.id === selectedId) ?? null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400">Page not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Top Bar */}
      <div className="h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4 gap-4 shrink-0 z-20">
        <div className="flex items-center gap-3">
          <a href="/vibebuilder" className="text-gray-400 hover:text-white transition-colors text-sm">← Dashboard</a>
          <span className="text-gray-600">|</span>
          <span className="text-white font-semibold text-sm">{page.name}</span>
        </div>
        <div className="flex items-center gap-2">
          {status && <span className="text-xs text-gray-400 mr-2">{status}</span>}
          <button onClick={undo} disabled={histIdx <= 0}
            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 text-white text-xs rounded-lg transition-all">Undo</button>
          <button onClick={redo} disabled={histIdx >= history.length - 1}
            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 text-white text-xs rounded-lg transition-all">Redo</button>
          <button onClick={save} disabled={saving}
            className="px-4 py-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-all">
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={() => window.open(`/site/${username}/${page.path}`, '_blank')}
            className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs font-semibold rounded-lg transition-all"
          >Preview ↗</button>
        </div>
      </div>

      {/* Editor body */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT: Component Library */}
        <div className="w-60 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0 overflow-y-auto">
          <p className="text-xs text-gray-500 uppercase tracking-widest px-4 pt-4 pb-2 font-semibold">Components</p>
          <div className="px-3 pb-4 space-y-1">
            {COMPONENT_TYPES.map((type) => (
              <button key={type} onClick={() => addNode(type)}
                className="w-full text-left px-3 py-2.5 rounded-lg bg-gray-800/60 hover:bg-violet-900/40 hover:border-violet-700 border border-transparent text-gray-300 hover:text-white text-sm transition-all capitalize flex items-center gap-2">
                <span className="text-violet-400">+</span> {type}
              </button>
            ))}
          </div>
        </div>

        {/* CENTER: Canvas */}
        <div
          className="flex-1 overflow-y-auto bg-gray-100"
          onClick={() => setSelectedId(null)}
        >
          <div className="min-h-full" style={{ minWidth: '360px' }}>
            {nodes.length === 0 && (
              <div className="flex items-center justify-center h-96 text-gray-400 text-sm">
                ← Add a component to get started
              </div>
            )}
            {nodes.map((node, i) => (
              <CanvasNode
                key={node.id}
                node={node}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onDelete={deleteNode}
                onMoveUp={moveUp}
                onMoveDown={moveDown}
                onUpdate={updateNode}
                canUp={i > 0}
                canDown={i < nodes.length - 1}
              />
            ))}
          </div>
        </div>

        {/* RIGHT: Inspector */}
        <div className="w-72 bg-gray-900 border-l border-gray-800 flex flex-col shrink-0 overflow-y-auto">
          <p className="text-xs text-gray-500 uppercase tracking-widest px-4 pt-4 pb-2 font-semibold">Inspector</p>
          <div className="px-4 pb-4">
            {selectedNode ? (
              <Inspector
                node={selectedNode}
                onChange={handleInspectorChange}
                onImageUpload={handleImageUpload}
              />
            ) : (
              <p className="text-gray-600 text-sm">Select a component to edit its properties.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
