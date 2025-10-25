 // src/services/AvatarService.js
 import { StorageService } from './StorageService'
 import { UserService } from './UserService'
 import { supabase } from '../lib/supabaseClient'

 const BUCKET_PUBLIC = true

 export const AvatarService = {
   async upload(file) {
     const { data: { user } } = await supabase.auth.getUser()
     if (!user) throw new Error('Unauthorized')

      try {
        await UserService.me()
      } catch (e) {
        console.warn('[AvatarService.upload] ensure profile failed, will try minimal upsert:', e?.message || e)
        const username =
          user.user_metadata?.username ||
          user.email?.split('@')[0] ||
          `user_${(user.id || '').slice(0, 8)}`
        await UserService.upsertProfile({
          user_id: user.id,
          username,
          email: user.email,
          avatar_url: null,
        })
      }
     const path = await StorageService.uploadAvatar({ userId: user.id, file })
     const url = BUCKET_PUBLIC ? StorageService.publicUrl(path) : await StorageService.signedUrl(path)

     await UserService.upsertProfile({
       user_id: user.id,
       avatar_url: url,
     })
    try {
      await supabase.auth.updateUser({ data: { avatar_url: url } })
    } catch (e) {
      console.warn('[AvatarService.upload] failed to update auth metadata:', e?.message || e)
    }

     return { url, path }
   },

   async remove(currentUrlOrPath) {
     const { data: { user } } = await supabase.auth.getUser()
     if (!user) throw new Error('Unauthorized')

     let path = null
     try {
       const u = new URL(currentUrlOrPath)
       const idx = u.pathname.indexOf('/avatars/')
       if (idx >= 0) path = u.pathname.slice(idx + '/avatars/'.length)
     } catch {
       path = currentUrlOrPath
     }

     if (path) {
       try { await StorageService.remove({ path }) } catch (e) {
         console.error('Failed to remove avatar from storage:', e)
       }
     }

     await UserService.upsertProfile({
       user_id: user.id,
       avatar_url: null,
     })
    try {
      await supabase.auth.updateUser({ data: { avatar_url: null } })
    } catch (e) {
      console.warn('[AvatarService.remove] failed to update auth metadata:', e?.message || e)
    }

     return true
   },
 }
