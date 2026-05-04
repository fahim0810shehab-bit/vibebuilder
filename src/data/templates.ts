import { SiteData, VibeNode } from '@/types/vibe';
import { v4 as uuidv4 } from 'uuid';

function createNode(type: VibeNode['type'], props: any = {}, content?: string, children: VibeNode[] = []): VibeNode {
  return {
    id: uuidv4(),
    type,
    props,
    content,
    children,
  };
}

const TEMPLATE_PORTFOLIO: Partial<SiteData> = {
  pages: [
    {
      id: uuidv4(),
      name: 'Home',
      path: 'home',
      rootNode: createNode('section', { padding: '0', backgroundColor: '#0f172a' }, undefined, [
        createNode('hero', { padding: '100px 20px', textAlign: 'center', backgroundColor: '#0f172a' }, undefined, [
          createNode('text', { fontSize: '4rem', fontWeight: '900', color: '#ffffff', marginBottom: '10px' }, 'John Doe'),
          createNode('text', { fontSize: '1.5rem', color: '#94a3b8', marginBottom: '30px' }, 'Full Stack Developer & UI Designer'),
          createNode('button', { backgroundColor: '#6366f1', color: '#ffffff', padding: '12px 30px', borderRadius: '50px', fontWeight: '600' }, 'View My Work'),
        ]),
        createNode('section', { padding: '80px 20px', backgroundColor: '#1e293b' }, undefined, [
          createNode('text', { fontSize: '2.5rem', fontWeight: '800', color: '#ffffff', textAlign: 'center', marginBottom: '50px' }, 'My Skills'),
          createNode('gallery', { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }, undefined, [
            createNode('card', { padding: '30px', backgroundColor: '#334155', borderRadius: '15px' }, undefined, [
              createNode('text', { fontSize: '1.5rem', fontWeight: '700', color: '#6366f1' }, 'Frontend'),
              createNode('text', { fontSize: '1rem', color: '#cbd5e1', marginTop: '10px' }, 'React, Next.js, Tailwind CSS'),
            ]),
            createNode('card', { padding: '30px', backgroundColor: '#334155', borderRadius: '15px' }, undefined, [
              createNode('text', { fontSize: '1.5rem', fontWeight: '700', color: '#6366f1' }, 'Backend'),
              createNode('text', { fontSize: '1rem', color: '#cbd5e1', marginTop: '10px' }, 'Node.js, PostgreSQL, Redis'),
            ]),
            createNode('card', { padding: '30px', backgroundColor: '#334155', borderRadius: '15px' }, undefined, [
              createNode('text', { fontSize: '1.5rem', fontWeight: '700', color: '#6366f1' }, 'Design'),
              createNode('text', { fontSize: '1rem', color: '#cbd5e1', marginTop: '10px' }, 'Figma, Adobe XD, Framer'),
            ]),
          ]),
        ]),
      ]),
    },
    { id: uuidv4(), name: 'Projects', path: 'projects', rootNode: createNode('section', { padding: '40px' }, undefined, [createNode('text', { fontSize: '2rem' }, 'My Projects')]) },
    { id: uuidv4(), name: 'Contact', path: 'contact', rootNode: createNode('section', { padding: '40px' }, undefined, [createNode('text', { fontSize: '2rem' }, 'Get In Touch')]) },
  ],
};

const TEMPLATE_BUSINESS: Partial<SiteData> = {
  pages: [
    {
      id: uuidv4(),
      name: 'Home',
      path: 'home',
      rootNode: createNode('section', { padding: '0' }, undefined, [
        createNode('navbar', { padding: '20px', display: 'flex', justifyContent: 'space-between' }, undefined, [
          createNode('text', { fontWeight: 'bold', fontSize: '1.5rem' }, 'VibeBiz'),
          createNode('button', { backgroundColor: '#2563eb', color: '#fff', padding: '8px 20px', borderRadius: '5px' }, 'Get Started'),
        ]),
        createNode('hero', { padding: '120px 20px', textAlign: 'center', backgroundColor: '#f8fafc' }, undefined, [
          createNode('text', { fontSize: '3.5rem', fontWeight: '800', color: '#1e293b' }, 'Scale Your Business Faster'),
          createNode('text', { fontSize: '1.25rem', color: '#64748b', marginTop: '20px', maxWidth: '800px', marginInline: 'auto' }, 'We provide the tools and expertise to help your company grow in the digital age.'),
          createNode('button', { backgroundColor: '#2563eb', color: '#fff', padding: '15px 40px', borderRadius: '8px', marginTop: '40px', fontSize: '1.1rem' }, 'Start Free Trial'),
        ]),
      ]),
    },
  ],
};

const TEMPLATE_BLOG: Partial<SiteData> = {
  pages: [
    {
      id: uuidv4(),
      name: 'Home',
      path: 'home',
      rootNode: createNode('section', { padding: '0' }, undefined, [
        createNode('hero', { padding: '80px 20px', backgroundColor: '#fff', borderBottom: '1px solid #e2e8f0' }, undefined, [
          createNode('text', { fontSize: '3rem', fontWeight: '800', textAlign: 'center' }, 'The Vibe Blog'),
          createNode('text', { fontSize: '1.2rem', color: '#64748b', textAlign: 'center', marginTop: '10px' }, 'Insights on technology, design, and life.'),
        ]),
        createNode('section', { padding: '60px 20px' }, undefined, [
          createNode('gallery', { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '30px' }, undefined, [
            createNode('card', { border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }, undefined, [
              createNode('image', { width: '100%', height: '200px', objectFit: 'cover' }, 'https://images.unsplash.com/photo-1498050108023-c5249f4df085'),
              createNode('section', { padding: '20px' }, undefined, [
                createNode('text', { fontSize: '1.5rem', fontWeight: '700' }, 'The Future of AI'),
                createNode('text', { fontSize: '0.9rem', color: '#64748b', marginTop: '10px' }, 'Exploring how artificial intelligence is changing the way we build software...'),
              ]),
            ]),
            createNode('card', { border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }, undefined, [
              createNode('image', { width: '100%', height: '200px', objectFit: 'cover' }, 'https://images.unsplash.com/photo-1555066931-4365d14bab8c'),
              createNode('section', { padding: '20px' }, undefined, [
                createNode('text', { fontSize: '1.5rem', fontWeight: '700' }, 'Mastering Tailwind'),
                createNode('text', { fontSize: '0.9rem', color: '#64748b', marginTop: '10px' }, 'A deep dive into utility-first CSS and how to build beautiful interfaces fast...'),
              ]),
            ]),
          ]),
        ]),
      ]),
    },
  ],
};

const TEMPLATE_MINIMAL: Partial<SiteData> = {
  pages: [
    {
      id: uuidv4(),
      name: 'Home',
      path: 'home',
      rootNode: createNode('section', { padding: '100px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }, undefined, [
        createNode('image', { width: '150px', height: '150px', borderRadius: '50%', marginBottom: '24px' }, 'https://i.pravatar.cc/300'),
        createNode('text', { fontSize: '2.5rem', fontWeight: '700' }, 'Alex River'),
        createNode('text', { fontSize: '1.1rem', color: '#64748b', marginTop: '8px' }, 'Photographer & Storyteller based in Iceland.'),
        createNode('social-links', { marginTop: '32px' }),
      ]),
    },
  ],
};

export const TEMPLATES = [
  { id: 'portfolio', name: 'Portfolio', description: 'Showcase your work and skills with a professional dark theme.', data: TEMPLATE_PORTFOLIO, thumbnail: 'https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=400' },
  { id: 'business', name: 'Business', description: 'Clean, professional landing page for your startup or company.', data: TEMPLATE_BUSINESS, thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400' },
  { id: 'blog', name: 'Blog', description: 'Modern grid layout for your articles and insights.', data: TEMPLATE_BLOG, thumbnail: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=400' },
  { id: 'minimal', name: 'Minimal', description: 'A simple, elegant bio page to connect your audience.', data: TEMPLATE_MINIMAL, thumbnail: 'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?w=400' },
];
