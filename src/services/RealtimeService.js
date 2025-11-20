// src/services/RealtimeService.js
import { supabase } from "../lib/supabaseClient";

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


  _presenceChannels: {},

  async joinPresence(roomId, user) {
    if (!roomId || !user) return;

    if (this._presenceChannels[roomId]) return;

    const channel = supabase.channel(`presence:room_${roomId}`, {
      config: {
        presence: {
          key: user.user_id,
        },
      },
    });

    channel.on("presence", { event: "sync" }, () => {
    });

    await channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({
          user_id: user.user_id,
          username: user.username,
          avatar_url: user.avatar_url,
          joined_at: Date.now(),
        });
      }
    });

    this._presenceChannels[roomId] = channel;
  },

  async leavePresence(roomId) {
    const channel = this._presenceChannels[roomId];
    if (channel) {
      await supabase.removeChannel(channel);
      delete this._presenceChannels[roomId];
    }
  },

  subscribePresence(roomId, callback) {
    if (!roomId) return () => { };

    const channel = supabase.channel(`presence:room_${roomId}`);

    const handler = () => {
      const state = channel.presenceState();

      const users = Object.values(state).map(arr => arr[0]);

      callback({
        count: users.length,
        users,
      });
    };

    channel.on("presence", { event: "sync" }, handler);

    channel.subscribe();

    return () => supabase.removeChannel(channel);
  },

};
