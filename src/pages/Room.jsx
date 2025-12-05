// src/pages/Room.jsx
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/auth';

// Repositories et Services
import { RoleService } from '../services/RoleService';
import { BanRepository } from '../repositories/BanRepository';
import { RealtimeService } from '../services/RealtimeService';
import { UserRepository } from "../repositories/UserRepository";
import { cacheService } from '../services/CacheService';

// Components & Utils
import GuestUpgradeBanner from '../components/GuestUpgradeBanner';
import { useRoom } from '../hooks/useRoom';
import { usePlaylistForRoom } from '../hooks/usePlaylistForRoom';
import { PlaybackRepository } from '../repositories/PlaybackRepository'
import ChatBox from '../components/ChatBox';
import Section from '../ui/Section';
import VideoPlayerShell from '../components/VideoPlayerShell';
import PlaylistPanel from '../components/PlaylistPanel';
import { toWatchUrl } from '../utils/youtube';

// IMPORT DU NOUVEAU HOOK
import { useVideoSync } from '../hooks/useVideoSync';

// UI Imports
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
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
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';

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

function ControlStatus({ controlInfo, user }) {
  const { t } = useTranslation();
  
  if (!user) return null;
  
  if (controlInfo.canControl) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, bgcolor: 'success.dark', borderRadius: 1 }}>
        <CheckCircleIcon fontSize="small" />
        <Typography variant="body2">
          {controlInfo.isLeader 
            ? t('room.you_are_leader', 'You are controlling playback')
            : t('room.you_can_control', 'You can control playback')
          }
        </Typography>
        {controlInfo.isLeader && (
          <Button 
            size="small" 
            variant="outlined" 
            onClick={controlInfo.releaseLeadership}
            sx={{ ml: 1 }}
          >
            {t('room.release_control', 'Release Control')}
          </Button>
        )}
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, bgcolor: 'warning.dark', borderRadius: 1 }}>
      <WarningIcon fontSize="small" />
      <Typography variant="body2">
        {controlInfo.currentLeader 
          ? t('room.someone_controlling', 'Someone else is controlling playback')
          : t('room.request_control', 'Request control to manage playback')
        }
      </Typography>
      <Button 
        size="small" 
        variant="contained" 
        onClick={controlInfo.takeLeadership}
        sx={{ ml: 1 }}
      >
        {t('room.take_control', 'Take Control')}
      </Button>
    </Box>
  );
}

function ConnectionStatus({ connectionStatus }) {
  const getStatusInfo = (status) => {
    switch (status) {
      case 'connected':
        return { text: '🟢 Synchronisation en temps réel', color: 'success.main' };
      case 'polling':
        return { text: '🟡 Synchronisation active', color: 'warning.main' };
      case 'error':
        return { text: '🔴 Problème de connexion', color: 'error.main' };
      default:
        return { text: '⚪ Connexion...', color: 'grey.500' };
    }
  };

  const statusInfo = getStatusInfo(connectionStatus);

  return (
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: 1,
      p: 1, 
      borderRadius: 1,
      backgroundColor: statusInfo.color,
      opacity: 0.9
    }}>
      <Typography variant="body2" sx={{ color: 'white', fontSize: '0.8rem' }}>
        {statusInfo.text}
      </Typography>
    </Box>
  );
}

export default function Room() {
    const { t } = useTranslation();
    const { roomId } = useParams();
    const { user } = useAuth();

    const isProduction = typeof window !== 'undefined' && 
                        window.location.hostname !== 'localhost' && 
                        window.location.hostname !== '127.0.0.1';

    // UI States
    const [activeTab, setActiveTab] = useState('playlist');
    const [pw, setPw] = useState('');
    
    // Room Data Hooks
    const {
        room,
        needPw,
        checked,
        error: err,
        loading: roomLoading,
        refresh,
        verifyPassword,
    } = useRoom(roomId);

    // Moderation States
    const [members, setMembers] = useState([]);
    const [userRole, setUserRole] = useState(null);
    const [isBanned, setIsBanned] = useState(false);

    // UI Helpers
    const [anchorEl, setAnchorEl] = useState(null);
    const [selectedMember, setSelectedMember] = useState(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    // --- PLAYLIST ---
    const {
        playlistId,
        embedUrl,
        currentVideoId,
        playlistItems,
        addVideoByRawUrl,
        playVideoById,
        playNextVideo,
        playPrevVideo,
        handleVideoError
    } = usePlaylistForRoom({ room, roomId, accessGranted: !needPw || checked })

    const handleAddVideo = addVideoByRawUrl;
    const handleVideoEnded = useCallback(() => {
        console.log('Video ended, playing next...')
        playNextVideo()
    }, [playNextVideo])

    const verify = async (e) => {
        e.preventDefault();
        const ok = await verifyPassword(pw);
        if (ok) setPw('');
    };

    // ------------------------------------------
    // INTEGRATION DU HOOK DE SYNCHRONISATION
    // ------------------------------------------
    const {
        syncVideoId,
        syncIsPlaying,
        seekTimestamp,
        triggerPlay,
        triggerPause,
        triggerSeek,
        changeVideo,
        updateLocalProgress,
        connectionStatus,
        controlInfo = {} 
    } = useVideoSync({
        roomId,
        user,
        userRole,
        initialVideoId: room?.current_video_id,
        initialPlaying: room?.is_playing
    });
    const canControlVideo = controlInfo.canControl || userRole === ROLES.OWNER || userRole === ROLES.MANAGER;
    // ------------------------------------------
    // ------------------------------------------
    // MODERATION & DATA LOADING
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
        if (userRole === ROLES.OWNER) return true;
        if (userRole === ROLES.MANAGER) return targetRole === ROLES.MEMBER;
        return false;
    }, [userRole, user]);

    const loadRoomData = useCallback(async () => {
        if (!user || !roomId) {
            return;
        }
        
        const cacheKey = `room_data_${roomId}_${user.id}`;
        const cacheTTL = isProduction ? 600000 : 30000;
        
        try {
            const cached = cacheService.getMemory(cacheKey);
            if (cached && Date.now() - cached.timestamp < cacheTTL) {
            console.log(`[Room] Cache HIT (${isProduction ? '10min' : '30s'}) for room ${roomId}`);
            const { bannedStatus, initialMembers, currentUserRole } = cached.data;
            setIsBanned(bannedStatus);
            if (!bannedStatus) {
                setMembers(initialMembers);
                setUserRole(currentUserRole);
            }
            return;
            }

            console.log(`[Room] Cache MISS for room ${roomId}, fetching...`);
            
            if (isProduction) {
            const [bannedStatus, initialMembers] = await Promise.all([
                BanRepository.isUserBanned(roomId, user.id),
                RoleService.listMembers(roomId)
            ]);
            
            setIsBanned(bannedStatus);
            if (bannedStatus) return;
            
            setMembers(initialMembers);
            
            const currentUserMember = initialMembers.find(m => m.userId === user.id);
            const role = currentUserMember ? 
                (currentUserMember.isOwner ? 'owner' : 
                currentUserMember.is_manager ? 'manager' : 'member') : null;
            
            setUserRole(role);
            
            cacheService.setMemory(cacheKey, {
                timestamp: Date.now(),
                data: {
                bannedStatus,
                initialMembers,
                currentUserRole: role
                }
            }, cacheTTL);
            
            } else {
            const [bannedStatus, initialMembers] = await Promise.all([
                BanRepository.isUserBanned(roomId, user.id),
                RoleService.listMembers(roomId)
            ]);

            setIsBanned(bannedStatus);
            if (bannedStatus) return;

            setMembers(initialMembers);

            const currentUserMember = initialMembers.find(m => m.userId === user.id);
            const currentUserRole = getMemberRole(currentUserMember);
            setUserRole(currentUserRole);

            cacheService.setMemory(cacheKey, {
                timestamp: Date.now(),
                data: {
                bannedStatus,
                initialMembers,
                currentUserRole
                }
            }, cacheTTL);
            }

        } catch (error) {
            console.error('Error loading room data:', error);
            setSnackbar({ 
            open: true, 
            message: error.message || t('auth.error', 'Error'), 
            severity: 'error' 
            });
        }
        }, [roomId, user, getMemberRole, t, isProduction]);

    const isModerator = useMemo(() => {
        const isOwnerDirect = room?.ownerId === user?.id;
        const result = userRole === ROLES.OWNER || 
                    userRole === ROLES.MANAGER || 
                    isOwnerDirect ||
                    members.some(m => m.userId === user?.id && (m.isOwner || m.is_manager));
        
        return result;
    }, [userRole, room?.ownerId, user?.id, members]);
    
    console.log('=== ROOM DEBUG INFO ===');
    console.log('isProduction:', isProduction);
    console.log('userRole:', userRole);
    console.log('isModerator:', isModerator);
    console.log('user:', user?.id);
    console.log('room ownerId:', room?.ownerId);
    console.log('members count:', members.length);
    console.log('current user in members:', members.find(m => m.userId === user?.id));
    console.log('========================');    

    // useEffect to clear the cache when unmounting:
    useEffect(() => {
    return () => {
        // Clear the room cache when unmounting
        if (roomId && user) {
        cacheService.invalidate(`room_data_${roomId}_${user.id}`);
        }
    };
    }, [roomId, user]);

    useEffect(() => {        
        if (!user || !roomId || roomLoading || !room || needPw) return;    
        if (isProduction) {
            console.log('[Room] Realtime subscriptions DISABLED in production');
            return;
        }            
        let banUnsub;
            
        loadRoomData(); // Lancer le chargement des membres/bans

        try {
            // Abonnement aux bans
            banUnsub = BanRepository.onBanChange(roomId, (payload) => {
                if (payload.new?.user_id === user.id || payload.old?.user_id === user.id) {
                    setIsBanned(payload.eventType === 'INSERT');
                }
                // Recharger la liste des membres si un ban/unban a lieu pour un utilisateur quelconque
                if (payload.eventType === 'INSERT' || payload.eventType === 'DELETE') {
                    loadRoomData();
                }
            });
        } catch (e) {
            console.warn('Realtime subscription failed:', e.message);
        }
            
        return () => { banUnsub?.(); };
    }, [roomId, user, room, roomLoading, needPw, loadRoomData, isProduction]);

    const handleAction = async (action, targetMember) => {
        setAnchorEl(null);
        try {
            switch (action) {
                case 'promote':
                    await RoleService.promote(roomId, targetMember.userId);
                    setSnackbar({ open: true, message: t('role.promoted', { user: targetMember.name }), severity: 'success' });
                    break;
                case 'demote':
                    if (targetMember.role === ROLES.OWNER) throw new Error("Cannot demote the room owner.");
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
                default: break;
            }
            loadRoomData();
        } catch (err) {
            setSnackbar({ open: true, message: err.message || t('error.permission_denied'), severity: 'error' });
        }
    };

    // ------------------------------------------
    // RENDER
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

    return (
        <Section>
            {!user && (
                <Box sx={{ mb: 2 }}>
                    <GuestUpgradeBanner />
                </Box>
            )}
            
            {user && controlInfo && (
                <Box sx={{ mb: 2 }}>
                    <ControlStatus controlInfo={controlInfo} user={user} />
                </Box>
            )}
            {user && (
            <Box sx={{ mb: 1 }}>
                <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1,
                p: 1, 
                borderRadius: 1,
                backgroundColor: connectionStatus === 'polling' ? 'success.main' : 
                                connectionStatus === 'error' ? 'error.main' : 'warning.main',
                opacity: 0.9
                }}>
                <Typography variant="body2" sx={{ color: 'white', fontSize: '0.8rem' }}>
                    {connectionStatus === 'polling' ? '🟢 Synchronisé' :
                    connectionStatus === 'error' ? '🔴 Problème de connexion' : '🟡 Connexion...'}
                </Typography>
                </Box>
            </Box>
            )}
            {/* HEADER */}
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

            {/* PASSWORD FORM */}
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
                // MAIN CONTENT
                <Stack spacing={2} sx={{ mt: 2 }}>
                    <Box
                        sx={{
                            position: 'relative',
                            width: '100%',
                            display: 'block'
                        }}
                    >
                        {/* VIDEO PLAYER */}
                        <Box
                            sx={{
                                mr: { xs: 0, lg: '466px' },
                                minWidth: 0
                            }}
                        >
                            <VideoPlayerShell 
                                url={embedUrl || (syncVideoId ? toWatchUrl(syncVideoId) : null)}
                                playing={syncIsPlaying}
                                // AJOUT DE LA PROP D'AUTORISATION
                                canControl={canControlVideo} 
                                onPlay={triggerPlay}
                                onPause={triggerPause}
                                onSeek={triggerSeek}
                                onProgress={updateLocalProgress}
                                seekToTimestamp={seekTimestamp}
                                onEnded={handleVideoEnded}
                                onError={handleVideoError}
                            />
                            {/* NAVIGATION BUTTONS */}
                            {canControlVideo && playlistItems.length > 1 && (
                            <Box sx={{ display: 'flex', gap: 1, mt: 2, justifyContent: 'center' }}>
                                <Button 
                                variant="outlined" 
                                onClick={playPrevVideo}
                                disabled={!currentVideoId}
                                >
                                Previous
                                </Button>
                                <Button 
                                variant="outlined" 
                                onClick={playNextVideo}
                                disabled={!currentVideoId}
                                >
                                Next
                                </Button>
                            </Box>
                            )}
                        </Box>

                        {/* SIDEBAR */}
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
                                    key={`tabs-${roomId}-${user?.id}`}
                                >
                                    <Tab label="Playlist" value="playlist" />
                                    <Tab label="Chat" value="chat" />
                                    {isModerator && <Tab label="Modération" value="moderation" />}
                                </Tabs>
                            </Box>

                            <Box sx={{ flex: 1, minHeight: 0, overflowY: activeTab === 'chat' ? 'hidden' : 'auto' }}>
                                <Box sx={{ p: 1, height: '100%' }}>
                                    {activeTab === 'playlist' && (
                                        <PlaylistPanel
                                            playlistId={playlistId}
                                            canEdit={canControlVideo} 
                                            onAdd={handleAddVideo}
                                            onPlay={changeVideo}
                                            currentVideoId={currentVideoId}
                                            onVideoSelect={async (url) => {
                                            const video = playlistItems.find(v => v.url === url)
                                              if (video && canControlVideo) {
                                                await playVideoById(video.id)
                                              }
                                            }}
                                        />
                                    )}

                                    {activeTab === 'chat' && (
                                        <Box sx={{ height: '100%', minHeight: 300 }}>
                                            <ChatBox roomId={roomId} isBanned={isBanned} />
                                        </Box>
                                    )}

                                    {activeTab === 'moderation' && isModerator && (
                                        <Box sx={{ height: '100%', overflowY: 'auto' }}>
                                            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', mb: 2, px: 1, mt: 1 }}>
                                                <GavelIcon fontSize="small" sx={{ mr: 1 }} />
                                                {t('room.moderation_panel', 'Panneau de Modération')}
                                            </Typography>
                                            <List dense>
                                                {members.map((member) => {
                                                    const memberRole = getMemberRole(member);
                                                    const isCurrentUser = member.userId === user?.id;
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
                                </Box>
                            </Box>
                        </Box>
                    </Box>
                </Stack>
            )}

            {/* CONTEXT MENU */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
            >
                {selectedMember && (
                    <Box>
                        {/* PROMOTE */}
                        {(selectedMember.role === ROLES.MEMBER || selectedMember.role === ROLES.MANAGER) && userRole === ROLES.OWNER && (
                            <MenuItem onClick={() => handleAction('promote', selectedMember)}>
                                {t('action.promote', 'Promouvoir Manager')}
                            </MenuItem>
                        )}

                        {/* DEMOTE */}
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

            {/* SNACKBAR */}
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