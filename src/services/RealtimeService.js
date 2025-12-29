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

  // --- NOUVEAU : BROADCAST (Pour le Seek/Sync temporel) ---
  // Crée un channel pour envoyer/recevoir des événements éphémères
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

  // --- NOUVELLE MÉTHODE TOUT-EN-UN ---
  subscribeToRoomPresence(roomId, user, onSync) {
    if (!roomId || !user) return () => {};

    // 1. Calcul de l'ID et des métadonnées
    const userId = user.id || user.user_id;
    const metadata = {
        user_id: userId,
        username: user.username || user.user_metadata?.username || user.email?.split('@')[0] || 'Visiteur',
        avatar_url: user.avatar_url || user.user_metadata?.avatar_url,
        joined_at: Date.now(),
    };

    // 2. Création du canal avec la config (IMPORTANT)
    const channel = supabase.channel(`presence:room_${roomId}`, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    // 3. Gestion de la réception des données
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        // On transforme l'objet state en liste simple d'utilisateurs
        const users = Object.values(state).map(arr => arr[0]);
        if (onSync) onSync(users);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // 4. On signale notre présence une fois connecté
          await channel.track(metadata);
        }
      });

    // 5. Fonction de nettoyage propre
    return () => {
      supabase.removeChannel(channel);
    };
  },
  
  // ... (Vous pouvez supprimer joinPresence et subscribePresence qui ne serviront plus) ...

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
      await supabase.removeChannel(channel);
      delete this._presenceChannels[roomId];
    }
  },

  

};