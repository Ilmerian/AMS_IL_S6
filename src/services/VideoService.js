// src/services/VideoService.js
import { supabase } from '../lib/supabaseClient'
import { VideoRepository } from '../repositories/VideoRepository'

/**
 * Service de gestion des vidéos
 */

export const VideoService = {
  getOrCreate: ({ url, title }) => VideoRepository.getOrCreate({ url, title }),
  getById: (id) => VideoRepository.getById(id),
  list: (opts) => VideoRepository.list(opts),

  async searchYoutube(query) {
    const q = query?.trim()
    if (!q) return []

    try {
      console.log('[VideoService] Searching YouTube for:', q)

      const { data, error } = await supabase.functions.invoke('youtube-search', {
        body: { query: q },
      })

      if (error) {
        console.error('[VideoService] Edge Function error:', error)
        throw error
      }

      console.log('[VideoService] Search results:', data?.results?.length || 0)
      return data?.results || []
    } catch (err) {
      console.error('[VideoService] YouTube search failed:', err)
      // Fallback to repository method if edge function fails
      try {
        console.log('[VideoService] Trying repository search as fallback...')
        const results = await VideoRepository.searchYoutube(query)
        return results
      } catch (fallbackError) {
        console.error('[VideoService] Fallback search also failed:', fallbackError)
        throw err // Throw original error
      }
    }
  },
}