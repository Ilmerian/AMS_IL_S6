// src/services/RealtimeService.js
import { supabase } from '../lib/supabaseClient'

function resubscribeWithBackoff(makeChannel, attempt = 0) {
  const maxDelay = 15000
  const delay = Math.min(1000 * Math.pow(2, attempt), maxDelay)
  const channel = makeChannel()

  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      attempt = 0
    } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED' || status === 'TIMED_OUT') {
      console.warn(`[rt] ${status}, retry in ${delay}ms`)
      setTimeout(() => resubscribeWithBackoff(makeChannel, attempt + 1), delay)
    }
  })

  return () => {
    try { channel.unsubscribe() }
    catch (error) { console.error('[rt] unsubscribe error:', error) }
  }
}

export const RealtimeService = {
  onInsert({ table, cb }) {
    return resubscribeWithBackoff(() =>
      supabase
        .channel(`ins_${table}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table }, cb)
    )
  },
  onUpdate({ table, cb }) {
    return resubscribeWithBackoff(() =>
      supabase
        .channel(`upd_${table}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table }, cb)
    )
  },
  onDelete({ table, cb }) {
    return resubscribeWithBackoff(() =>
      supabase
        .channel(`del_${table}`)
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table }, cb)
    )
  },
}
