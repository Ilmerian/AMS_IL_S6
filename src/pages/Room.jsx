// src/pages/Room.jsx

import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/auth';

// Ajout des Repositories et Services nécessaires pour la modération
import { RoleService } from '../services/RoleService'; 
import { BanRepository } from '../repositories/BanRepository';

import GuestUpgradeBanner from '../components/GuestUpgradeBanner';
import { useRoom } from '../hooks/useRoom';
import { usePlaylistForRoom } from '../hooks/usePlaylistForRoom';
import { RealtimeService } from '../services/RealtimeService'; // Conservé pour l'abonnement room
import ChatBox from '../components/ChatBox'; 
import Section from '../ui/Section';
import VideoPlayerShell from '../components/VideoPlayerShell';
import PlaylistPanel from '../components/PlaylistPanel';

// Imports UI nécessaires pour la modération
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import GavelIcon from '@mui/icons-material/Gavel';
import Chip from '@mui/material/Chip';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

// Rôles et hiérarchie (Owner > Manager > Member)
const ROLES = {
    OWNER: 'owner',
    MANAGER: 'manager',
    MEMBER: 'member',
};

const getRoleBadge = (role) => {
    switch (role) {
        case ROLES.OWNER: return <Chip label="Owner" size="small" color="primary" sx={{ ml: 1 }} />;
        case ROLES.MANAGER: return <Chip label="Manager" size="small" color="secondary" sx={{ ml: 1 }} />;
        default: return <Chip label="Member" size="small" sx={{ ml: 1 }} />;
    }
};


export default function Room() {
    const { t } = useTranslation();
    const { roomId } = useParams();
    const { user } = useAuth();

    // États du design original
    const [activeTab, setActiveTab] = useState('playlist');
    const [pw, setPw] = useState('');

    const {
        room,
        needPw,
        checked,
        error: err,
        loading: roomLoading,
        refresh,
        verifyPassword,
    } = useRoom(roomId);
    
    // NOUVEAU: États de Modération/ACL
    const [members, setMembers] = useState([]);
    const [userRole, setUserRole] = useState(null); 
    const [isBanned, setIsBanned] = useState(false); 
    const [loading, setLoading] = useState(true); // Chargement de la modération

    const [anchorEl, setAnchorEl] = useState(null);
    const [selectedMember, setSelectedMember] = useState(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });


    const {
        playlistId,
        embedUrl,
        addVideoByRawUrl,
        playYouTubeId,
    } = usePlaylistForRoom({ room, roomId, accessGranted: !needPw || checked });

    // Fonctions manquantes de la version HEAD (pour la playlist)
    const handleAddVideo = addVideoByRawUrl;
    const handlePlay = playYouTubeId;

    const verify = async (e) => {
        e.preventDefault();
        const ok = await verifyPassword(pw);
        if (ok) setPw('');
    };

    // ------------------------------------------
    // LOGIQUE DE MODÉRATION (ACL)
    // ------------------------------------------

    const getMemberRole = useCallback((member) => {
        if (!member) return null;
        if (member.isOwner) return ROLES.OWNER;
        if (member.is_manager) return ROLES.MANAGER;
        if (member.userId) return ROLES.MEMBER;
        return null;
    }, []);

    const canInteract = useCallback((targetRole, targetUserId) => {
        if (!userRole || targetUserId === user?.id) return false;

        if (userRole === ROLES.OWNER) {
            return true;
        }

        if (userRole === ROLES.MANAGER) {
            return targetRole === ROLES.MEMBER;
        }

        return false;
    }, [userRole, user]);
    
    const loadRoomData = useCallback(async () => {
        if (!user || !roomId) {
            setLoading(false);
            return;
        }

        try {
            const bannedStatus = await BanRepository.isUserBanned(roomId, user.id);
            setIsBanned(bannedStatus);

            if (bannedStatus) {
                return;
            }

            const initialMembers = await RoleService.listMembers(roomId);
            setMembers(initialMembers);

            const currentUserMember = initialMembers.find(m => m.userId === user.id);
            const currentUserRole = getMemberRole(currentUserMember);
            setUserRole(currentUserRole);

        } catch (error) {
            console.error('Error loading room data:', error);
            setSnackbar({ open: true, message: error.message || t('auth.error', 'Error'), severity: 'error' });
        } finally {
            setLoading(false);
        }
    }, [roomId, user, getMemberRole, t]);


    useEffect(() => {
        if (!user || !roomId || roomLoading) return;

        let banUnsub;
        
        if (room && !needPw) {
            setLoading(true);
            loadRoomData(); // Charger les données de modération

            try {
                // Abonnement aux bans pour mise à jour immédiate
                banUnsub = BanRepository.onBanChange(roomId, (payload) => {
                    if (payload.new?.user_id === user.id || payload.old?.user_id === user.id) {
                        setIsBanned(payload.eventType === 'INSERT');
                    }
                    if (payload.eventType === 'INSERT' || payload.eventType === 'DELETE') {
                        loadRoomData();
                    }
                });
            } catch (e) {
                console.warn('Realtime subscription failed:', e.message);
            }
        }

        // Conservation de l'abonnement original du hook useRoom (RealtimeService.onUpdate sur 'rooms')
        const unsub = RealtimeService.onUpdate({
            table: 'rooms',
            cb: (payload) => {
                if (payload?.new?.room_id === Number(roomId)) {
                    refresh();
                }
            },
        });
        
        return () => {
            banUnsub?.();
            unsub?.();
        };

    }, [roomId, user, room, roomLoading, needPw, refresh, loadRoomData]);


    const handleAction = async (action, targetMember) => {
        setAnchorEl(null);

        try {
            switch (action) {
                case 'promote':
                    await RoleService.promote(roomId, targetMember.userId);
                    setSnackbar({ open: true, message: t('role.promoted', { user: targetMember.name }), severity: 'success' });
                    break;
                case 'demote':
                    if (targetMember.role === ROLES.OWNER) {
                         throw new Error("Cannot demote the room owner.");
                    }
                    await RoleService.demote(roomId, targetMember.userId);
                    setSnackbar({ open: true, message: t('role.demoted', { user: targetMember.name }), severity: 'success' });
                    break;
                case 'kick':
                    if (!window.confirm(t('confirm.kick', { user: targetMember.name }))) return;
                    await RoleService.remove(roomId, targetMember.userId);
                    setSnackbar({ open: true, message: t('role.kicked', { user: targetMember.name }), severity: 'success' });
                    break;
                case 'ban':
                    if (!window.confirm(t('confirm.ban', { user: targetMember.name }))) return;

                    await BanRepository.banUser(roomId, targetMember.userId);
                    await RoleService.remove(roomId, targetMember.userId);
                    setSnackbar({ open: true, message: t('role.banned', { user: targetMember.name }), severity: 'warning' });
                    break;
                case 'unban':
                    if (!window.confirm(t('confirm.unban', { user: targetMember.name }))) return;
                    await BanRepository.unbanUser(roomId, targetMember.userId);
                    setSnackbar({ open: true, message: t('role.unbanned', { user: targetMember.name }), severity: 'success' });
                    break;
                default:
                    break;
            }
            loadRoomData();
        } catch (err) {
            setSnackbar({ open: true, message: err.message || t('error.permission_denied'), severity: 'error' });
        }
    };


    // ------------------------------------------
    // 3. RENDU CONDITIONNEL
    // ------------------------------------------

    if (roomLoading && !room) {
        return (
            <Section>
                <Typography sx={{ opacity: 0.8 }}>
                    {t('room.loading', 'Chargement de la salle...')}
                </Typography>
            </Section>
        );
    }

    if (!roomLoading && !room && err) {
        return (
            <Section>
                <Typography color="error" sx={{ mb: 1 }}>
                    {t('room.error_generic', 'Impossible de charger cette salle.')}
                </Typography>
                <Typography sx={{ opacity: 0.8, mb: 2 }}>{err}</Typography>
                <Button variant="outlined" onClick={() => refresh()}>
                    {t('room.reload', 'Recharger')}
                </Button>
            </Section>
        );
    }

    if (!room) {
        return (
            <Section>
                <Typography sx={{ opacity: 0.8 }}>
                    {t('room.not_found', 'Salle introuvable ou inaccessible.')}
                </Typography>
            </Section>
        );
    }

    // --- Rendu Banni ---
    if (isBanned) {
        return (
            <Box component={Section} sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="h5" color="error">
                    {t('room.banned_title', 'Accès Refusé')}
                </Typography>
                <Typography>{t('room.banned_message', 'Vous avez été banni de cette salle. Il est impossible de ré-entrer.')}</Typography>
            </Box>
        );
    }
    
    // --- Rendu Principal ---
    const isModerator = userRole === ROLES.OWNER || userRole === ROLES.MANAGER;

    return (
        <Section>
            {!user && (
                <Box sx={{ mb: 2 }}>
                    <GuestUpgradeBanner />
                </Box>
            )}

            {/* Titre et statut de la salle (Design Original) */}
            <Box sx={{ pb: 2, mb: 2, borderBottom: '1px solid rgba(255,255,255,0.4)' }}>
                <Typography
                    variant="h4"
                    sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}
                >
                    {room.name}
                </Typography>
            </Box>
            <Typography sx={{ opacity: 0.8 }}>
                {room.password ? t('room.private') : t('room.public')}
            </Typography>

            {/* Formulaire de mot de passe (Design Original) */}
            {needPw && !checked ? (
                <Box component="form" onSubmit={verify} sx={{ mt: 2, maxWidth: 480 }}>
                    <Stack spacing={2}>
                        <Typography>{t('room.enterPassword')}</Typography>
                        <Stack direction="row" spacing={1}>
                            <TextField
                                type="password"
                                placeholder={t('room.password_placeholder')}
                                value={pw}
                                onChange={(e) => setPw(e.target.value)}
                                fullWidth
                            />
                            <Button type="submit" variant="contained">
                                {t('room.join')}
                            </Button>
                        </Stack>
                        {err && <Typography color="error" role="alert">{err}</Typography>}
                    </Stack>
                </Box>
            ) : (
                // Contenu principal de la salle (Vidéo, Chat, Playlist, Modération)
                <Stack spacing={2} sx={{ mt: 2 }}>
                    
                    {/* LAYOUT ABSOLUTE (Design Original) */}
                    <Box 
                        sx={{ 
                            position: 'relative',
                            width: '100%',
                            display: 'block' 
                        }}
                    >
                        {/* Conteneur principal de la vidéo */}
                        <Box 
                            sx={{ 
                                mr: { xs: 0, lg: '466px' }, 
                                minWidth: 0 
                            }}
                        >
                            <VideoPlayerShell embedUrl={embedUrl} />
                        </Box>

                        {/* Conteneur absolu pour la Playlist/Chat (Barre latérale) */}
                        <Box
                            sx={{
                                position: { xs: 'static', lg: 'absolute' },
                                top: 0,
                                right: 0,
                                bottom: 0,
                                width: { xs: '100%', lg: '450px' },
                                mt: { xs: 2, lg: 0 },
                                display: 'flex',
                                flexDirection: 'column',
                                bgcolor: 'background.paper',
                                borderRadius: 1,
                                overflow: 'hidden',
                                border: '1px solid rgba(255,255,255,0.1)'
                            }}
                        >
                            <Box sx={{ borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
                                <Tabs
                                    value={activeTab}
                                    onChange={(e, val) => setActiveTab(val)}
                                    variant="fullWidth"
                                    textColor="primary"
                                    indicatorColor="primary"
                                >
                                    <Tab label="Playlist" value="playlist" />
                                    <Tab label="Chat" value="chat" />
                                </Tabs>
                            </Box>

                            <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                                
                                <Box sx={{ p: 1, height: '100%' }}> 
                                    {activeTab === 'playlist' && (
                                        <PlaylistPanel
                                            playlistId={playlistId}
                                            onAdd={handleAddVideo}
                                            onPlay={handlePlay}
                                        />
                                    )}

                                    {activeTab === 'chat' && (
                                        <Box sx={{ height: '100%', minHeight: 300 }}>
                                            {/* Passage de isBanned au ChatBox */}
                                            <ChatBox roomId={roomId} isBanned={isBanned} />
                                        </Box>
                                    )}
                                </Box>
                            </Box>
                        </Box>
                    </Box>

                    {/* PANNEAU DE MODÉRATION (Sous la vidéo) */}
                    <Divider sx={{ my: 2 }} />

                    {isModerator && (
                        <Box sx={{ mb: 3 }}>
                            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                                <GavelIcon fontSize="small" sx={{ mr: 1 }} />
                                {t('room.moderation_panel', 'Panneau de Modération')} (Rôle: {userRole})
                            </Typography>

                            <List dense>
                                {members.map((member) => {
                                    const memberRole = getMemberRole(member);
                                    const isCurrentUser = member.userId === user.id;
                                    const canActOn = !isCurrentUser && canInteract(memberRole, member.userId);

                                    return (
                                        <ListItem
                                            key={member.userId}
                                            secondaryAction={
                                                canActOn && (
                                                    <IconButton
                                                        edge="end"
                                                        aria-label="actions"
                                                        onClick={(e) => {
                                                            setAnchorEl(e.currentTarget);
                                                            setSelectedMember({ ...member, name: member.name, role: memberRole });
                                                        }}
                                                    >
                                                        <MoreVertIcon />
                                                    </IconButton>
                                                )
                                            }
                                        >
                                            <ListItemText
                                                primary={isCurrentUser ? `${member.name} (${t('room.you')})` : member.name}
                                                secondary={getRoleBadge(memberRole)}
                                                secondaryTypographyProps={{ component: 'span' }} 
                                            />
                                        </ListItem>
                                    );
                                })}
                            </List>
                        </Box>
                    )}
                </Stack>
            )}

            {/* MENU CONTEXTUEL DES ACTIONS */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
            >
                {selectedMember && (
                    <Box>
                        {/* PROMOTE (Owner peut promouvoir Member/Manager) */}
                        {(selectedMember.role === ROLES.MEMBER || selectedMember.role === ROLES.MANAGER) && userRole === ROLES.OWNER && (
                            <MenuItem onClick={() => handleAction('promote', selectedMember)}>
                                {t('action.promote', 'Promouvoir Manager')}
                            </MenuItem>
                        )}
                        
                        {/* DEMOTE (Owner peut rétrograder Manager) */}
                        {selectedMember.role === ROLES.MANAGER && userRole === ROLES.OWNER && (
                            <MenuItem onClick={() => handleAction('demote', selectedMember)}>
                                {t('action.demote', 'Rétrograder Membre')}
                            </MenuItem>
                        )}
                        
                        {/* KICK/BAN */}
                        <MenuItem onClick={() => handleAction('kick', selectedMember)}>
                            {t('action.kick', 'Exclure (Kick)')}
                        </MenuItem>
                        <MenuItem onClick={() => handleAction('ban', selectedMember)} sx={{ color: 'error.main' }}>
                            {t('action.ban', 'Bannir (Ban)')}
                        </MenuItem>
                    </Box>
                )}
            </Menu>

            {/* SNACKBAR DE NOTIFICATION */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
            >
                <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Section>
    );
}