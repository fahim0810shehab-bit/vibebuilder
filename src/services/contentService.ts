const BASE = import.meta.env.VITE_API_BASE_URL;
const SLUG = import.meta.env.VITE_PROJECT_SLUG;
const KEY = import.meta.env.VITE_X_BLOCKS_KEY;
const GQL = `${BASE}/dgs/v1/${SLUG}/graphql`;

export const getAuthToken = (): string => {
  try {
    const raw = localStorage.getItem('auth-storage');
    if (raw) {
      const parsed = JSON.parse(raw);
      const token = parsed?.state?.accessToken;
      if (token) return token;
    }
  } catch (e) {
    // ignore
  }
  return localStorage.getItem('access_token') ||
    localStorage.getItem('token') ||
    localStorage.getItem('selise_access_token') ||
    localStorage.getItem('selise_token') ||
    localStorage.getItem('auth_token') ||
    localStorage.getItem('blocks_token') || '';
};

const authHeaders = () => ({
  'Content-Type': 'application/json',
  'x-blocks-key': KEY,
  'Authorization': `Bearer ${getAuthToken()}`
});

const publicHeaders = () => ({
  'Content-Type': 'application/json',
  'x-blocks-key': KEY
});

async function gql(query: string, variables: any, pub = false) {
  try {
    const res = await fetch(GQL, {
      method: 'POST',
      headers: pub ? publicHeaders() : authHeaders(),
      body: JSON.stringify({ query, variables })
    });
    const json = await res.json();
    if (json.errors) {
      console.error('[DGS GraphQL Errors]', JSON.stringify(json.errors, null, 2));
      return { errors: json.errors };
    }
    return { data: json.data };
  } catch (err) {
    console.error('[DGS Network/Fetch Failed]', err);
    return { errors: [err] };
  }
}

export const contentService = {
  async getSiteByUserId(userId: string): Promise<any> {
    const localKey = 'vibe_site_' + userId;
    const localData = localStorage.getItem(localKey);
    
    const { data, errors } = await gql(`
      query GetWebsiteByUserId($filter: Website_bool_exp) {
        Website(where: $filter, limit: 1) {
          ItemId UserId Username IsPublished Pages Title Description HomePageId LastUpdatedDate
        }
      }
    `, { filter: { UserId: { _eq: userId } } });

    const record = data?.Website?.[0];
    if (record) {
      const site = {
        itemId: record.ItemId,
        user_id: record.UserId,
        username: record.Username,
        is_published: record.IsPublished,
        title: record.Title || '',
        description: record.Description || '',
        homePageId: record.HomePageId || '',
        pages: (() => {
          try { return JSON.parse(record.Pages || '[]'); }
          catch { return []; }
        })()
      };
      
      // Merge Strategy: Only overwrite localStorage if API has actual pages
      // This prevents "Silent Overwrite" where a failed/empty API load wipes local draft
      if (site.pages.length > 0) {
        localStorage.setItem(localKey, JSON.stringify(site));
        localStorage.setItem('vibe_site_user_' + site.username, JSON.stringify(site));
      }
      return site;
    }

    if (localData) {
      console.log('[LOAD] Using cached LocalStorage data for:', userId);
      return JSON.parse(localData);
    }
    return null;
  },

  async getSiteByUsername(username: string, isPublic = true): Promise<any | null> {
    console.log('[PUBLIC] Loading site for:', username);

    // Try Selise Data Gateway first
    try {
      const { data } = await gql(`
        query GetPublicSite($filter: Website_bool_exp) {
          Website(where: $filter, limit: 1) {
            ItemId
            UserId
            Username
            IsPublished
            Pages
            Title
            Description
            HomePageId
          }
        }
      `, { 
        filter: { 
          Username: { _eq: username },
          IsPublished: { _eq: true }
        }
      }, isPublic);

      const record = data?.Website?.[0];
      
      if (record) {
        const site = {
          itemId: record.ItemId,
          user_id: record.UserId,
          username: record.Username,
          is_published: record.IsPublished,
          title: record.Title || '',
          homePageId: record.HomePageId || '',
          pages: (() => {
            try {
              const parsed = typeof record.Pages === 'string'
                ? JSON.parse(record.Pages)
                : record.Pages;
              return parsed || [];
            } catch (e) {
              console.error('[PUBLIC] Pages parse error:', e);
              return [];
            }
          })()
        };
        return site;
      }
    } catch (err) {
      console.warn('[PUBLIC] Selise failed:', err);
    }

    // Fallback to localStorage (helps during development)
    const local = localStorage.getItem('vibe_site_user_' + username);
    if (local) {
      const parsed = JSON.parse(local);
      if (!parsed.is_published) {
        return null;
      }
      return parsed;
    }

    return null;
  },

  async saveSiteData(site: any): Promise<any> {
    const siteToSave = { ...site };
    const pagesJson = JSON.stringify(site.pages);
    
    // 1. Immediate Local Save
    localStorage.setItem('vibe_site_' + site.user_id, JSON.stringify(siteToSave));
    localStorage.setItem('vibe_site_user_' + site.username, JSON.stringify(siteToSave));

    // 2. Remote Save
    if (site.itemId) {
      const { data, errors } = await gql(`
        mutation UpdateWebsite($ItemId: String!, $changes: Website_set_input!) {
          update_Website(where: { ItemId: { _eq: $ItemId } }, _set: $changes) {
            returning { ItemId }
          }
        }
      `, {
        ItemId: site.itemId,
        changes: {
          IsPublished: site.is_published ?? false,
          Pages: pagesJson,
          Username: site.username,
          Title: site.title || '',
          Description: site.description || '',
          HomePageId: site.homePageId || ''
        }
      });
      
      if (errors) {
        console.warn('[SAVE] Remote update failed, but draft is safe in localStorage');
      } else {
        console.log('[SAVE] Remote update success');
      }
    } else {
      const { data, errors } = await gql(`
        mutation InsertWebsite($object: Website_insert_input!) {
          insert_Website_one(object: $object) { ItemId UserId }
        }
      `, {
        object: {
          UserId: site.user_id,
          Username: site.username,
          IsPublished: site.is_published ?? false,
          Pages: pagesJson,
          Title: site.title || '',
          Description: site.description || '',
          HomePageId: site.homePageId || ''
        }
      });
      
      if (data?.insert_Website_one?.ItemId) {
        siteToSave.itemId = data.insert_Website_one.ItemId;
        localStorage.setItem('vibe_site_' + site.user_id, JSON.stringify(siteToSave));
        localStorage.setItem('vibe_site_user_' + site.username, JSON.stringify(siteToSave));
        console.log('[SAVE] Remote create success. ItemId:', siteToSave.itemId);
      }
    }
    return siteToSave;
  },

  createDefault(userId: string, username: string): any {
    return {
      user_id: userId,
      username,
      is_published: false,
      title: `${username}'s Website`,
      description: 'Created with VibeBuilder',
      homePageId: 'home',
      pages: [{
        id: 'home',
        name: 'Home',
        path: 'home',
        rootNode: {
          id: 'root',
          type: 'section',
          props: {
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#ffffff',
            padding: '40px 24px',
            textAlign: 'center'
          },
          children: [
            {
              id: 'h1',
              type: 'heading',
              content: `Welcome to ${username}'s site`,
              props: { fontSize: '48px', fontWeight: '800', color: '#09090b', marginBottom: '16px' },
              children: []
            },
            {
              id: 'sub',
              type: 'paragraph', 
              content: 'Click here to start editing your dream website.',
              props: { fontSize: '20px', color: '#71717a' },
              children: []
            }
          ]
        }
      }]
    };
  },

  async getByUserId(userId: string) { return this.getSiteByUserId(userId); },
  async getByUsername(username: string) { return this.getSiteByUsername(username); },
  async create(site: any) { return this.saveSiteData(site); },
  async update(id: string, site: any) { return this.saveSiteData({ ...site, itemId: id }); }
};

export async function testConnection(): Promise<void> {
  console.log('[DGS TEST] Testing connection...');
  console.log('[DGS TEST] URL:', GQL);
  console.log('[DGS TEST] Key:', KEY?.substring(0, 10) + '...');
  console.log('[DGS TEST] Token:', getAuthToken()?.substring(0, 20) + '...');

  const result = await gql(`
    query {
      Website(limit: 1) {
        ItemId
        UserId
        Username
        IsPublished
      }
    }
  `, {}, false);

  console.log('[DGS TEST] Result:', JSON.stringify(result, null, 2));
}
