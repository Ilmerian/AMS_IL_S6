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
    return data.map(ChatMessage.fromRow).reverse();
  },

  async send(roomId, content) {
    const { data: { user } } = await supabase.auth.getUser();
    const payload = { room_id: roomId, user_id: user?.id, content };
    const { data, error } = await supabase
      .from('chat_messages')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return ChatMessage.fromRow(data);
  },

  onNewMessage(roomId, callback) {
    const channel = supabase
      .channel(`room:${roomId}:chat`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` },
        (payload) => callback(ChatMessage.fromRow(payload.new))
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  },
};
