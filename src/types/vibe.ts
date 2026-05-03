export interface VibeNode {
  id: string;
  type: 'section' | 'text' | 'image' | 'button' | 'divider' | 'spacer' | 'hero' | 'form' | 'video' | 'gallery' | 'testimonial' | 'social-links' | 'card' | 'two-columns' | 'navbar' | 'footer';
  content?: string;
  src?: string;
  href?: string;
  alt?: string;
  props: {
    backgroundColor?: string;
    color?: string;
    fontSize?: string;
    fontWeight?: string;
    padding?: string;
    margin?: string;
    textAlign?: string;
    width?: string;
    maxWidth?: string;
    height?: string;
    lineHeight?: string;
    borderRadius?: string;
    borderWidth?: string;
    borderColor?: string;
    boxShadow?: string;
    opacity?: string;
    display?: string;
    flexDirection?: string;
    justifyContent?: string;
    alignItems?: string;
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
