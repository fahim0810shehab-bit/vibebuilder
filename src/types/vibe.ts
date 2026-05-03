export interface VibeNode {
  id: string;
  type: 'section' | 'text' | 'image' | 'button' | 'divider' | 'spacer' | 'hero' | 'form';
  content?: string;
  src?: string;
  href?: string;
  props: {
    backgroundColor?: string;
    color?: string;
    fontSize?: string;
    fontWeight?: string;
    padding?: string;
    margin?: string;
    textAlign?: string;
    width?: string;
    height?: string;
    borderRadius?: string;
    gap?: string;
    [key: string]: any;
  };
  children: VibeNode[];
}

export interface VibePage {
  id: string;
  name: string;
  path: string;
  rootNode: VibeNode;
}

export interface SiteData {
  id?: string;
  user_id: string;
  username: string;
  is_published: boolean;
  pages: VibePage[];
}
