// src/utils/youtube.js

export function getYouTubeId(url) {
  if (!url) return null;
  
  try {
    const str = String(url).trim();
    if (!str) return null;
    if (/^[a-zA-Z0-9_-]{11}$/.test(str)) {
      return str;
    }

    const u = new URL(str);
    
    if (u.hostname.includes('youtube.com')) {
      if (u.pathname === '/watch') return u.searchParams.get('v');
      if (u.pathname.startsWith('/shorts/')) return u.pathname.split('/')[2];
      if (u.pathname.startsWith('/embed/')) return u.pathname.split('/')[2];
      if (u.pathname.startsWith('/v/')) return u.pathname.split('/')[2];
    }
    
    if (u.hostname === 'youtu.be') {
      return u.pathname.replace('/', '');
    }
  } catch (e) {
    console.warn('Invalid URL passed to getYouTubeId:', e);
    const clean = String(url).trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) {
      return clean;
    }
    return null;
  }
  return null;
}

export const toWatchUrl = (idOrUrl) => {
  if (!idOrUrl) return null;
  if (String(idOrUrl).match(/^https?:\/\//)) return idOrUrl;
  return `https://www.youtube.com/watch?v=${idOrUrl}`;
};

export const toEmbedUrl = (id) =>
  id ? `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1` : null;