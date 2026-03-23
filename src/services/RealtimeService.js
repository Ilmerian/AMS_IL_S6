// src/services/RealtimeService.js
import { supabase } from "../lib/supabaseClient";

/**
 * Gestion des événements temps réel et de la présence
 */

export const RealtimeService = {
  _presenceChannels: {},
  _broadcastChannels: {},

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

  joinBroadcast(roomId, onEvent, onSubscribe, onStatusChange) {
    if (!roomId) {
      return {
        send: async () => {},
        unsubscribe: () => {},
      };
    }

    const channelName = `room_broadcast:${roomId}`;

    const existingTrackedChannel = this._broadcastChannels[roomId];
    if (existingTrackedChannel) {
      try {
        supabase.removeChannel(existingTrackedChannel);
      } catch (e) {
        console.warn("[RealtimeService] Failed to remove existing tracked broadcast channel:", e);
      }
      delete this._broadcastChannels[roomId];
    }

    const existingSupabaseChannel = supabase.getChannels().find((c) => c.topic === channelName);
    if (existingSupabaseChannel) {
      try {
        supabase.removeChannel(existingSupabaseChannel);
      } catch (e) {
        console.warn("[RealtimeService] Failed to remove existing Supabase broadcast channel:", e);
      }
    }

    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false },
      },
    });

    channel
      .on("broadcast", { event: "player_action" }, (payload) => {
        if (onEvent) onEvent(payload.payload);
      })
      .subscribe((status) => {
        if (onStatusChange) onStatusChange(status);
        if (status === "SUBSCRIBED" && onSubscribe) {
          onSubscribe();
        }
      });

    this._broadcastChannels[roomId] = channel;

    return {
      send: async (type, data) => {
        if (channel.state !== "joined") {
          console.warn(`[BROADCAST] Channel not ready for room ${roomId}, state: ${channel.state}`);
          return false;
        }

        try {
          await channel.send({
            type: "broadcast",
            event: "player_action",
            payload: { type, ...data },
          });
          return true;
        } catch (error) {
          console.error("[BROADCAST ERROR] Failed to send:", error);
          return false;
        }
      },
      unsubscribe: () => {
        try {
          supabase.removeChannel(channel);
        } catch (e) {
          console.warn("[RealtimeService] Broadcast unsubscribe error:", e);
        }
        if (this._broadcastChannels[roomId] === channel) {
          delete this._broadcastChannels[roomId];
        }
      },
    };
  },

  joinPresence(roomId, userMeta) {
    if (!roomId || !userMeta?.user_id) return null;

    const existing = this._presenceChannels[roomId];
    if (existing) return existing;

    const metadata = {
      user_id: userMeta.user_id,
      username: userMeta.username || "Visitor",
      avatar_url: userMeta.avatar_url || null,
      joined_at: Date.now(),
    };

    const channel = supabase.channel(`presence:room_${roomId}`, {
      config: {
        presence: { key: metadata.user_id },
      },
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        try {
          await channel.track(metadata);
        } catch (e) {
          console.warn("[RealtimeService] Presence track error:", e);
        }
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

    channel.on("presence", { event: "sync" }, handler);
    handler();

    return () => {};
  },

  subscribeToRoomPresence(roomId, user, onSync, onStatusChange) {
    if (!roomId || !user) return () => {};

    const userId = user.id || user.user_id;
    if (!userId) return () => {};

    const existing = this._presenceChannels[roomId];
    if (existing) {
      try {
        supabase.removeChannel(existing);
      } catch (e) {
        console.warn("[RealtimeService] Failed to remove existing presence channel:", e);
      }
      delete this._presenceChannels[roomId];
    }

    const metadata = {
      user_id: userId,
      username:
        user.username ||
        user.user_metadata?.username ||
        user.email?.split("@")[0] ||
        "Visiteur",
      avatar_url: user.avatar_url || user.user_metadata?.avatar_url || null,
      joined_at: Date.now(),
    };

    const channel = supabase.channel(`presence:room_${roomId}`, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    const emitPresence = () => {
      const state = channel.presenceState();
      const users = Object.values(state).flat();
      if (onSync) onSync(users);
    };

    channel
      .on("presence", { event: "sync" }, emitPresence)
      .on("presence", { event: "join" }, emitPresence)
      .on("presence", { event: "leave" }, emitPresence)
      .subscribe(async (status) => {
        if (onStatusChange) onStatusChange(status);

        if (status === "SUBSCRIBED") {
          try {
            await channel.track(metadata);
            emitPresence();
          } catch (e) {
            console.warn("[RealtimeService] Presence track error:", e);
          }
        }
      });

    this._presenceChannels[roomId] = channel;

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch (e) {
        console.warn("[RealtimeService] Presence unsubscribe error:", e);
      }
      if (this._presenceChannels[roomId] === channel) {
        delete this._presenceChannels[roomId];
      }
    };
  },

  async getPresence(roomId) {
    try {
      const tracked = this._presenceChannels[roomId];
      if (!tracked) return [];

      const state = tracked.presenceState();
      return Object.values(state).flat();
    } catch (error) {
      console.error("Error getting presence:", error);
      return [];
    }
  },

  async leavePresence(roomId) {
    const channel = this._presenceChannels[roomId];
    if (channel) {
      try {
        await supabase.removeChannel(channel);
      } catch (e) {
        console.warn("[RealtimeService] leavePresence error:", e);
      }
      delete this._presenceChannels[roomId];
    }
  },

  async leaveBroadcast(roomId) {
    const channel = this._broadcastChannels[roomId];
    if (channel) {
      try {
        await supabase.removeChannel(channel);
      } catch (e) {
        console.warn("[RealtimeService] leaveBroadcast error:", e);
      }
      delete this._broadcastChannels[roomId];
    }
  },
};