// src/repositories/ChatRepository.js
import { supabase } from '../lib/supabaseClient';
import { ChatMessage } from '../models/ChatMessage';

export const ChatRepository = {
  async listByRoom(roomId, { limit = 50, before } = {}) {
    let query = supabase
      .from('chat_messages')
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
      .select('*, users(username)')
      .single();
    if (error) throw error;
    return ChatMessage.fromRow(row);
  },

  onNewMessage(roomId, callback) {
    const numRoomId = Number(roomId);
    console.log(`🎯 Subscribing to chat messages for room ${numRoomId}`);

    let retryCount = 0;
    const maxRetries = 3;

    const setupSubscription = () => {
      const channel = supabase
        .channel(`room:${numRoomId}:chat`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `room_id=eq.${numRoomId}`,
          },
          async (payload) => {
            try {
              console.log('📨 New message received via subscription:', payload);
              const msgRow = payload.new;
              let username = null;
              
              if (msgRow.user_id) {
                const { data: userData } = await supabase
                  .from('users')
                  .select('username')
                  .eq('user_id', msgRow.user_id)
                  .single();
                username = userData?.username;
              }

              const message = ChatMessage.fromRow({
                ...msgRow,
                users: username ? { username } : null
              });

              console.log('✅ Processed message for callback:', message);
              callback?.(message);
            } catch (e) {
              console.error('[ChatRepository.onNewMessage] callback failed:', e?.message || e);
            }
          },
        )
        .subscribe((status) => {
          console.log(`📡 Subscription status for room ${numRoomId}:`, status);
          
          if (status === 'SUBSCRIBED') {
            console.log('✅ Successfully subscribed to chat messages');
            retryCount = 0; 
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Channel error, attempting to resubscribe...');
            if (retryCount < maxRetries) {
              retryCount++;
              console.log(`🔄 Retry attempt ${retryCount}/${maxRetries}`);
              setTimeout(() => {
                if (!_cancelled) {
                  console.log('🔄 Reconnecting subscription...');
                  setupSubscription();
                }
              }, 2000 * retryCount);
            } else {
              console.error('❌ Max retry attempts reached');
            }
          } else if (status === 'CLOSED') {
            console.log('🔴 Channel closed');
          }
        });

      return channel;
    };

    let channel = setupSubscription();
    let _cancelled = false;

    return () => {
      _cancelled = true;
      console.log(`🔴 Unsubscribing from room:${numRoomId}:chat`);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
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
    const numRoomId = Number(roomId);
    console.log(`🎯 Subscribing to message deletions for room ${numRoomId}`);

    const channel = supabase
      .channel(`room:${numRoomId}:chat-delete`)
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${numRoomId}`,
        },
        (payload) => {
          try {
            console.log('🗑️ Message deleted:', payload);
            callback?.(ChatMessage.fromRow(payload.old));
          } catch (e) {
            console.error('[ChatRepository.onDeleteMessage] callback failed:', e?.message || e);
          }
        },
      )
      .subscribe((status) => {
        console.log(`📡 Delete subscription status for room ${numRoomId}:`, status);
      });

    return () => {
      console.log(`🔴 Unsubscribing from room:${numRoomId}:chat-delete`);
      supabase.removeChannel(channel);
    };
  },
};