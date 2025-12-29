// src/repositories/BanRepository.js

import { supabase } from '../lib/supabaseClient';

const BAN_TABLE = 'bans';

/**
 * Gestion des bannissements des utilisateurs
 */

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
     * RÉSILIENCE AMÉLIORÉE: Capture les NetworkError et retourne false par défaut.
     */
    async isUserBanned(roomId, userId) {
        if (!userId) return false;

        try {
            const { data, error } = await supabase
                .from(BAN_TABLE)
                .select('id')
                .eq('room_id', roomId)
                .eq('user_id', userId)
                .maybeSingle();

            if (error) {
                // Si l'erreur est un AbortError (code 20), on le loggue comme avertissement
                if (error.code === '20' || error.message.includes('AbortError')) {
                    console.warn('Ban check failed (Supabase AbortError, temporary network issue):', error);
                    return false; // Traiter comme non banni par résilience
                }
                console.error('Ban check failed (Supabase structured error):', error);
                throw error; // Lancer d'autres erreurs structurées (RLS, etc.)
            }
            return !!data;
        } catch (e) {
            // Utilisé pour attraper les NetworkError / FetchError (qui ne sont pas des objets error Supabase structurés)
            console.warn('Ban check failed (Network/Fetch error), returning default (false):', e);
            return false;
        }
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