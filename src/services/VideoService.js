// src/services/VideoService.js
import { supabase } from '../lib/supabaseClient'
import { VideoRepository } from '../repositories/VideoRepository'

export const VideoService = {
  getOrCreate: ({ url, title }) => VideoRepository.getOrCreate({ url, title }),
  getById: (id) => VideoRepository.getById(id),
  list: (opts) => VideoRepository.list(opts),

  async searchYoutube(query) {
    const q = query?.trim()
    if (!q) return []

    const { data, error } = await supabase.functions.invoke('youtube-search', {
      body: { query: q },
    })

    if (error) {
      console.error('[VideoService.searchYoutube] error:', error)
      throw error
    }

    return data?.items || []
  },
}
