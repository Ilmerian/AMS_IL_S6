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

  /**
   * Legacy presence helpers (used on Rooms list)
   * joinPresence -> track current user for a room
   * subscribePresence -> listen to presence counts
   * leavePresence -> cleanup
   */
  joinPresence(roomId, userMetadata) {
    if (!roomId || !userMetadata?.user_id) return () => {};

    const channelKey = `presence:room_${roomId}`;
    const existing = this._presenceChannels[channelKey];
    if (existing) {
      // Update metadata if we already have a channel
      existing.metadata = userMetadata;
      return existing.unsubscribe;
    }

    const channel = supabase.channel(channelKey, {
      config: {
        presence: { key: userMetadata.user_id },
      },
    });

    const unsubscribe = () => {
      supabase.removeChannel(channel);
      delete this._presenceChannels[channelKey];
    };

    this._presenceChannels[channelKey] = { channel, unsubscribe, metadata: userMetadata };

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        try {
          await channel.track(userMetadata);
        } catch (e) {
          console.warn('[RealtimeService.joinPresence] track failed:', e);
        }
      }
    });

    return unsubscribe;
  },

  subscribePresence(roomId, callback) {
    const channelKey = `presence:room_${roomId}`;
    let entry = this._presenceChannels[channelKey];
    if (!entry) {
      // Fallback: create a channel without tracking (read-only presence)
      const channel = supabase.channel(channelKey, {
        config: {
          presence: { key: `observer-${Math.random().toString(36).slice(2, 8)}` },
        },
      });
      const unsubscribe = () => {
        supabase.removeChannel(channel);
        delete this._presenceChannels[channelKey];
      };
      entry = { channel, unsubscribe, metadata: null };
      this._presenceChannels[channelKey] = entry;
      channel.subscribe();
    }

    const handler = () => {
      const state = entry.channel.presenceState();
      const users = Object.values(state).map(arr => arr[0]);
      const count = users.length;
      callback?.({ count, users });
    };

    entry.channel.on('presence', { event: 'sync' }, handler);

    // Listener will be cleaned up when leavePresence removes the channel
    return () => {};
  },

  leavePresence(roomId) {
    const channelKey = `presence:room_${roomId}`;
    const entry = this._presenceChannels[channelKey];
    if (entry) {
      entry.unsubscribe();
    }
  },

  async updatePresence(roomId, newMetadata) {
    const channelKey = `presence:room_${roomId}`;
    const entry = this._presenceChannels[channelKey];
    if (!entry?.channel) {
      console.warn('[RealtimeService.updatePresence] channel not found for room', roomId);
      return;
    }

    const metadata = {
      ...(entry.metadata || {}),
      ...newMetadata,
    };

    try {
      await entry.channel.track(metadata);
      entry.metadata = metadata;
    } catch (e) {
      console.warn('[RealtimeService.updatePresence] track failed:', e);
    }
  },

  subscribeToRoomPresence(roomId, user, onSync) {
    if (!roomId || !user) return () => {};

    const userId = user.id || user.user_id;
    const metadata = {
        user_id: userId,
        username: user.username || user.user_metadata?.username || user.email?.split('@')[0] || 'Visiteur',
        avatar_url: user.avatar_url || user.user_metadata?.avatar_url,
        joined_at: Date.now(),
        is_leader: false,
    };

    const channelKey = `presence:room_${roomId}`;
    let entry = this._presenceChannels[channelKey];

    if (!entry) {
      const channel = supabase.channel(channelKey, {
        config: { presence: { key: userId } },
      });
      const unsubscribe = () => {
        supabase.removeChannel(channel);
        delete this._presenceChannels[channelKey];
      };
      entry = { channel, unsubscribe, metadata: null, tracked: false };
      this._presenceChannels[channelKey] = entry;
    }

    const handler = () => {
      const state = entry.channel.presenceState();
      const users = Object.values(state).map(arr => arr[0]);
      if (onSync) onSync(users);
    };

    entry.channel.on('presence', { event: 'sync' }, handler);

    entry.channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED' && !entry.tracked) {
        try {
          await entry.channel.track(metadata);
          entry.metadata = metadata;
          entry.tracked = true;
        } catch (e) {
          console.warn('[RealtimeService.subscribeToRoomPresence] track failed:', e);
        }
      }
    });

    return () => {
      supabase.removeChannel(entry.channel);
      delete this._presenceChannels[channelKey];
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
};