import { describe, it, expect } from 'vitest'
import { getYouTubeId, toEmbedUrl, toWatchUrl } from '../youtube'

describe('getYouTubeId - Extraction d\'ID YouTube', () => {
  it('extrait l\'ID d\'une URL standard youtube.com/watch', () => {
    const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    expect(getYouTubeId(url)).toBe('dQw4w9WgXcQ')
  })

  it('extrait l\'ID d\'une URL youtu.be', () => {
    const url = 'https://youtu.be/dQw4w9WgXcQ'
    expect(getYouTubeId(url)).toBe('dQw4w9WgXcQ')
  })

  it('extrait l\'ID d\'une URL YouTube Shorts', () => {
    const url = 'https://youtube.com/shorts/dQw4w9WgXcQ'
    expect(getYouTubeId(url)).toBe('dQw4w9WgXcQ')
  })

  it('extrait l\'ID d\'une URL embed', () => {
    const url = 'https://www.youtube.com/embed/dQw4w9WgXcQ'
    expect(getYouTubeId(url)).toBe('dQw4w9WgXcQ')
  })

  it('retourne null pour une URL invalide', () => {
    expect(getYouTubeId('pas une url')).toBe(null)
  })

  it('retourne l\'ID si on passe directement un ID', () => {
    expect(getYouTubeId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })
})

describe('toEmbedUrl - Génération URL embed', () => {
  it('génère une URL embed valide', () => {
    expect(toEmbedUrl('dQw4w9WgXcQ'))
      .toBe('https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0&modestbranding=1')
  })

  it('retourne null si pas d\'ID', () => {
    expect(toEmbedUrl(null)).toBe(null)
  })
})

describe('toWatchUrl - Génération URL watch', () => {
  it('convertit un ID en URL watch', () => {
    expect(toWatchUrl('dQw4w9WgXcQ'))
      .toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
  })

  it('retourne l\'URL si c\'est déjà une URL', () => {
    const url = 'https://youtu.be/test123'
    expect(toWatchUrl(url)).toBe(url)
  })
})