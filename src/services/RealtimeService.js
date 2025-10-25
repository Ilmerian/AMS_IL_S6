import { supabase } from '../lib/supabaseClient'

export const RealtimeService = {
  onInsert({ table, filter, cb }) {
    const channel = supabase
      .channel(`realtime:${table}:${filter || 'all'}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table,
        ...(filter ? { filter } : {}),
      }, (payload) => cb?.(payload.new))
      .subscribe()
    return () => supabase.removeChannel(channel)
  },

  onUpdate({ table, filter, cb }) {
    const channel = supabase
      .channel(`realtime:${table}:${filter || 'all'}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table,
        ...(filter ? { filter } : {}),
      }, (payload) => cb?.(payload.new, payload.old))
      .subscribe()
    return () => supabase.removeChannel(channel)
  },

  onDelete({ table, filter, cb }) {
    const channel = supabase
      .channel(`realtime:${table}:${filter || 'all'}`)
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table,
        ...(filter ? { filter } : {}),
      }, (payload) => cb?.(payload.old))
      .subscribe()
    return () => supabase.removeChannel(channel)
  },
}
