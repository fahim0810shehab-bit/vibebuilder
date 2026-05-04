const BASE = import.meta.env.VITE_API_BASE_URL;
const SLUG = import.meta.env.VITE_PROJECT_SLUG;
const KEY = import.meta.env.VITE_X_BLOCKS_KEY;
const GQL = `${BASE}/dgs/v1/${SLUG}/graphql`;

const getToken = (): string =>
  localStorage.getItem('access_token') ||
  localStorage.getItem('token') ||
  localStorage.getItem('selise_access_token') || '';

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
  async getSiteByUserId(userId: string): Promise<any | null> {
    const data = await gql(`
      query($filter: Website_bool_exp) {
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
    if (!record) {
      const local = localStorage.getItem('vibe_' + userId);
      return local ? JSON.parse(local) : null;
    }

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

    localStorage.setItem('vibe_' + userId, JSON.stringify(site));
    return site;
  },

  async getSiteByUsername(username: string): Promise<any | null> {
    const data = await gql(`
      query($filter: Website_bool_exp) {
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
      const local = localStorage.getItem('vibe_user_' + username);
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
    // Always save locally first
    localStorage.setItem('vibe_' + site.user_id, JSON.stringify(site));
    localStorage.setItem('vibe_user_' + site.username, JSON.stringify(site));

    const pagesJson = JSON.stringify(site.pages);

    if (site.itemId) {
      // UPDATE existing record
      await gql(`
        mutation($ItemId: String!, $Pages: String!, $IsPublished: Boolean!, $Username: String!, $Title: String, $HomePageId: String) {
          updateWebsite(
            ItemId: $ItemId
            Pages: $Pages
            IsPublished: $IsPublished
            Username: $Username
            Title: $Title
            HomePageId: $HomePageId
          ) {
            ItemId
          }
        }
      `, {
        ItemId: site.itemId,
        Pages: pagesJson,
        IsPublished: site.is_published ?? false,
        Username: site.username,
        Title: site.title || '',
        HomePageId: site.homePageId || ''
      });
    } else {
      // CREATE new record
      await gql(`
        mutation($UserId: String!, $Username: String!, $IsPublished: Boolean!, $Pages: String!, $Title: String, $HomePageId: String) {
          createWebsite(
            UserId: $UserId
            Username: $Username
            IsPublished: $IsPublished
            Pages: $Pages
            Title: $Title
            HomePageId: $HomePageId
          ) {
            ItemId
          }
        }
      `, {
        UserId: site.user_id,
        Username: site.username,
        IsPublished: site.is_published ?? false,
        Pages: pagesJson,
        Title: site.title || '',
        HomePageId: site.homePageId || ''
      });
    }

    console.log('[DGS] Site saved successfully');
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
