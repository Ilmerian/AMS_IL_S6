// src/utils/youtube.js
export function getYouTubeId(url = '') {
  try {
    const u = new URL(url.trim());
    if (u.hostname.includes('youtube.com')) {
      if (u.pathname === '/watch') return u.searchParams.get('v');
      if (u.pathname.startsWith('/shorts/')) return u.pathname.split('/')[2];
    }
    if (u.hostname === 'youtu.be') {
      return u.pathname.replace('/', '');
    }
  } catch (e) {
    console.warn('[getYouTubeId] invalid url:', url);
    console.warn(e);
    return
  }
  return null;
}

export const toWatchUrl = (id) =>
  id ? `https://www.youtube.com/watch?v=${id}` : null;

export const toEmbedUrl = (id) =>
  id ? `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1` : null;
