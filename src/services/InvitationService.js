import { InvitationRepository } from '../repositories/InvitationRepository';
import { supabase } from '../lib/supabaseClient';

/**
 * Service de gestion des invitations aux salles
 */

export const InvitationService = {
  // ... votre méthode getOrCreateInviteLink existante ...
  async getOrCreateInviteLink(roomId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Vous devez être connecté.");
    let invite = await InvitationRepository.getValid(roomId);
    if (!invite) { invite = await InvitationRepository.create(roomId, user.id); }
    const baseUrl = window.location.origin;
    // On utilise bien window.location.origin pour que ça marche sur Vercel et Localhost
    return `${baseUrl}/rooms/${roomId}?invite=${invite.token}`;
  },

  // --- NOUVELLE MÉTHODE ---
  async sendInviteByEmail(roomId, roomName, targetEmail) {
    // 1. Générer le lien
    const inviteLink = await this.getOrCreateInviteLink(roomId);

    // 2. Récupérer le nom de l'utilisateur courant (expéditeur)
    const { data: { user } } = await supabase.auth.getUser();
    // On essaie de trouver un nom, un pseudo, ou à défaut le début de l'email
    const senderName = user?.user_metadata?.username || user?.email?.split('@')[0] || 'Un ami';

    // 3. Appeler la fonction Supabase 'send-invite'
    const { data, error } = await supabase.functions.invoke('send-invite', {
      body: {
        email: targetEmail,
        inviteLink,
        roomName: roomName || 'Salon Vidéo',
        senderName
      }
    });

    if (error) throw error;
    return data;
  }
};