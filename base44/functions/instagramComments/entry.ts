import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const IG_API = 'https://graph.instagram.com/v21.0';

async function igFetch(path: string) {
  const res = await fetch(`${IG_API}${path}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Instagram API ${res.status}`);
  }
  return res.json();
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('instagram');
    const token = `access_token=${encodeURIComponent(accessToken)}`;

    // 1. Get user profile
    const profile = await igFetch(`/me?fields=id,username&${token}`);

    // 2. Get recent media (limit 12)
    const mediaRes = await igFetch(
      `/${profile.id}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp&limit=12&${token}`
    );
    const mediaList = mediaRes.data || [];

    // 3. Fetch comments for each media in parallel
    const withComments = await Promise.all(
      mediaList.map(async (m: any) => {
        try {
          const commentsRes = await igFetch(
            `/${m.id}/comments?fields=id,username,text,timestamp,like_count&limit=50&${token}`
          );
          return {
            id: m.id,
            caption: m.caption || '',
            media_type: m.media_type,
            media_url: m.media_url || null,
            thumbnail_url: m.thumbnail_url || null,
            permalink: m.permalink,
            timestamp: m.timestamp,
            comments: (commentsRes.data || []).map((c: any) => ({
              id: c.id,
              username: c.username,
              text: c.text,
              timestamp: c.timestamp,
              like_count: c.like_count || 0,
            })),
          };
        } catch (e) {
          return {
            id: m.id,
            caption: m.caption || '',
            media_type: m.media_type,
            media_url: m.media_url || null,
            thumbnail_url: m.thumbnail_url || null,
            permalink: m.permalink,
            timestamp: m.timestamp,
            comments: [],
          };
        }
      })
    );

    return Response.json({
      ok: true,
      profile: { id: profile.id, username: profile.username },
      media: withComments,
    });
  } catch (error) {
    console.error('instagramComments error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}