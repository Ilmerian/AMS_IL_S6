// src/services/StorageService.js
import { supabase } from '../lib/supabaseClient'

const BUCKET = 'avatars'

function fileExt(name=''){ return name.split('.').pop()?.toLowerCase() || 'png' }
function slug(s=''){ return String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'') }

export const StorageService = {
  async uploadAvatar({ userId, file }) {
    if (!userId) throw new Error('No userId')
    if (!file) throw new Error('No file')

    const allowed = ['image/png','image/jpeg','image/webp','image/gif']
    if (!allowed.includes(file.type)) throw new Error('Unsupported file type')
    const max = 3 * 1024 * 1024
    if (file.size > max) throw new Error('File is too large')

    const ext = fileExt(file.name)
    const key = `${userId}/${Date.now()}-${slug(file.name || 'avatar')}.${ext}`

    const { data, error } = await supabase.storage.from(BUCKET).upload(key, file, {
      cacheControl: '3600',
      upsert: false,
    })
    if (error) throw error
    return data?.path
  },

  async remove({ path }) {
    if (!path) return
    const { error } = await supabase.storage.from(BUCKET).remove([path])
    if (error) throw error
    return true
  },

  publicUrl(path) {
    if (!path) return null
    return supabase.storage.from(BUCKET).getPublicUrl(path)?.data?.publicUrl || null
  },

  async signedUrl(path, seconds = 60 * 60 * 24) {
    if (!path) return null
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, seconds)
    if (error) throw error
    return data?.signedUrl || null
  },
}
