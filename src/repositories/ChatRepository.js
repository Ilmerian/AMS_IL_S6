// src/repositories/ChatRepository.js
import { supabase } from '../lib/supabaseClient';
import { ChatMessage } from '../models/ChatMessage';

export const ChatRepository = {
  async listByRoom(roomId, { limit = 50, before } = {}) {

    let query = supabase
      .from('chat_messages')
      // ON MODIFIE ICI : on ajoute la jointure users(username)
      .select('*, users(username)')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false });

    if (before) {
      query = query.lt('id', before);
    }

    query = query.limit(limit);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(ChatMessage.fromRow).reverse();
  },

  async send(roomId, content) {
    const {
      data,
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) throw authError;
    const user = data?.user;
    if (!user?.id) {
      throw new Error('Not authenticated');
    }

    const payload = { room_id: roomId, user_id: user.id, content };
    const { data: row, error } = await supabase
      .from('chat_messages')
      .insert(payload)
      // ON MODIFIE ICI : on demande le username au retour de l'insertion
      .select('*, users(username)')
      .single();
    if (error) throw error;
    return ChatMessage.fromRow(row);
  },

  onNewMessage(roomId, callback) {
    const channel = supabase
      .channel(`room:${roomId}:chat`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          try {
            // Pour le realtime, le payload ne contient pas la jointure "users".
            // On doit récupérer le nom de l'utilisateur manuellement.
            const msgRow = payload.new;
            
            // Si l'utilisateur est déjà attaché (cas rare via realtime), on l'utilise
            if (!msgRow.users && msgRow.user_id) {
                const { data: userData } = await supabase
                    .from('users')
                    .select('username')
                    .eq('user_id', msgRow.user_id)
                    .single();
                
                // On attache manuellement les données pour que fromRow fonctionne
                msgRow.users = userData;
            }

            callback?.(ChatMessage.fromRow(msgRow));
          } catch (e) {
            console.error('[ChatRepository.onNewMessage] callback failed:', e?.message || e);
          }
        },
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  },

  async remove(id) {
    const {
      data,
      error: authError,
    } = await supabase.auth.getUser();
    if (authError) throw authError;
    const user = data?.user;
    if (!user?.id) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('chat_messages')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) throw error;
  },

  onDeleteMessage(roomId, callback) {
    const channel = supabase
      .channel(`room:${roomId}:chat`)
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          try {
            callback?.(ChatMessage.fromRow(payload.old));
          } catch (e) {
            console.error('[ChatRepository.onDeleteMessage] callback failed:', e?.message || e);
          }
        },
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  },
};