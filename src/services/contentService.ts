import { SiteData, VibePage } from '@/types/vibe';

const BASE = import.meta.env.VITE_API_BASE_URL;
const SLUG = import.meta.env.VITE_PROJECT_SLUG;
const KEY = import.meta.env.VITE_X_BLOCKS_KEY;

function getAuthToken(): string {
  return (
    localStorage.getItem('access_token') ||
    localStorage.getItem('token') ||
    sessionStorage.getItem('access_token') ||
    ''
  );
}

function parseRecord(record: any): SiteData {
  let pages: VibePage[] = [];
  try {
    pages = typeof record.pages === 'string' ? JSON.parse(record.pages) : record.pages ?? [];
  } catch {
    pages = [];
  }
  return {
    id: record.id ?? record._id,
    user_id: record.user_id,
    username: record.username,
    is_published: record.is_published ?? false,
    pages,
  };
}

export const contentService = {
  async getByUserId(userId: string): Promise<SiteData | null> {
    try {
      const url = `${BASE}/api/content/v1/projects/${SLUG}/collections/websites/records?filter=user_id:eq:${userId}`;
      const res = await fetch(url, {
        headers: {
          'x-blocks-key': KEY,
          Authorization: `Bearer ${getAuthToken()}`,
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const records = json?.data ?? json?.records ?? json?.items ?? json ?? [];
      const arr = Array.isArray(records) ? records : [records];
      if (arr.length === 0) return null;
      const data = parseRecord(arr[0]);
      localStorage.setItem(`vibe_site_${userId}`, JSON.stringify(data));
      return data;
    } catch (err) {
      console.warn('getByUserId API failed', err);
      const fb = localStorage.getItem(`vibe_site_${userId}`);
      return fb ? JSON.parse(fb) : null;
    }
  },

  async getByUsername(username: string): Promise<SiteData | null> {
    try {
      const url = `${BASE}/api/content/v1/projects/${SLUG}/collections/websites/records?filter=username:eq:${username}`;
      const res = await fetch(url, {
        headers: {
          'x-blocks-key': KEY,
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const records = json?.data ?? json?.records ?? json?.items ?? json ?? [];
      const arr = Array.isArray(records) ? records : [records];
      if (arr.length === 0) return null;
      const data = parseRecord(arr[0]);
      localStorage.setItem(`vibe_site_user_${username}`, JSON.stringify(data));
      return data;
    } catch (err) {
      console.warn('getByUsername API failed', err);
      const fb = localStorage.getItem(`vibe_site_user_${username}`);
      return fb ? JSON.parse(fb) : null;
    }
  },

  async create(payload: Omit<SiteData, 'id'>): Promise<SiteData> {
    const body = {
      user_id: payload.user_id,
      username: payload.username,
      is_published: payload.is_published,
      pages: JSON.stringify(payload.pages),
    };
    try {
      const url = `${BASE}/api/content/v1/projects/${SLUG}/collections/websites/records`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'x-blocks-key': KEY,
          Authorization: `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const record = json?.data ?? json;
      const data = parseRecord(record);
      localStorage.setItem(`vibe_site_${payload.user_id}`, JSON.stringify(data));
      return data;
    } catch (err) {
      console.warn('create API failed', err);
      const fallback: SiteData = { ...payload, id: `local_${Date.now()}` };
      localStorage.setItem(`vibe_site_${payload.user_id}`, JSON.stringify(fallback));
      return fallback;
    }
  },

  async update(id: string, payload: { user_id?: string; is_published: boolean; pages: VibePage[] }): Promise<void> {
    const body = {
      is_published: payload.is_published,
      pages: JSON.stringify(payload.pages),
    };
    
    if (payload.user_id) {
      const fb = localStorage.getItem(`vibe_site_${payload.user_id}`);
      if (fb) {
        const parsed = JSON.parse(fb);
        localStorage.setItem(`vibe_site_${payload.user_id}`, JSON.stringify({ ...parsed, ...payload }));
      }
    }

    try {
      const url = `${BASE}/api/content/v1/projects/${SLUG}/collections/websites/records/${id}`;
      const res = await fetch(url, {
        method: 'PUT',
        headers: {
          'x-blocks-key': KEY,
          Authorization: `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      console.warn('update API failed', err);
    }
  },

  async saveSiteData(data: SiteData): Promise<void> {
    if (data.id && !data.id.startsWith('local_')) {
      await this.update(data.id, { user_id: data.user_id, is_published: data.is_published, pages: data.pages });
    } else {
      await this.create(data);
    }
  }
};
