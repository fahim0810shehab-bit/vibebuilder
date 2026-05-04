const BASE = import.meta.env.VITE_API_BASE_URL;
const SLUG = import.meta.env.VITE_PROJECT_SLUG;
const KEY = import.meta.env.VITE_X_BLOCKS_KEY;
const GQL = `${BASE}/dgs/v1/${SLUG}/graphql`;

// STEP 1 - Debug localStorage keys
if (typeof window !== 'undefined') {
  console.log('[DEBUG] All localStorage keys:');
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      console.log(key, ':', localStorage.getItem(key)?.substring(0, 50));
    }
  }
}

const getToken = (): string =>
  localStorage.getItem('access_token') ||
  localStorage.getItem('token') ||
  localStorage.getItem('selise_access_token') ||
  localStorage.getItem('selise_token') ||
  localStorage.getItem('auth_token') ||
  localStorage.getItem('blocks_token') || '';

const authHeaders = () => ({
  'Content-Type': 'application/json',
  'x-blocks-key': KEY,
  'Authorization': `Bearer ${getToken()}`
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
      console.warn('[DGS Error]', json.errors);
    }
    return json.data;
  } catch (err) {
    console.error('[DGS Failed]', err);
    return null;
  }
}

export const contentService = {
  async getSiteByUserId(userId: string): Promise<any> {
    // Check localStorage first for instant load
    const localKey = 'vibe_site_' + userId;
    const localData = localStorage.getItem(localKey) || localStorage.getItem('vibe_' + userId);
    
    // Try Selise API
    try {
      const data = await gql(`
        query GetWebsiteByUserId($filter: Website_bool_exp) {
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
      `, { filter: { UserId: { _eq: userId } } });

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
            try { return JSON.parse(record.Pages || '[]'); }
            catch { return []; }
          })()
        };
        // Update localStorage with latest from Selise
        localStorage.setItem(localKey, JSON.stringify(site));
        localStorage.setItem('vibe_site_user_' + site.username, JSON.stringify(site));
        return site;
      }
    } catch (err) {
      console.warn('[LOAD] Selise failed, using localStorage', err);
    }

    // Fall back to localStorage
    if (localData) {
      console.log('[LOAD] Using localStorage data');
      return JSON.parse(localData);
    }

    return null;
  },

  async getSiteByUsername(username: string): Promise<any | null> {
    const data = await gql(`
      query GetWebsiteByUsername($filter: Website_bool_exp) {
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
    `, { filter: { Username: { _eq: username } } }, true);

    const record = data?.Website?.[0];
    if (!record) {
      const local = localStorage.getItem('vibe_site_user_' + username) || localStorage.getItem('vibe_user_' + username);
      return local ? JSON.parse(local) : null;
    }

    return {
      itemId: record.ItemId,
      user_id: record.UserId,
      username: record.Username,
      is_published: record.IsPublished,
      title: record.Title || '',
      pages: (() => {
        try { return JSON.parse(record.Pages || '[]'); }
        catch { return []; }
      })()
    };
  },

  async saveSiteData(site: any): Promise<void> {
    // Save to localStorage IMMEDIATELY - never lose data
    const siteToSave = { ...site };
    localStorage.setItem('vibe_site_' + site.user_id, JSON.stringify(siteToSave));
    localStorage.setItem('vibe_site_user_' + site.username, JSON.stringify(siteToSave));
    console.log('[SAVE] Saved to localStorage:', site.user_id);

    // Then try Selise API
    try {
      const pagesJson = JSON.stringify(site.pages);
      if (site.itemId) {
        // UPDATE existing record using update_Website (returning block)
        const data = await gql(`
          mutation UpdateWebsite($ItemId: String!, $changes: Website_set_input!) {
            update_Website(
              where: { ItemId: { _eq: $ItemId } }
              _set: $changes
            ) {
              returning { 
                ItemId 
              }
            }
          }
        `, {
          ItemId: site.itemId,
          changes: {
            IsPublished: site.is_published ?? false,
            Pages: pagesJson,
            Username: site.username,
            Title: site.title || '',
            HomePageId: site.homePageId || ''
          }
        });
        console.log('[SAVE] Updated in Selise:', data);
      } else {
        // CREATE new record using insert_Website_one
        const data = await gql(`
          mutation InsertWebsite($object: Website_insert_input!) {
            insert_Website_one(object: $object) {
              ItemId
              UserId
            }
          }
        `, {
          object: {
            UserId: site.user_id,
            Username: site.username,
            IsPublished: site.is_published ?? false,
            Pages: pagesJson,
            Title: site.title || '',
            HomePageId: site.homePageId || ''
          }
        });
        console.log('[SAVE] Created in Selise:', data);
        
        // Store the ItemId for future updates
        if (data?.insert_Website_one?.ItemId) {
          const updated = { 
            ...siteToSave, 
            itemId: data.insert_Website_one.ItemId 
          };
          localStorage.setItem('vibe_site_' + site.user_id, JSON.stringify(updated));
          localStorage.setItem('vibe_site_user_' + site.username, JSON.stringify(updated));
        }
      }
    } catch (err) {
      console.error('[SAVE] Selise API failed:', err);
      console.log('[SAVE] Data is safe in localStorage');
    }
  },

  createDefault(userId: string, username: string): any {
    return {
      user_id: userId,
      username,
      is_published: false,
      title: `${username}'s Website`,
      description: '',
      homePageId: 'home',
      pages: [{
        id: 'home',
        name: 'Home',
        path: '/home',
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
              type: 'text',
              content: `Welcome to ${username}'s site`,
              props: {
                fontSize: '48px',
                fontWeight: '800',
                color: '#09090b',
                marginBottom: '16px'
              },
              children: []
            },
            {
              id: 'sub',
              type: 'text', 
              content: 'Built with VibeBuilder',
              props: {
                fontSize: '20px',
                color: '#71717a'
              },
              children: []
            }
          ]
        }
      }]
    };
  },

  // Aliases for backward compatibility
  async getByUserId(userId: string) { return this.getSiteByUserId(userId); },
  async getByUsername(username: string) { return this.getSiteByUsername(username); },
  async create(site: any) { return this.saveSiteData(site); },
  async update(id: string, site: any) { return this.saveSiteData({ ...site, itemId: id }); }
};
