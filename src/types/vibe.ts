export interface VibeNode {
  id: string;
  type: 'section' | 'text' | 'image' | 'button' | 'divider' | 'spacer' | 'hero' | 'form' | 'video' | 'gallery' | 'testimonial' | 'social-links' | 'card' | 'two-columns' | 'navbar' | 'footer' | 'container' | 'three-columns' | 'grid' | 'heading' | 'paragraph' | 'rich-text' | 'bullet-list' | 'quote' | 'link' | 'newsletter' | 'feature' | 'pricing' | 'team' | 'stats' | 'faq' | 'icon';
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
  animation?: {
    type: 'none' | 'fadeIn' | 'slideUp' | 'slideLeft' | 'zoomIn' | 'bounce';
    duration: string;
    delay: string;
  };
  children: VibeNode[];
}

export interface VibePage {
  id: string;
  name: string;
  path: string;
  rootNode: VibeNode;
  seo?: {
    title: string;
    description: string;
    ogImage: string;
  };
}

export interface SiteData {
  id?: string;
  itemId?: string;
  user_id: string;
  username: string;
  is_published: boolean;
  pages: VibePage[];
  theme?: {
    primary: string;
    secondary: string;
    accent: string;
    bg: string;
    text: string;
    font: string;
    headingFont: string;
  };
}
