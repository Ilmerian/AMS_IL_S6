import { UserRepository } from '../repositories/UserRepository'
import { supabase } from '../lib/supabaseClient'

export const UserService = {
  async ensureProfilePublic({ username, email, avatarUrl, firstName, lastName } = {}) {
    const { data, error } = await supabase.rpc('ensure_profile_public', {
      p_username: username ?? null,
      p_email: email ?? null,
      p_avatar_url: avatarUrl ?? null,
      p_first_name: firstName ?? null,
      p_last_name: lastName ?? null,
    })
    if (error) throw error
    return data
  },

  async me() {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) throw error
    if (!user) return null

    const ensured = await UserService.ensureProfilePublic({
      username: user.user_metadata?.username || user.email?.split('@')[0],
      email: user.email ?? null,
      avatarUrl: user.user_metadata?.avatar_url ?? null,
      firstName: user.user_metadata?.first_name ?? null,
      lastName: user.user_metadata?.last_name ?? null,
    })
    if (ensured) return ensured

    return await UserRepository.getById(user.id)
  },

  async upsertProfile(partial) {
    return UserRepository.upsertProfile(partial)
  },
}
