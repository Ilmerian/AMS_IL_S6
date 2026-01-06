// src/services/RealtimeService.js
import { supabase } from "../lib/supabaseClient";

/**
 * Gestion des événements temps réel et de la présence
 */

export const RealtimeService = {
  onInsert({ table, cb }) {
    const channel = supabase
      .channel(`onInsert:${table}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table }, cb)
      .subscribe();

    return () => supabase.removeChannel(channel);
  },

  onUpdate({ table, cb }) {
    const channel = supabase
      .channel(`onUpdate:${table}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table }, cb)
      .subscribe();

    return () => supabase.removeChannel(channel);
  },

  onDelete({ table, cb }) {
    const channel = supabase
      .channel(`onDelete:${table}`)
      .on("postgres_changes", { event: "DELETE", schema: "public", table }, cb)
      .subscribe();

    return () => supabase.removeChannel(channel);
  },

  joinBroadcast(roomId, onEvent, onSubscribe) {
    const channelName = `room_broadcast:${roomId}`;
    const existingChannel = supabase.getChannels().find(c => c.topic === channelName);
    if (existingChannel) {
      supabase.removeChannel(existingChannel);
    }

    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false }
      }
    });

    channel
      .on('broadcast', { event: 'player_action' }, (payload) => {
        console.log(`[BROADCAST RECEIVED]`, payload);
        if (onEvent) onEvent(payload.payload);
      })
      .subscribe((status) => {
        console.log(`[BROADCAST STATUS] ${status} for room ${roomId}`);
        if (status === 'SUBSCRIBED' && onSubscribe) {
          onSubscribe();
        }
      });

    return {
      send: async (type, data) => {
        if (channel.state !== 'joined') {
          console.warn(`[BROADCAST] Channel not ready, state: ${channel.state}`);
          return;
        }

        try {
          await channel.send({
            type: 'broadcast',
            event: 'player_action',
            payload: { type, ...data },
          });
          console.log(`[BROADCAST SENT] ${type}`);
        } catch (error) {
          console.error(`[BROADCAST ERROR] Failed to send:`, error);
        }
      },
      unsubscribe: () => {
        console.log(`[BROADCAST] Unsubscribing from ${channelName}`);
        supabase.removeChannel(channel);
      },
    };
  },
  _presenceChannels: {},

  joinPresence(roomId, userMeta) {
    if (!roomId || !userMeta?.user_id) return () => {};

    // Reuse existing presence channel if already tracked
    const existing = this._presenceChannels[roomId];
    if (existing) return existing;

    const metadata = {
      user_id: userMeta.user_id,
      username: userMeta.username || 'Visitor',
      avatar_url: userMeta.avatar_url || null,
      joined_at: Date.now(),
    };

    const channel = supabase.channel(`presence:room_${roomId}`, {
      config: {
        presence: { key: metadata.user_id },
      },
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.track(metadata);
      }
    });

    this._presenceChannels[roomId] = channel;
    return channel;
  },

  subscribePresence(roomId, cb) {
    const channel = this._presenceChannels[roomId];
    if (!channel) return () => {};

    const handler = () => {
      const state = channel.presenceState();
      const users = Object.values(state).flat();
      cb?.({ users, count: users.length });
    };

    channel.on('presence', { event: 'sync' }, handler);
    // Return a cleanup that does nothing special; the channel is removed in leavePresence
    return () => {};
  },

  subscribeToRoomPresence(roomId, user, onSync) {
    if (!roomId || !user) return () => {};

    const userId = user.id || user.user_id;
    const metadata = {
        user_id: userId,
        username: user.username || user.user_metadata?.username || user.email?.split('@')[0] || 'Visiteur',
        avatar_url: user.avatar_url || user.user_metadata?.avatar_url,
        joined_at: Date.now(),
    };

    const channel = supabase.channel(`presence:room_${roomId}`, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users = Object.values(state).map(arr => arr[0]);
        if (onSync) onSync(users);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track(metadata);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  },
  
  getPresence: async (roomId) => {
    try {
      const channel = supabase.channel(`room:${roomId}:presence`);
      const state = channel.presenceState();
      const users = Object.values(state).flat();
      return users;
    } catch (error) {
      console.error('Error getting presence:', error);
      return [];
    }
  },
  async leavePresence(roomId) {
    const channel = this._presenceChannels[roomId];
    if (channel) {
      try {
        await supabase.removeChannel(channel);
      } catch (e) {
        console.warn('[RealtimeService] leavePresence error:', e);
      }
      delete this._presenceChannels[roomId];
    }
  },

  

};
