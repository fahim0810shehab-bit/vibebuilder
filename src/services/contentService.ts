import { SiteData, VibePage } from '@/types/vibe';

const BASE = import.meta.env.VITE_API_BASE_URL;
const SLUG = import.meta.env.VITE_PROJECT_SLUG;
const KEY = import.meta.env.VITE_X_BLOCKS_KEY;

function getAuthToken(): string {
  const keys = [
    'access_token',
    'token', 
    'selise_access_token',
    'selise_token',
    'auth_token',
    'blocks_token'
  ];
  for (const key of keys) {
    const val = localStorage.getItem(key) || sessionStorage.getItem(key);
    if (val) {
      console.log('[AUTH] Found token in key:', key);
      return val;
    }
  }
  console.warn('[AUTH] No token found in storage');
  return '';
}

function parseRecord(record: any): SiteData {
  let pages: VibePage[] = [];
  // Support both PascalCase and snake_case for backward compatibility/flexibility
  const pagesRaw = record.Pages ?? record.pages;
  try {
    pages = typeof pagesRaw === 'string' ? JSON.parse(pagesRaw) : pagesRaw ?? [];
  } catch {
    pages = [];
  }
  
  return {
    id: record.id ?? record._id,
    user_id: record.UserId ?? record.user_id,
    username: record.Username ?? record.username,
    is_published: record.IsPublished ?? record.is_published ?? false,
    pages,
  };
}

export const contentService = {
  // FUNCTION 1 - getSiteByUserId(userId)
  async getByUserId(userId: string): Promise<SiteData | null> {
    try {
      const url = `${BASE}/api/content/v1/projects/${SLUG}/collections/websites/records?filter=UserId:eq:${userId}`;
      const res = await fetch(url, {
        headers: {
          'x-blocks-key': KEY,
          'Authorization': 'Bearer ' + getAuthToken()
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      console.log('[ContentService] Load response:', json);
      
      const records = json?.data?.records ?? json?.records ?? [];
      if (records.length === 0) return null;
      
      const data = parseRecord(records[0]);
      localStorage.setItem(`vibe_site_${userId}`, JSON.stringify(data));
      return data;
    } catch (err) {
      console.warn('[ContentService] getByUserId API failed', err);
      const fb = localStorage.getItem(`vibe_site_${userId}`);
      return fb ? JSON.parse(fb) : null;
    }
  },

  // FUNCTION 2 - getSiteByUsername(username)
  async getByUsername(username: string): Promise<SiteData | null> {
    try {
      const url = `${BASE}/api/content/v1/projects/${SLUG}/collections/websites/records?filter=Username:eq:${username}`;
      const res = await fetch(url, {
        headers: {
          'x-blocks-key': KEY
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      console.log('[ContentService] Load response (public):', json);
      
      const records = json?.data?.records ?? json?.records ?? [];
      if (records.length === 0) return null;
      
      return parseRecord(records[0]);
    } catch (err) {
      console.warn('[ContentService] getByUsername API failed', err);
      return null;
    }
  },

  // FUNCTION 3 - createSite(siteData)
  async create(siteData: Omit<SiteData, 'id'>): Promise<string> {
    console.log('[ContentService] Saving to Selise (Create)...', siteData.user_id);
    const body = {
      UserId: siteData.user_id,
      Username: siteData.username,
      IsPublished: siteData.is_published,
      Pages: JSON.stringify(siteData.pages)
    };
    
    const url = `${BASE}/api/content/v1/projects/${SLUG}/collections/websites/records`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'x-blocks-key': KEY,
        'Authorization': 'Bearer ' + getAuthToken(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
    });
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    console.log('[ContentService] Save response:', json);
    
    const record = json?.data ?? json;
    const recordId = record.id ?? record._id;
    
    // Save to localStorage as backup
    localStorage.setItem(`vibe_site_${siteData.user_id}`, JSON.stringify({ ...siteData, id: recordId }));
    return recordId;
  },

  // FUNCTION 4 - updateSite(recordId, siteData)
  async update(recordId: string, siteData: Partial<SiteData> & { user_id: string }): Promise<void> {
    console.log('[ContentService] Saving to Selise (Update)...', siteData.user_id);
    const body = {
      IsPublished: siteData.is_published,
      Pages: JSON.stringify(siteData.pages)
    };
    
    const url = `${BASE}/api/content/v1/projects/${SLUG}/collections/websites/records/${recordId}`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'x-blocks-key': KEY,
        'Authorization': 'Bearer ' + getAuthToken(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
    });
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    console.log('[ContentService] Save response:', json);
    
    // Save to localStorage as backup
    const current = localStorage.getItem(`vibe_site_${siteData.user_id}`);
    const updated = current ? { ...JSON.parse(current), ...siteData } : siteData;
    localStorage.setItem(`vibe_site_${siteData.user_id}`, JSON.stringify(updated));
  },

  // FUNCTION 5 - saveSiteData(siteData)
  async saveSiteData(siteData: SiteData): Promise<void> {
    console.log('[ContentService] saveSiteData called:', siteData);
    console.log('[ContentService] token:', getAuthToken());
    console.log('[ContentService] BASE:', BASE, 'SLUG:', SLUG);
    
    try {
      // First try to find existing record
      const existing = await this.getByUserId(siteData.user_id);
      
      if (existing && existing.id) {
        await this.update(existing.id, siteData);
      } else {
        await this.create(siteData);
      }
    } catch (err) {
      console.error('[ContentService] saveSiteData failed:', err);
      // Always save to localStorage as backup regardless
      localStorage.setItem(`vibe_site_${siteData.user_id}`, JSON.stringify(siteData));
      localStorage.setItem(`vibe_user_${siteData.username}`, JSON.stringify(siteData));
    }
  },

  // Alias for backward compatibility in components
  async getSiteByUserId(userId: string) { return this.getByUserId(userId); },
  async getSiteByUsername(username: string) { return this.getByUsername(username); },
};
