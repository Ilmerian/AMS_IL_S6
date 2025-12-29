import { supabase } from '../lib/supabaseClient';

/**
 * Gestion des invitations aux salles
 */

export const InvitationRepository = {
  // Créer une invitation
  async create(roomId, userId) {
    const { data, error } = await supabase
      .from('room_invites')
      .insert({
        room_id: roomId,
        created_by: userId
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Récupérer la dernière invitation valide (pour éviter d'en recréer une à chaque clic)
  async getValid(roomId) {
    const { data, error } = await supabase
      .from('room_invites')
      .select('*')
      .eq('room_id', roomId)
      .gt('expires_at', new Date().toISOString()) // Non expirée
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  }
};