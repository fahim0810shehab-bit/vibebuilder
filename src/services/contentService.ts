import { SiteData } from '@/types/vibe';

const GRAPHQL_URL = `${import.meta.env.VITE_API_BASE_URL}/dgs/v1/${import.meta.env.VITE_PROJECT_SLUG}/graphql`;
const KEY = import.meta.env.VITE_X_BLOCKS_KEY;

const getToken = (): string => {
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
    if (val) return val;
  }
  return '';
};

const gqlHeaders = () => ({
  'Content-Type': 'application/json',
  'x-blocks-key': KEY,
  'Authorization': `Bearer ${getToken()}`
});

const publicHeaders = () => ({
  'Content-Type': 'application/json',
  'x-blocks-key': KEY
});

async function graphql(query: string, variables: any, isPublic = false) {
  const res = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: isPublic ? publicHeaders() : gqlHeaders(),
    body: JSON.stringify({ query, variables })
  });
  
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json.errors) {
    console.warn('[GQL Errors]', json.errors);
    throw new Error(json.errors[0]?.message || 'GraphQL Error');
  }
  return json.data;
}

function mapRecord(record: any): SiteData {
  return {
    id: record.id,
    user_id: record.UserId,
    username: record.Username,
    is_published: record.IsPublished,
    pages: typeof record.Pages === 'string' ? JSON.parse(record.Pages) : record.Pages || []
  };
}

export const contentService = {
  // FUNCTION 1 - getSiteByUserId(userId)
  async getByUserId(userId: string): Promise<SiteData | null> {
    try {
      const data = await graphql(`
        query GetSiteByUserId($userId: String!) {
          Website(where: {UserId: {_eq: $userId}}, limit: 1) {
            id
            UserId
            Username
            IsPublished
            Pages
          }
        }
      `, { userId });

      const record = data?.Website?.[0];
      if (!record) return null;

      const site = mapRecord(record);
      localStorage.setItem('vibe_site_' + userId, JSON.stringify(site));
      return site;
    } catch (err) {
      console.warn('[GQL] getByUserId failed:', err);
      const local = localStorage.getItem('vibe_site_' + userId);
      return local ? JSON.parse(local) : null;
    }
  },

  // FUNCTION 2 - getSiteByUsername(username)
  async getByUsername(username: string): Promise<SiteData | null> {
    try {
      const data = await graphql(`
        query GetSiteByUsername($username: String!) {
          Website(where: {Username: {_eq: $username}}, limit: 1) {
            id
            UserId
            Username
            IsPublished
            Pages
          }
        }
      `, { username }, true);

      const record = data?.Website?.[0];
      if (!record) return null;

      return mapRecord(record);
    } catch (err) {
      console.warn('[GQL] getByUsername failed:', err);
      return null;
    }
  },

  // FUNCTION 3 - createSite(siteData)
  async create(siteData: Omit<SiteData, 'id'>): Promise<string> {
    const data = await graphql(`
      mutation CreateSite($object: Website_insert_input!) {
        insert_Website_one(object: $object) {
          id
        }
      }
    `, {
      object: {
        UserId: siteData.user_id,
        Username: siteData.username,
        IsPublished: siteData.is_published,
        Pages: JSON.stringify(siteData.pages)
      }
    });

    const id = data?.insert_Website_one?.id;
    localStorage.setItem('vibe_site_' + siteData.user_id, JSON.stringify({ ...siteData, id }));
    return id;
  },

  // FUNCTION 4 - updateSite(recordId, siteData)
  async update(recordId: string, siteData: Partial<SiteData> & { user_id: string }): Promise<void> {
    const object: any = {};
    if (siteData.is_published !== undefined) object.IsPublished = siteData.is_published;
    if (siteData.pages !== undefined) object.Pages = JSON.stringify(siteData.pages);
    if (siteData.username !== undefined) object.Username = siteData.username;

    await graphql(`
      mutation UpdateSite($id: uuid!, $object: Website_set_input!) {
        update_Website_by_pk(pk_columns: {id: $id}, _set: $object) {
          id
        }
      }
    `, { id: recordId, object });

    // Sync localStorage
    const current = localStorage.getItem('vibe_site_' + siteData.user_id);
    const updated = current ? { ...JSON.parse(current), ...siteData } : siteData;
    localStorage.setItem('vibe_site_' + siteData.user_id, JSON.stringify(updated));
  },

  // FUNCTION 5 - saveSiteData(siteData) - High level wrapper
  async saveSiteData(siteData: SiteData): Promise<void> {
    localStorage.setItem('vibe_site_' + siteData.user_id, JSON.stringify(siteData));
    localStorage.setItem('vibe_user_' + siteData.username, JSON.stringify(siteData));

    try {
      const existing = await this.getByUserId(siteData.user_id);
      if (existing?.id) {
        await this.update(existing.id, siteData);
      } else {
        await this.create(siteData);
      }
    } catch (err) {
      console.warn('[GQL] saveSiteData failed:', err);
    }
  },

  // Aliases for compatibility
  async getSiteByUserId(userId: string) { return this.getByUserId(userId); },
  async getSiteByUsername(username: string) { return this.getByUsername(username); },
};
