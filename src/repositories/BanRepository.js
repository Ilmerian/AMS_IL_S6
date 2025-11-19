// src/repositories/BanRepository.js

import { supabase } from '../lib/supabaseClient';

const BAN_TABLE = 'bans';

export const BanRepository = {
    /**
     * Bannit un utilisateur d'une salle.
     */
    async banUser(roomId, userId) {
        const payload = { room_id: roomId, user_id: userId };
        
        const { data, error } = await supabase
            .from(BAN_TABLE)
            .insert(payload)
            .select()
            .single();

        if (error) {
            if (error.code === '23505') { 
                throw new Error("L'utilisateur est déjà banni de cette salle.");
            }
            console.error('Ban failed:', error);
            throw error;
        }
        return data;
    },

    /**
     * Lève l'interdiction d'un utilisateur d'une salle (unban).
     */
    async unbanUser(roomId, userId) {
        const { error } = await supabase
            .from(BAN_TABLE)
            .delete()
            .eq('room_id', roomId)
            .eq('user_id', userId);

        if (error) {
            console.error('Unban failed:', error);
            throw error;
        }
        return true;
    },

    /**
     * Vérifie si un utilisateur est banni d'une salle.
     */
    async isUserBanned(roomId, userId) {
        if (!userId) return false;
        
        const { data, error } = await supabase
            .from(BAN_TABLE)
            .select('id')
            .eq('room_id', roomId)
            .eq('user_id', userId)
            .maybeSingle(); 

        if (error) {
            console.error('Ban check failed:', error);
            throw error;
        }
        return !!data;
    },

    /**
     * Abonnement Realtime pour la levée/pose d'interdictions.
     */
    onBanChange(roomId, callback) {
        const channel = supabase
            .channel(`room:${roomId}:bans`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: BAN_TABLE, filter: `room_id=eq.${roomId}` },
                (payload) => callback(payload)
            )
            .subscribe();
        return () => supabase.removeChannel(channel);
    },
};