// src/repositories/ChatRepository.js
import { supabase } from '../lib/supabaseClient';
import { ChatMessage } from '../models/ChatMessage';

export const ChatRepository = {
  async listByRoom(roomId, { limit = 50 } = {}) {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(limit);
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
      .select()
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
        (payload) => {
          try {
            callback?.(ChatMessage.fromRow(payload.new));
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
