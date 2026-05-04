import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/state/store/auth';
import { contentService } from '@/services/contentService';
import { mediaService } from '@/services/mediaService';
import { SiteData, VibeNode, VibePage } from '@/types/vibe';
import { v4 as uuidv4 } from 'uuid';
import { decodeJWT } from '@/lib/utils/decode-jwt-utils';
import { ThemeSwitcher, LanguageSelector } from '@/components/core';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
    case 'video':
      return { ...base, src: 'https://www.youtube.com/embed/dQw4w9WgXcQ', props: { width: '100%', height: '400px', borderRadius: '8px' } };
    case 'gallery':
      return { ...base, props: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', padding: '20px' }, children: [
        { id: uuidv4(), type: 'image', src: 'https://placehold.co/400x300?text=1', props: { width: '100%', borderRadius: '8px' }, children: [] },
        { id: uuidv4(), type: 'image', src: 'https://placehold.co/400x300?text=2', props: { width: '100%', borderRadius: '8px' }, children: [] },
        { id: uuidv4(), type: 'image', src: 'https://placehold.co/400x300?text=3', props: { width: '100%', borderRadius: '8px' }, children: [] },
      ]};
    case 'testimonial':
      return { ...base, props: { padding: '32px', backgroundColor: '#f3f4f6', borderRadius: '12px', textAlign: 'center' }, children: [
        { id: uuidv4(), type: 'text', content: '"This product is amazing! Highly recommended."', props: { fontSize: '1.25rem', fontStyle: 'italic', color: '#374151' }, children: [] },
        { id: uuidv4(), type: 'text', content: '- Jane Doe, CEO', props: { fontSize: '1rem', fontWeight: '600', color: '#111827', marginTop: '16px' }, children: [] },
      ]};
    case 'social-links':
      return { ...base, props: { display: 'flex', justifyContent: 'center', gap: '16px', padding: '16px' }, children: [
        { id: uuidv4(), type: 'button', content: 'Twitter', href: '#', props: { padding: '8px 16px', backgroundColor: '#1DA1F2', color: '#fff', borderRadius: '4px', textDecoration: 'none' }, children: [] },
        { id: uuidv4(), type: 'button', content: 'LinkedIn', href: '#', props: { padding: '8px 16px', backgroundColor: '#0A66C2', color: '#fff', borderRadius: '4px', textDecoration: 'none' }, children: [] },
      ]};
    case 'card':
      return { ...base, props: { padding: '24px', backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', gap: '12px' }, children: [
        { id: uuidv4(), type: 'image', src: 'https://placehold.co/400x250', props: { width: '100%', borderRadius: '8px' }, children: [] },
        { id: uuidv4(), type: 'text', content: 'Card Title', props: { fontSize: '1.5rem', fontWeight: '700', color: '#111827' }, children: [] },
        { id: uuidv4(), type: 'text', content: 'Card description goes here.', props: { fontSize: '1rem', color: '#4b5563' }, children: [] },
      ]};
    case 'two-columns':
      return { ...base, props: { display: 'flex', flexDirection: 'row', gap: '24px', padding: '40px 20px' }, children: [
        { id: uuidv4(), type: 'section', props: { flex: '1' }, children: [
          { id: uuidv4(), type: 'text', content: 'Left Column', props: { fontSize: '1.5rem', fontWeight: 'bold' }, children: [] }
        ]},
        { id: uuidv4(), type: 'section', props: { flex: '1' }, children: [
          { id: uuidv4(), type: 'text', content: 'Right Column', props: { fontSize: '1.5rem', fontWeight: 'bold' }, children: [] }
        ]}
      ]};
    case 'navbar':
      return { ...base, props: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', backgroundColor: '#ffffff', borderBottom: '1px solid #e5e7eb' }, children: [
        { id: uuidv4(), type: 'text', content: 'MyBrand', props: { fontSize: '1.25rem', fontWeight: 'bold', color: '#6d28d9' }, children: [] },
        { id: uuidv4(), type: 'section', props: { display: 'flex', gap: '16px' }, children: [
          { id: uuidv4(), type: 'button', content: 'Home', href: '#', props: { backgroundColor: 'transparent', color: '#374151', padding: '0', textDecoration: 'none' }, children: [] },
          { id: uuidv4(), type: 'button', content: 'About', href: '#', props: { backgroundColor: 'transparent', color: '#374151', padding: '0', textDecoration: 'none' }, children: [] },
        ]}
      ]};
    case 'footer':
      return { ...base, props: { padding: '40px 20px', backgroundColor: '#111827', color: '#ffffff', textAlign: 'center' }, children: [
        { id: uuidv4(), type: 'text', content: '© 2026 MyBrand. All rights reserved.', props: { fontSize: '0.875rem', color: '#9ca3af' }, children: [] }
      ]};
    case 'container':
      return { ...base, props: { maxWidth: '1200px', margin: '0 auto', padding: '20px' } };
    case 'three-columns':
      return { ...base, props: { display: 'flex', gap: '24px', padding: '40px 20px' }, children: [
        { id: uuidv4(), type: 'section', props: { flex: '1' }, children: [] },
        { id: uuidv4(), type: 'section', props: { flex: '1' }, children: [] },
        { id: uuidv4(), type: 'section', props: { flex: '1' }, children: [] }
      ]};
    case 'heading':
      return { ...base, content: 'Headline Title', props: { fontSize: '2.5rem', fontWeight: '800', color: 'inherit', marginBottom: '16px' } };
    case 'paragraph':
      return { ...base, content: 'This is a paragraph of text. You can edit it directly on the canvas.', props: { fontSize: '1rem', color: 'inherit', lineHeight: '1.6' } };
    case 'icon':
      return { ...base, props: { fontSize: '24px', color: '#6d28d9' }, content: 'star' };
    case 'feature':
      return { ...base, props: { padding: '24px', backgroundColor: '#ffffff', borderRadius: '12px', textAlign: 'center' }, children: [
        { id: uuidv4(), type: 'icon', props: { fontSize: '32px', marginBottom: '16px' }, content: 'zap', children: [] },
        { id: uuidv4(), type: 'heading', props: { fontSize: '1.25rem', fontWeight: 'bold' }, content: 'Feature Name', children: [] },
        { id: uuidv4(), type: 'paragraph', props: { fontSize: '0.875rem' }, content: 'Description of the feature goes here.', children: [] },
      ]};
    case 'pricing':
      return { ...base, props: { padding: '32px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e5e7eb', textAlign: 'center' }, children: [
        { id: uuidv4(), type: 'text', props: { fontSize: '0.875rem', fontWeight: 'bold', color: '#6d28d9' }, content: 'PRO PLAN', children: [] },
        { id: uuidv4(), type: 'heading', props: { fontSize: '3rem', fontWeight: '900' }, content: '$29', children: [] },
        { id: uuidv4(), type: 'button', props: { width: '100%', marginTop: '24px' }, content: 'Get Started', children: [] },
      ]};
    default:
      return base;
  }
}

// ─── Canvas Node Renderer ─────────────────────────────────────────────────────
interface CanvasNodeProps {
  node: VibeNode;
  onUpdate: (id: string, field: string, value: any) => void;
  onDelete: (id: string) => void;
  onCopy: (node: VibeNode) => void;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
}

const CanvasNode = ({ node, onUpdate, onDelete, onCopy, selectedId, setSelectedId }: CanvasNodeProps) => {
  const isSelected = selectedId === node.id;
  const style = node.props as React.CSSProperties;

  const controlBar = (
    <div className="absolute right-1 top-1 z-20 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <button onClick={(e) => { e.stopPropagation(); onCopy(node); }} className="bg-primary/90 text-white rounded p-1 hover:bg-primary shadow-sm" title="Copy">
        <span className="text-[10px]">📋</span>
      </button>
      <button onClick={(e) => { e.stopPropagation(); onDelete(node.id); }} className="bg-destructive/90 text-white rounded p-1 hover:bg-destructive shadow-sm" title="Delete">
        <span className="text-[10px]">✕</span>
      </button>
    </div>
  );

  const wrapperClass = `group relative cursor-pointer transition-all rounded ${
    isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : 'hover:ring-1 hover:ring-border'
  }`;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedId(node.id);
  };

  if (node.type === 'text') {
    return (
      <div className={wrapperClass} onClick={handleClick}>
        {controlBar}
        <p
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => onUpdate(node.id, 'content', e.currentTarget.textContent ?? '')}
          style={style}
          className="outline-none min-h-[1em] whitespace-pre-wrap"
        >
          {node.content}
        </p>
      </div>
    );
  }

  if (node.type === 'heading') {
    return (
      <div className={wrapperClass} onClick={handleClick} style={{ position: style.position, top: style.top, left: style.left, right: style.right, bottom: style.bottom, zIndex: style.zIndex }}>
        {controlBar}
        <h1
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => onUpdate(node.id, 'content', e.currentTarget.textContent ?? '')}
          style={{ ...style, position: undefined, top: undefined, left: undefined, right: undefined, bottom: undefined, zIndex: undefined }}
          className="outline-none min-h-[1em]"
        >
          {node.content}
        </h1>
      </div>
    );
  }

  if (node.type === 'paragraph') {
    return (
      <div className={wrapperClass} onClick={handleClick} style={{ position: style.position, top: style.top, left: style.left, right: style.right, bottom: style.bottom, zIndex: style.zIndex }}>
        {controlBar}
        <p
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => onUpdate(node.id, 'content', e.currentTarget.textContent ?? '')}
          style={{ ...style, position: undefined, top: undefined, left: undefined, right: undefined, bottom: undefined, zIndex: undefined }}
          className="outline-none min-h-[1em] whitespace-pre-wrap"
        >
          {node.content}
        </p>
      </div>
    );
  }

  if (node.type === 'icon') {
    return (
      <div className={wrapperClass} onClick={handleClick} style={{ position: style.position, top: style.top, left: style.left, right: style.right, bottom: style.bottom, zIndex: style.zIndex }}>
        {controlBar}
        <div style={{ ...style, position: undefined, top: undefined, left: undefined, right: undefined, bottom: undefined, zIndex: undefined }} className="flex items-center justify-center">
          <span className="capitalize font-bold text-xs">[{node.content}]</span>
        </div>
      </div>
    );
  }

  if (node.type === 'image') {
    return (
      <div className={wrapperClass} onClick={handleClick} style={{ position: style.position, top: style.top, left: style.left, right: style.right, bottom: style.bottom, zIndex: style.zIndex }}>
        {controlBar}
        <img src={node.src} alt={node.alt ?? ''} style={{ ...style, position: undefined, top: undefined, left: undefined, right: undefined, bottom: undefined, zIndex: undefined }} className="block" />
      </div>
    );
  }

  if (node.type === 'video') {
    return (
      <div className={wrapperClass} onClick={handleClick}>
        {controlBar}
        <iframe
          src={node.src}
          style={style}
          title="Video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="block"
        />
      </div>
    );
  }

  if (node.type === 'button') {
    return (
      <div className={wrapperClass} onClick={handleClick} style={{ position: style.position, top: style.top, left: style.left, right: style.right, bottom: style.bottom, zIndex: style.zIndex }}>
        {controlBar}
        <a href={node.href} style={{ ...style, position: undefined, top: undefined, left: undefined, right: undefined, bottom: undefined, zIndex: undefined }} onClick={(e) => e.preventDefault()}>
          {node.content}
        </a>
      </div>
    );
  }

  if (node.type === 'divider') {
    return (
      <div className={wrapperClass} onClick={handleClick}>
        {controlBar}
        <hr style={{ borderColor: style.borderColor, margin: style.margin }} />
      </div>
    );
  }

  if (node.type === 'spacer') {
    return (
      <div className={wrapperClass} onClick={handleClick}
        style={{ height: style.height || '48px', backgroundColor: 'var(--primary-20)', border: '1px dashed var(--primary)' }}>
        {controlBar}
        <span className="text-xs text-primary flex items-center justify-center h-full">Spacer</span>
      </div>
    );
  }

  return (
    <div className={wrapperClass} onClick={handleClick} style={style}>
      {controlBar}
      {node.children.map((child) => (
        <CanvasNode
          key={child.id}
          node={child}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onCopy={onCopy}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
        />
      ))}
    </div>
  );
};

// ─── Sortable Wrapper ─────────────────────────────────────────────────────────
const SortableCanvasNode = React.memo(function SortableCanvasNode(props: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: props.node.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div {...listeners} className="absolute left-1 top-1 z-20 cursor-grab opacity-0 group-hover:opacity-100 bg-card text-foreground rounded p-1 text-xs shadow-sm border border-border" title="Drag to reorder">
        ⠿
      </div>
      <CanvasNode {...props} />
    </div>
  );
});

// ─── Inspector ────────────────────────────────────────────────────────────────
function Inspector({ node, onChange, onImageUpload }: { node: VibeNode; onChange: (key: string, value: any) => void; onImageUpload: (file: File) => void }) {
  const [tab, setTab] = useState<'style' | 'animation'>('style');
  
  const fields: { label: string; key: string; type?: string; options?: string[] }[] = [
    { label: 'Content', key: 'content' },
    { label: 'Link URL', key: 'href' },
    { label: 'Alt Text', key: 'alt' },
    { label: 'Background', key: 'backgroundColor', type: 'color' },
    { label: 'Text Color', key: 'color', type: 'color' },
    { label: 'Font Size', key: 'fontSize' },
    { label: 'Line Height', key: 'lineHeight' },
    { label: 'Padding', key: 'padding' },
    { label: 'Max Width', key: 'maxWidth' },
    { label: 'Text Align', key: 'textAlign', type: 'select', options: ['left', 'center', 'right', 'justify'] },
    { label: 'Border Radius', key: 'borderRadius' },
    { label: 'Border Width', key: 'borderWidth' },
    { label: 'Border Color', key: 'borderColor', type: 'color' },
    { label: 'Box Shadow', key: 'boxShadow' },
    { label: 'Opacity (0-1)', key: 'opacity' },
    { label: 'Display', key: 'display', type: 'select', options: ['block', 'flex', 'inline-block', 'grid', 'none'] },
    { label: 'Position', key: 'position', type: 'select', options: ['static', 'relative', 'absolute', 'fixed'] },
    { label: 'Top', key: 'top' },
    { label: 'Left', key: 'left' },
    { label: 'Right', key: 'right' },
    { label: 'Bottom', key: 'bottom' },
    { label: 'Z-Index', key: 'zIndex' },
    { label: 'Flex Direction', key: 'flexDirection', type: 'select', options: ['row', 'column'] },
    { label: 'Justify Content', key: 'justifyContent', type: 'select', options: ['flex-start', 'center', 'flex-end', 'space-between', 'space-around'] },
    { label: 'Align Items', key: 'alignItems', type: 'select', options: ['flex-start', 'center', 'flex-end', 'stretch'] },
  ];

  const handleAnimationChange = (key: string, value: string) => {
    const animation = {
      type: 'none',
      duration: '0.5s',
      delay: '0s',
      ...(node.animation || {}),
      [key]: value
    };
    onChange('animation', animation);
  };

  return (
    <div className="space-y-4">
      <div className="flex bg-muted rounded-lg p-1">
        <button onClick={() => setTab('style')} className={`flex-1 py-1 text-[10px] rounded font-bold transition-all ${tab === 'style' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}>STYLE</button>
        <button onClick={() => setTab('animation')} className={`flex-1 py-1 text-[10px] rounded font-bold transition-all ${tab === 'animation' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}>ANIMATION</button>
      </div>

      {tab === 'style' ? (
        <>
          <div className="bg-muted rounded-lg px-3 py-2 flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Element Type</span>
            <span className="text-[10px] font-bold text-primary uppercase">{node.type}</span>
          </div>

      {node.type === 'image' && (
        <div>
          <label className="block text-xs text-muted-foreground mb-1 font-medium">Image Source URL</label>
          <input
            type="text"
            value={node.src ?? ''}
            onChange={(e) => onChange('src', e.target.value)}
            placeholder="https://..."
            className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
          />
          <label className="mt-2 flex items-center gap-2 cursor-pointer">
            <span className="text-xs bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-1.5 rounded-lg transition-colors font-medium">Upload Image</span>
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
            <label className="block text-[11px] text-muted-foreground mb-1 font-medium">{label}</label>
            {type === 'color' ? (
              <div className="flex items-center gap-2">
                <input type="color" value={value || '#000000'} onChange={(e) => onChange(key, e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer bg-transparent border-0" />
                <input type="text" value={value} onChange={(e) => onChange(key, e.target.value)}
                  className="flex-1 bg-card border border-border rounded-lg px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary" />
              </div>
            ) : type === 'select' ? (
              <select value={value} onChange={(e) => onChange(key, e.target.value)}
                className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary">
                <option value="">Default</option>
                {fields.find(f => f.key === key)?.options?.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            ) : (
              <input type="text" value={value} onChange={(e) => onChange(key, e.target.value)}
                className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary" />
            )}
          </div>
        );
      })}
        </>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-[11px] text-muted-foreground mb-1 font-medium">Entrance Animation</label>
            <select 
              value={node.animation?.type || 'none'} 
              onChange={(e) => handleAnimationChange('type', e.target.value)}
              className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            >
              <option value="none">None</option>
              <option value="fadeIn">Fade In</option>
              <option value="slideUp">Slide Up</option>
              <option value="slideLeft">Slide Left</option>
              <option value="zoomIn">Zoom In</option>
              <option value="bounce">Bounce</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-muted-foreground mb-1 font-medium">Duration</label>
              <select 
                value={node.animation?.duration || '0.5s'} 
                onChange={(e) => handleAnimationChange('duration', e.target.value)}
                className="w-full bg-card border border-border rounded-lg px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary"
              >
                <option value="0.3s">0.3s</option>
                <option value="0.5s">0.5s</option>
                <option value="0.8s">0.8s</option>
                <option value="1s">1s</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-muted-foreground mb-1 font-medium">Delay</label>
              <select 
                value={node.animation?.delay || '0s'} 
                onChange={(e) => handleAnimationChange('delay', e.target.value)}
                className="w-full bg-card border border-border rounded-lg px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary"
              >
                <option value="0s">0s</option>
                <option value="0.2s">0.2s</option>
                <option value="0.4s">0.4s</option>
                <option value="0.6s">0.6s</option>
              </select>
            </div>
          </div>
          <div className="p-3 bg-primary/5 border border-primary/10 rounded-lg">
            <p className="text-[10px] text-muted-foreground leading-relaxed italic">Animations will play when the element enters the viewport on the live site.</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Editor ──────────────────────────────────────────────────────────────
const CATEGORIES = [
  {
    name: 'Layout',
    types: ['section', 'container', 'two-columns', 'three-columns', 'spacer', 'divider']
  },
  {
    name: 'Content',
    types: ['heading', 'paragraph', 'text', 'icon']
  },
  {
    name: 'Media',
    types: ['image', 'video', 'gallery']
  },
  {
    name: 'Interactive',
    types: ['button', 'form']
  },
  {
    name: 'Sections',
    types: ['hero', 'feature', 'pricing', 'testimonial', 'card', 'navbar', 'footer']
  }
];

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
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [leftTab, setLeftTab] = useState<'components' | 'styles'>('components');
  const [clipboard, setClipboard] = useState<VibeNode | null>(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Auto-save to localStorage on navigation/close
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (site) {
        localStorage.setItem(`vibe_site_${site.user_id}`, JSON.stringify(site));
        localStorage.setItem(`vibe_site_user_${site.username}`, JSON.stringify(site));
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [site]);

  // Undo/redo history
  const [history, setHistory] = useState<VibeNode[][]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const isUndoRedo = useRef(false);

  // Extract userId from user object or directly from JWT (handles Zustand rehydration timing)
  const jwtPayload = accessToken ? decodeJWT(accessToken) as any : null;
  const userId = user?.itemId ?? user?.email ?? jwtPayload?.sub ?? jwtPayload?.itemId ?? jwtPayload?.userId ?? '';
  const username = user?.userName ?? user?.email?.split('@')[0] ?? jwtPayload?.preferred_username ?? 'user';

  // Store token
  useEffect(() => {
    if (accessToken) localStorage.setItem('access_token', accessToken);
  }, [accessToken]);

  // Load site & page
  useEffect(() => {
    if (!userId || !pageId) return;
    
    const loadSite = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await Promise.race([
          contentService.getByUserId(userId),
          new Promise<null>((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
        ]);

        if (data) {
          setSite(data);
          const pg = data.pages.find((p: any) => p.id === pageId) ?? data.pages[0];
          if (pg) {
            setPage(pg);
            const initial = pg.rootNode?.children ?? [];
            setNodes(initial);
            setHistory([initial]);
            setHistIdx(0);
          }
        }
      } catch (err) {
        console.error('Failed to load site:', err);
        const local = localStorage.getItem('vibe_site_' + userId) || localStorage.getItem('vibe_' + userId);
        if (local) {
          try {
            const data = JSON.parse(local);
            setSite(data);
            const pg = data.pages?.find((p: any) => p.id === pageId) ?? data.pages?.[0];
            if (pg) {
              setPage(pg);
              const initial = pg.rootNode?.children ?? [];
              setNodes(initial);
              setHistory([initial]);
              setHistIdx(0);
            }
          } catch (e) {
            setError('Failed to load site from backup.');
          }
        } else {
          setError('Network timeout. Please check your connection.');
        }
      } finally {
        setLoading(false);
      }
    };

    loadSite();
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

  const debugStorage = () => {
    console.log('[STORAGE] All keys:');
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const val = localStorage.getItem(key!);
      if (val && val.length < 100) {
        console.log(key, ':', val);
      } else {
        console.log(key, ': [long value]');
      }
    }
  };

  useEffect(() => {
    debugStorage();
  }, []);

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

  // Update node field
  const updateNode = (id: string, field: string, value: any) => {
    const updated = nodes.map((n) => {
      if (n.id !== id) return n;
      if (field === 'content') return { ...n, content: value };
      if (field === 'src') return { ...n, src: value };
      if (field === 'href') return { ...n, href: value };
      if (field === 'alt') return { ...n, alt: value };
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

  const copyNode = useCallback((node: VibeNode) => {
    setClipboard(node);
    setStatus('Copied ✓');
    setTimeout(() => setStatus(''), 2000);
  }, []);

  const pasteNode = useCallback(() => {
    if (!clipboard) return;
    const deepClone = (n: VibeNode): VibeNode => ({
      ...n,
      id: uuidv4(),
      children: n.children.map(deepClone)
    });
    const newNode = deepClone(clipboard);
    const updated = [...nodes, newNode];
    updateNodes(updated);
    setSelectedId(newNode.id);
    setStatus('Pasted ✓');
    setTimeout(() => setStatus(''), 2000);
  }, [clipboard, nodes, updateNodes]);

  // Save
  const save = useCallback(async () => {
    if (!site?.itemId || !page) return;
    console.log('[SAVE] Save triggered', site);
    console.log('[SAVE] userId:', userId);
    console.log('[SAVE] token:', accessToken);

    setSaving(true);
    setStatus('Saving...');
    const updatedPage: VibePage = {
      ...page,
      rootNode: { ...page.rootNode, children: nodes },
    };
    const updatedPages = site.pages.map((p) => (p.id === page.id ? updatedPage : p));
    const updatedSite = { ...site, pages: updatedPages };

    try {
      await contentService.saveSiteData(updatedSite);
      setSite(updatedSite);
      setPage(updatedPage);
      setStatus('Saved ✓');
    } catch (err) {
      console.error('[SAVE] Error:', err);
      // Even if API fails, saveSiteData handled localStorage fallback
      setSite(updatedSite);
      setPage(updatedPage);
      setStatus('Saved ✓'); 
    } finally {
      setSaving(false);
      setTimeout(() => setStatus(''), 2000);
    }
  }, [site, page, nodes, userId, username, accessToken]);

  // Handle Theme Change
  const handleThemeChange = (key: string, value: string) => {
    if (!site) return;
    setSite({ ...site, theme: { ...(site.theme || {}), [key]: value } });
  };

  // Auto-save debounce
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!site?.id || loading) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    setStatus('Unsaved changes');
    autoSaveTimer.current = setTimeout(save, 2500);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [nodes]);  // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        save();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        const selected = nodes.find(n => n.id === selectedId);
        if (selected) copyNode(selected);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        pasteNode();
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId && (e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'TEXTAREA' && !(e.target as HTMLElement).isContentEditable) {
          deleteNode(selectedId);
        }
      } else if (e.key === 'Escape') {
        setSelectedId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, save, undo, redo, deleteNode, copyNode, pasteNode, nodes]);

  // Drag and Drop
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setNodes((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        const newArr = arrayMove(items, oldIndex, newIndex);
        pushHistory(newArr);
        return newArr;
      });
    }
  };

  const selectedNode = nodes.find((n) => n.id === selectedId) ?? null;

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-background flex flex-col p-6 space-y-4">
        <div className="h-14 bg-muted rounded animate-pulse" />
        <div className="flex flex-1 gap-4">
          <div className="w-60 bg-muted rounded animate-pulse" />
          <div className="flex-1 space-y-6 p-4">
            <div className="h-32 bg-muted/50 rounded-xl animate-pulse" />
            <div className="h-64 bg-muted/50 rounded-xl animate-pulse" />
            <div className="h-32 bg-muted/50 rounded-xl animate-pulse" />
          </div>
          <div className="w-72 bg-muted rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">Something went wrong</h2>
        <p className="text-destructive mb-6">{error}</p>
        <button onClick={() => window.location.reload()} className="px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg">
          Try Again
        </button>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="w-full min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Page not found</p>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-background flex flex-col" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="h-14 bg-card border-b border-border flex items-center justify-between px-4 gap-4 shrink-0 z-20">
        <div className="flex items-center gap-3">
          <a href="/vibebuilder" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">← Dashboard</a>
          <span className="text-border">|</span>
          <span className="text-foreground font-semibold text-sm">{page.name}</span>
        </div>
        <div className="flex items-center gap-2">
          {status && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 border border-border">
              <div className={`w-1.5 h-1.5 rounded-full ${
                status.includes('Saved') ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' :
                status.includes('Saving') ? 'bg-blue-500 animate-pulse' :
                status.includes('Unsaved') ? 'bg-yellow-500' : 'bg-red-500'
              }`} />
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">{status}</span>
            </div>
          )}
          <button onClick={undo} disabled={histIdx <= 0}
            className="px-3 py-1.5 bg-muted hover:bg-accent disabled:opacity-30 text-foreground text-xs rounded-lg transition-all font-medium">Undo</button>
          <button onClick={redo} disabled={histIdx >= history.length - 1}
            className="px-3 py-1.5 bg-muted hover:bg-accent disabled:opacity-30 text-foreground text-xs rounded-lg transition-all font-medium">Redo</button>
          <button onClick={save} disabled={saving}
            className="px-4 py-1.5 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground text-xs font-semibold rounded-lg transition-all">
            {saving ? 'Saving...' : 'Save'}
          </button>
          <div className="flex items-center bg-muted rounded-lg p-1 ml-2">
            <button onClick={() => setViewport('desktop')} className={`px-2 py-1 text-[10px] rounded ${viewport === 'desktop' ? 'bg-background shadow-sm font-bold' : 'text-muted-foreground'}`}>🖥 Desktop</button>
            <button onClick={() => setViewport('tablet')} className={`px-2 py-1 text-[10px] rounded ${viewport === 'tablet' ? 'bg-background shadow-sm font-bold' : 'text-muted-foreground'}`}>📱 Tablet</button>
            <button onClick={() => setViewport('mobile')} className={`px-2 py-1 text-[10px] rounded ${viewport === 'mobile' ? 'bg-background shadow-sm font-bold' : 'text-muted-foreground'}`}>📱 Mobile</button>
          </div>
          <button
            onClick={() => window.open(`/site/${username}/${page.path}`, '_blank')}
            className="px-4 py-1.5 bg-secondary hover:bg-secondary/80 text-secondary-foreground text-xs font-semibold rounded-lg transition-all"
          >Preview</button>
          <div className="flex items-center gap-1 ml-2 pl-2 border-l border-border">
            <ThemeSwitcher />
            <LanguageSelector />
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-14 bg-background border-r border-border flex flex-col items-center py-4 gap-4 shrink-0">
          <button 
            onClick={() => setLeftTab('components')}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${leftTab === 'components' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'text-muted-foreground hover:bg-muted'}`}
            title="Components"
          >
            <span className="text-lg">⊕</span>
          </button>
          <button 
            onClick={() => setLeftTab('styles')}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${leftTab === 'styles' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'text-muted-foreground hover:bg-muted'}`}
            title="Site Styles"
          >
            <span className="text-lg">🎨</span>
          </button>
        </div>

        <div className="w-60 bg-card border-r border-border flex flex-col shrink-0 overflow-y-auto scrollbar-hide">
          {leftTab === 'components' ? (
            <>
              <div className="p-4 border-b border-border bg-background/50 sticky top-0 z-10">
                <h2 className="text-xs font-bold text-foreground uppercase tracking-widest">Library</h2>
              </div>
              
              <div className="p-2 space-y-4">
                {CATEGORIES.map((cat) => (
                  <div key={cat.name} className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider px-2 py-1 font-bold">{cat.name}</p>
                    <div className="grid grid-cols-1 gap-1">
                      {cat.types.map((type) => (
                        <button 
                          key={type} 
                          onClick={() => addNode(type as any)}
                          className="group w-full text-left px-3 py-2 rounded-lg hover:bg-primary/10 border border-transparent hover:border-primary/20 transition-all flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded bg-muted flex items-center justify-center text-[10px] group-hover:bg-primary group-hover:text-primary-foreground transition-colors uppercase font-bold">
                              {type[0]}
                            </div>
                            <span className="text-[11px] font-medium text-foreground capitalize">{type.replace('-', ' ')}</span>
                          </div>
                          <span className="text-primary opacity-0 group-hover:opacity-100 transition-opacity font-bold">+</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="p-4 border-b border-border bg-background/50 sticky top-0 z-10">
                <h2 className="text-xs font-bold text-foreground uppercase tracking-widest">Global Styles</h2>
              </div>
              <div className="p-4 space-y-6">
                <div className="space-y-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Brand Colors</p>
                  {[
                    { label: 'Primary', key: 'primary' },
                    { label: 'Secondary', key: 'secondary' },
                    { label: 'Accent', key: 'accent' },
                    { label: 'Background', key: 'bg' },
                    { label: 'Text', key: 'text' },
                  ].map((c) => (
                    <div key={c.key} className="flex items-center justify-between">
                      <span className="text-[11px] text-foreground">{c.label}</span>
                      <input 
                        type="color" 
                        value={(site?.theme as any)?.[c.key] || '#000000'} 
                        onChange={(e) => handleThemeChange(c.key, e.target.value)}
                        className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                      />
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Typography</p>
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-1">Body Font</label>
                    <select 
                      value={site?.theme?.font || 'Inter'} 
                      onChange={(e) => handleThemeChange('font', e.target.value)}
                      className="w-full bg-background border border-border rounded px-2 py-1 text-xs outline-none"
                    >
                      {['Inter', 'Poppins', 'Roboto', 'Montserrat', 'Open Sans', 'Lato'].map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-1">Heading Font</label>
                    <select 
                      value={site?.theme?.headingFont || 'Inter'} 
                      onChange={(e) => handleThemeChange('headingFont', e.target.value)}
                      className="w-full bg-background border border-border rounded px-2 py-1 text-xs outline-none"
                    >
                      {['Inter', 'Playfair Display', 'Poppins', 'Raleway', 'Montserrat'].map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div
          className="flex-1 overflow-y-auto bg-muted/30 relative flex justify-center p-4"
          onClick={() => setSelectedId(null)}
        >
          <div 
            className="min-h-full bg-background shadow-2xl transition-all duration-300 overflow-x-hidden" 
            style={{ 
              width: viewport === 'desktop' ? '100%' : viewport === 'tablet' ? '768px' : '375px',
              maxWidth: '100%',
              ['--vibe-primary' as any]: site?.theme?.primary || '#7c3aed',
              ['--vibe-secondary' as any]: site?.theme?.secondary || '#06b6d4',
              ['--vibe-accent' as any]: site?.theme?.accent || '#f59e0b',
              ['--vibe-bg' as any]: site?.theme?.bg || '#ffffff',
              ['--vibe-text' as any]: site?.theme?.text || '#09090b',
              fontFamily: site?.theme?.font || 'Inter, sans-serif'
            }}
          >
            {nodes.length === 0 && (
              <div className="flex items-center justify-center h-96 text-muted-foreground text-sm border-2 border-dashed border-border rounded-xl m-4">
                Click a component to add it
              </div>
            )}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={nodes.map(n => n.id)} strategy={verticalListSortingStrategy}>
                {nodes.map((node) => (
                  <SortableCanvasNode
                    key={node.id}
                    node={node}
                    onUpdate={updateNode}
                    onDelete={deleteNode}
                    onCopy={copyNode}
                    selectedId={selectedId}
                    setSelectedId={setSelectedId}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        </div>

        {/* RIGHT: Inspector */}
        <div className="w-72 bg-card border-l border-border flex flex-col shrink-0 overflow-y-auto">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest px-4 pt-4 pb-2 font-bold">Inspector</p>
          <div className="px-4 pb-4">
            {selectedNode ? (
              <Inspector
                node={selectedNode}
                onChange={handleInspectorChange}
                onImageUpload={handleImageUpload}
              />
            ) : (
              <p className="text-muted-foreground text-xs font-medium">Select an element to edit</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
