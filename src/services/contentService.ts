import { SiteData, VibePage } from '@/types/vibe';

const BASE = import.meta.env.VITE_API_BASE_URL;
const SLUG = import.meta.env.VITE_PROJECT_SLUG;
const KEY = import.meta.env.VITE_X_BLOCKS_KEY;

const LS_KEY = 'vibebuilder_site_data';

function getToken(): string {
  // Selise Construct stores access token via zustand persist in 'auth-storage'
  try {
    const raw = localStorage.getItem('auth-storage');
    if (raw) {
      const parsed = JSON.parse(raw);
      const token = parsed?.state?.accessToken;
      if (token) return token;
    }
  } catch {
    // ignore
  }
  return localStorage.getItem('access_token') ?? '';
}

function saveFallback(data: SiteData): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

function loadFallback(): SiteData | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
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
      const token = getToken();
      const url = `${BASE}/api/content/v1/projects/${SLUG}/collections/websites/records?filter=user_id:eq:${userId}`;
      const res = await fetch(url, {
        headers: {
          'x-blocks-key': KEY,
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const records = json?.data ?? json?.records ?? json?.items ?? json ?? [];
      const arr = Array.isArray(records) ? records : [records];
      if (arr.length === 0) return null;
      const data = parseRecord(arr[0]);
      saveFallback(data);
      return data;
    } catch (err) {
      console.warn('[contentService] getByUserId API failed, falling back to localStorage', err);
      return loadFallback();
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
      return parseRecord(arr[0]);
    } catch (err) {
      console.warn('[contentService] getByUsername API failed', err);
      // For public route, try localStorage as last resort
      const fb = loadFallback();
      if (fb && fb.username === username) return fb;
      return null;
    }
  },

  async create(payload: Omit<SiteData, 'id'>): Promise<SiteData> {
    const token = getToken();
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
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const record = json?.data ?? json;
      const data = parseRecord(record);
      saveFallback(data);
      return data;
    } catch (err) {
      console.warn('[contentService] create API failed, saving to localStorage only', err);
      const fallback: SiteData = { ...payload, id: `local_${Date.now()}` };
      saveFallback(fallback);
      return fallback;
    }
  },

  async update(id: string, payload: { is_published: boolean; pages: VibePage[] }): Promise<void> {
    const token = getToken();
    const body = {
      is_published: payload.is_published,
      pages: JSON.stringify(payload.pages),
    };
    // Always save to localStorage immediately
    const existing = loadFallback();
    if (existing) {
      saveFallback({ ...existing, ...payload });
    }
    try {
      const url = `${BASE}/api/content/v1/projects/${SLUG}/collections/websites/records/${id}`;
      const res = await fetch(url, {
        method: 'PUT',
        headers: {
          'x-blocks-key': KEY,
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      console.warn('[contentService] update API failed, localStorage saved as backup', err);
    }
  },
};
