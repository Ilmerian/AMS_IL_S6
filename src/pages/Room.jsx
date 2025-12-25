// src/pages/Room.jsx
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/auth';
import { useEffect, useState, useCallback, useRef } from 'react'; // Ajoutez useRef
import { useParams, useOutletContext } from 'react-router-dom'; // Ajoutez useOutletContext

// Repositories et Services
import { RoleService } from '../services/RoleService';
import { BanRepository } from '../repositories/BanRepository';
import { RealtimeService } from '../services/RealtimeService';
import { UserRepository } from "../repositories/UserRepository";
import { cacheService } from '../services/CacheService';
import { getYouTubeId } from '../utils/youtube';

// Components & Utils
import GuestUpgradeBanner from '../components/GuestUpgradeBanner';
import { useRoom } from '../hooks/useRoom';
import { usePlaylistForRoom } from '../hooks/usePlaylistForRoom';
import { PlaybackRepository } from '../repositories/PlaybackRepository'
import ChatBox from '../components/ChatBox';
import Section from '../ui/Section';
import VideoPlayerShell from '../components/VideoPlayerShell';
import PlaylistPanel from '../components/PlaylistPanel';
import { RoomService } from '../services/RoomService'

// IMPORT DU NOUVEAU HOOK
import { useVideoSync } from '../hooks/useVideoSync';

// UI Imports
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
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
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import InviteDialog from '../components/InviteDialog';

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
                        {t('room.release_control')}
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
                onClick={() => (controlInfo.requirePin ? controlInfo.requirePin(controlInfo.takeLeadership) : controlInfo.takeLeadership())}
                sx={{ ml: 1 }}
            >
                {t('room.take_control')}
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
    const { user, loading: authLoading } = useAuth();

    const { openLogin } = useOutletContext() || {};

    const hasAutoOpenedRef = useRef(false);

    useEffect(() => {
        if (!authLoading && !user && !hasAutoOpenedRef.current) {
            if (openLogin) {
                setTimeout(() => {
                    openLogin();
                }, 500);
                hasAutoOpenedRef.current = true;
            }
        }
    }, [user, authLoading, openLogin]);
    const [membersLoading, setMembersLoading] = useState(false);
    const [isModerator, setIsModerator] = useState(false);
    const [pinOpen, setPinOpen] = useState(false);
    const [pinValue, setPinValue] = useState('');
    const [pinError, setPinError] = useState('');
    const [pinOk, setPinOk] = useState(false);
    const [pinMode, setPinMode] = useState('verify'); // 'verify' | 'set'

    const pendingActionRef = useRef(null);
    const pinOkRef = useRef(false);
    useEffect(() => { pinOkRef.current = pinOk; }, [pinOk]);
    useEffect(() => {
        setPinOk(false);
        setPinValue('');
        setPinError('');
        setPinOpen(false);
        pendingActionRef.current = null;
    }, [roomId]);

    const isProduction = typeof window !== 'undefined' &&
        window.location.hostname !== 'localhost' &&
        window.location.hostname !== '127.0.0.1';

    // UI States
    const [activeTab, setActiveTab] = useState('playlist');
    const [history, setHistory] = useState([])
    const [historyLoading, setHistoryLoading] = useState(false)

    const loadHistory = useCallback(async () => {
    if (!roomId) return
    setHistoryLoading(true)
    try {
        const rows = await RoomService.getVideoHistoryForRoom(roomId)
        setHistory(rows || [])
    } catch (e) {
        console.warn('[Room] loadHistory failed:', e?.message || e)
        setHistory([])
    } finally {
        setHistoryLoading(false)
    }
    }, [roomId])
    const [pw, setPw] = useState('');
    const [inviteOpen, setInviteOpen] = useState(false);

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
    const isPinEnabled = !!room?.parental_pin_enabled;
    const closePinDialog = useCallback(() => {
        setPinOpen(false);
        setPinValue('');
        setPinError('');
        pendingActionRef.current = null;
    }, []);

    const requirePin = useCallback((actionFn) => {
    if (typeof actionFn !== 'function') {
        console.warn('[requirePin] actionFn is not a function:', actionFn);
        return;
    }

    if (!isPinEnabled) return actionFn();
    if (pinOkRef.current) return actionFn();

    pendingActionRef.current = actionFn;
    setPinMode('verify');
    setPinError('');
    setPinOpen(true);
    }, [isPinEnabled]);

    const submitPin = useCallback(async () => {
        try {
            setPinError('');
            const ok = await RoomService.verifyRoomPin(roomId, pinValue);

            if (!ok) {
                setPinError(t('room.pin_invalid', 'Invalid PIN'));
                return;
            }

            setPinOk(true);
            setPinOpen(false);

            const fn = pendingActionRef.current;
            pendingActionRef.current = null;
            if (fn) fn();
        } catch (e) {
            setPinError(e?.message || t('auth.error', 'Error'));
        }
    }, [roomId, pinValue, t]);

    const handleSavePin = useCallback(async () => {
    if (!roomId) {
        setSnackbar({ open: true, message: 'roomId is missing', severity: 'error' });
        return;
    }
    if (!user) {
        setSnackbar({ open: true, message: t('auth.login_required', 'Login required'), severity: 'warning' });
        return;
    }

    try {
        setPinError('');
        await RoomService.setRoomPin(roomId, pinValue);

        setPinOk(true);
        setPinOpen(false);
        setPinValue('');

        await refresh(); // IMPORTANT
        setSnackbar({ open: true, message: t('room.pin_saved', 'PIN saved'), severity: 'success' });
    } catch (e) {
        console.error('[PIN] save failed:', e);
        const msg = e?.message || 'Save failed (check Network tab / RLS)';
        setPinError(msg);
        setSnackbar({ open: true, message: msg, severity: 'error' });
    }
    }, [roomId, user, pinValue, refresh, t]);

    const handleDisablePin = useCallback(async () => {
    if (!roomId) {
        setSnackbar({ open: true, message: 'roomId is missing', severity: 'error' });
        return;
    }
    if (!user) {
        setSnackbar({ open: true, message: t('auth.login_required', 'Login required'), severity: 'warning' });
        return;
    }

    try {
        setPinError('');
        await RoomService.disableRoomPin(roomId);

        setPinOk(false);
        setPinOpen(false);
        setPinValue('');

        await refresh(); // IMPORTANT
        setSnackbar({ open: true, message: t('room.pin_disabled', 'PIN disabled'), severity: 'success' });
    } catch (e) {
        console.error('[PIN] disable failed:', e);
        const msg = e?.message || 'Disable failed (check Network tab / RLS)';
        setPinError(msg);
        setSnackbar({ open: true, message: msg, severity: 'error' });
    }
    }, [roomId, user, refresh, t]);

    // Moderation States
    const [members, setMembers] = useState([]);
    const [userRole, setUserRole] = useState(null);
    const [isBanned, setIsBanned] = useState(false);

    // UI Helpers
    const [anchorEl, setAnchorEl] = useState(null);
    const [selectedMember, setSelectedMember] = useState(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    // --- PLAYLIST ---
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

    const {
        playlistId,
        embedUrl,
        currentVideoId,
        playlistItems,
        addVideoByRawUrl,
        playNextVideo,
        getNextVideo,
        getPrevVideo,
        handleVideoError
    } = usePlaylistForRoom({
        room,
        roomId,
        accessGranted: !needPw || checked,
        canControlVideo
    })

    const handleAddVideo = useCallback((value) => {
        requirePin(() => addVideoByRawUrl(value));
    }, [requirePin, addVideoByRawUrl]);
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
            setMembersLoading(false);
            return;
        }

        if (userRole === 'owner' && room?.ownerId === user.id) {
            console.log('[Room] userRole already set to owner, skipping reset');
            setMembersLoading(false);
            return;
        }
        setMembersLoading(true);
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
                setMembersLoading(false);
                return;
            }

            console.log(`[Room] Cache MISS for room ${roomId}, fetching...`);

            // Charger le statut de bannissement et les membres
            const [bannedStatus, initialMembers] = await Promise.all([
                BanRepository.isUserBanned(roomId, user.id),
                RoleService.listMembers(roomId)
            ]);

            setIsBanned(bannedStatus);
            if (bannedStatus) {
                cacheService.setMemory(cacheKey, {
                    timestamp: Date.now(),
                    data: {
                        bannedStatus: true,
                        initialMembers: [],
                        currentUserRole: null
                    }
                }, cacheTTL);
                setMembersLoading(false);
                return;
            }

            setMembers(initialMembers);

            // Déterminer le rôle de l'utilisateur
            let role = null;

            // 1. Vérifier si l'utilisateur est propriétaire de la salle
            if (room?.ownerId === user.id) {
                role = 'owner';
            }
            // 2. Chercher l'utilisateur dans la liste des membres
            else if (initialMembers.length > 0) {
                const currentUserMember = initialMembers.find(m => m.userId === user.id);
                if (currentUserMember) {
                    role = currentUserMember.isOwner ? 'owner' :
                        currentUserMember.is_manager ? 'manager' : 'member';
                }
            }

            setUserRole(role);

            cacheService.setMemory(cacheKey, {
                timestamp: Date.now(),
                data: {
                    bannedStatus: false,
                    initialMembers,
                    currentUserRole: role
                }
            }, cacheTTL);

        } catch (error) {
            console.error('Error loading room data:', error);
            setSnackbar({
                open: true,
                message: error.message || t('auth.error', 'Error'),
                severity: 'error'
            });
        } finally {
            setMembersLoading(false);
        }
    }, [roomId, user, room?.ownerId, t, isProduction, userRole]);

    useEffect(() => {
        if (activeTab !== 'history') return
        loadHistory()
    }, [activeTab, loadHistory])

    useEffect(() => {
        if (!user || !room || membersLoading) {
            setIsModerator(false);
            return;
        }

        // 1. Si user est owner de la room
        if (room.ownerId === user.id) {
            setIsModerator(true);
            return;
        }

        // 2. Si userRole est owner ou manager
        if (userRole === 'owner' || userRole === 'manager') {
            setIsModerator(true);
            return;
        }

        // 3. Vérifier dans les membres
        const userMember = members.find(m => m.userId === user.id);
        setIsModerator(userMember?.isOwner || userMember?.is_manager || false);
    }, [user, room, userRole, members, membersLoading]);

    console.log('=== ROOM DEBUG INFO ===');
    console.log('isProduction:', isProduction);
    console.log('userRole:', userRole);
    console.log('isModerator:', isModerator);
    console.log('user:', user?.id);
    console.log('room ownerId:', room?.ownerId);
    console.log('members count:', members.length);
    console.log('current user in members:', members.find(m => m.userId === user?.id));
    console.log('========================');

    const handleVideoSelect = useCallback(async (url) => {
        const videoId = getYouTubeId(url);
        if (!videoId) return;

        requirePin(() => {
            if (canControlVideo) {
                changeVideo(`https://www.youtube.com/watch?v=${videoId}`);
            }
        });
    }, [requirePin, canControlVideo, changeVideo]);

    // useEffect to clear the cache when unmounting:
    useEffect(() => {
        return () => {
            // Clear the room cache when unmounting
            if (roomId && user) {
                cacheService.invalidate(`room_data_${roomId}_${user.id}`);
            }
        };
    }, [roomId, user]);

    // useEffect с loadRoomData
    useEffect(() => {
        if (!user || !roomId || roomLoading || !room || needPw) return;

        // Réinitialiser les états avant de charger
        setMembers([]);

        // Créer un timeout pour le chargement retardé
        const loadTimeout = setTimeout(() => {
            loadRoomData();
        }, 500); // Augmenter le délai pour être sûr que tout est prêt

        // Nettoyer le timeout si le composant est démonté
        return () => {
            clearTimeout(loadTimeout);
        };
    }, [roomId, user, room, roomLoading, needPw, loadRoomData]);

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

    // TRANSFERT AUTOMATIQUE DE L'HOTE 
    useEffect(() => {
        if (!room || !room.ownerId || !user) return;

        let mounted = true;
        let unsubscribe = null;

        const checkOwnerPresence = async () => {
            if (!mounted) return;

            try {
                // Get presence data
                const presenceData = await RealtimeService.getPresence(roomId);

                if (!presenceData || !mounted) return;

                // Check if owner is still present
                const ownerStillHere = presenceData.some(u =>
                    u.user_id === room.ownerId &&
                    Date.now() - (u.last_seen || 0) < 30000
                );

                if (!ownerStillHere && user.id !== room.ownerId) {
                    console.log("[OWNER LEFT] L'owner a quitté la room");

                    const list = await RoleService.listMembers(roomId);
                    const managers = list.filter(m => m.is_manager && m.userId !== room.ownerId);
                    const members = list.filter(m => !m.is_manager && !m.isOwner && m.userId !== room.ownerId);

                    const newOwner = managers[0] || members[0] || null;
                    if (!newOwner) return;

                    console.log("[NEW OWNER]", newOwner.userId);

                    if (userRole === 'owner' || userRole === 'manager') {
                        await RoleService.promote(roomId, newOwner.userId);
                        await loadRoomData();
                    }
                }
            } catch (error) {
                console.error('Error checking owner presence:', error);
            }
        };

        const setupPresenceSubscription = () => {
            if (!mounted) return;

            unsubscribe = RealtimeService.subscribePresence(roomId, async ({ users }) => {
                if (!mounted || !users) return;

                clearTimeout(presenceCheckTimeout);
                presenceCheckTimeout = setTimeout(() => {
                    checkOwnerPresence();
                }, 3000);
            });
        };

        let presenceCheckTimeout;

        const initialTimeout = setTimeout(() => {
            setupPresenceSubscription();
            checkOwnerPresence();
        }, 5000);

        return () => {
            mounted = false;
            clearTimeout(initialTimeout);
            clearTimeout(presenceCheckTimeout);
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [room, roomId, user, userRole, loadRoomData]);



    // ------------------------------------------
    // RENDER
    // ------------------------------------------

    if (roomLoading && !room) {
        return (
            <Section>
                <Typography sx={{ opacity: 0.8 }}>
                    {t('room.loading')}
                </Typography>
            </Section>
        );
    }

    if (!roomLoading && !room && err) {
        return (
            <Section>
                <Typography color="error" sx={{ mb: 1 }}>
                    {t('room.error_generic')}
                </Typography>
                <Typography sx={{ opacity: 0.8, mb: 2 }}>{err}</Typography>
                <Button variant="outlined" onClick={() => refresh()}>
                    {t('room.reload')}
                </Button>
            </Section>
        );
    }

    if (!room) {
        return (
            <Section>
                <Typography sx={{ opacity: 0.8 }}>
                    {t('room.not_found')}
                </Typography>
            </Section>
        );
    }

    if (isBanned) {
        return (
            <Box component={Section} sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="h5" color="error">
                    {t('room.banned_title')}
                </Typography>
                <Typography>{t('room.banned_message')}</Typography>
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
                    <ControlStatus controlInfo={{ ...controlInfo, requirePin }} user={user} />
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
                            {connectionStatus === 'polling' ? t('room.succes_sync') :
                                connectionStatus === 'error' ? t('room.deny_sync') : t('room.wait_sync')}
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

            {/* STATUT + BOUTON INVITER ALIGNÉS */}
            <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                <Typography sx={{ opacity: 0.8 }}>
                    {room.password ? t('room.private') : t('room.public')}
                </Typography>

                <Button
                    variant="contained"
                    color="secondary"
                    size="small"
                    startIcon={<PersonAddIcon />}
                    onClick={() => setInviteOpen(true)}
                    sx={{ borderRadius: 20, px: 2 }}
                >
                    Inviter
                </Button>

                {canControlVideo && (
                    <Button
                        variant="outlined"
                        size="small"
                        onClick={() => {
                            setPinMode('set');
                            setPinError('');
                            setPinValue('');
                            setPinOpen(true);
                        }}
                        sx={{ borderRadius: 20, px: 2 }}
                    >
                        PIN
                    </Button>
                )}
            </Stack>

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
                                url={
                                    syncVideoId
                                        ? `https://www.youtube.com/watch?v=${syncVideoId}`
                                        : embedUrl || null
                                }
                                playing={syncIsPlaying}
                                canControl={canControlVideo}
                                onPlay={() => requirePin(() => triggerPlay())}
                                onPause={() => requirePin(() => triggerPause())}
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
                                        onClick={() => {
                                            requirePin(() => {
                                                const videoIdToUse = syncVideoId || currentVideoId;
                                                const prevVideo = getPrevVideo(videoIdToUse);
                                                if (prevVideo?.url) {
                                                    changeVideo(prevVideo.url);
                                                }
                                            });
                                        }}
                                        disabled={!currentVideoId && !syncVideoId}
                                    >
                                        {t('room.previous')}
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        onClick={() => {
                                            requirePin(() => {
                                                const videoIdToUse = syncVideoId || currentVideoId;
                                                const nextVideo = getNextVideo(videoIdToUse);
                                                if (nextVideo?.url) {
                                                    changeVideo(nextVideo.url);
                                                }
                                            });
                                        }}
                                        disabled={!currentVideoId && !syncVideoId}
                                    >
                                        {t('room.next')}
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
                                    <Tab label={t('room.playlist')} value="playlist" />
                                    <Tab label={t('room.chat')} value="chat" />
                                    <Tab label={t('room.history', 'History')} value="history" />
                                    {isModerator && <Tab label={t('room.moderation')} value="moderation" />}
                                </Tabs>
                            </Box>

                            <Box sx={{ flex: 1, minHeight: 0, overflowY: activeTab === 'chat' ? 'hidden' : 'auto' }}>
                                <Box sx={{ p: 1, height: '100%' }}>
                                    {activeTab === 'playlist' && (
                                        <PlaylistPanel
                                            playlistId={playlistId}
                                            canEdit={canControlVideo}
                                            onAdd={handleAddVideo}
                                            onPlay={handleVideoSelect}
                                            currentVideoId={syncVideoId || currentVideoId}
                                            onVideoSelect={handleVideoSelect}
                                        />
                                    )}

                                    {activeTab === 'chat' && (
                                        <Box sx={{ height: '100%', minHeight: 300 }}>
                                            <ChatBox roomId={roomId} isBanned={isBanned} />
                                        </Box>
                                    )}
                                    
                                    {activeTab === 'history' && (
                                    <Box sx={{ height: '100%', overflowY: 'auto', px: 1, py: 1 }}>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                                        <Typography variant="h6">
                                            {t('room.history', 'History')}
                                        </Typography>
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            onClick={loadHistory}
                                            disabled={historyLoading}
                                        >
                                            {t('common.refresh', 'Refresh')}
                                        </Button>
                                        </Stack>

                                        {historyLoading ? (
                                        <Typography sx={{ opacity: 0.8 }}>
                                            {t('common.loading', 'Loading...')}
                                        </Typography>
                                        ) : history.length === 0 ? (
                                        <Typography sx={{ opacity: 0.8 }}>
                                            {t('room.history_empty', 'No videos watched yet in this room.')}
                                        </Typography>
                                        ) : (
                                        <List dense>
                                            {history.map((h) => {
                                            const title = h.video_title || h.video_url || `YouTube: ${h.video_youtube_id}`
                                            const when = h.created_at ? new Date(h.created_at).toLocaleString() : ''

                                            return (
                                                <ListItem key={h.id || `${h.video_youtube_id}-${h.created_at}`}>
                                                <ListItemText
                                                    primary={title}
                                                    secondary={when}
                                                />
                                                </ListItem>
                                            )
                                            })}
                                        </List>
                                        )}
                                    </Box>
                                    )}

                                    {activeTab === 'moderation' && isModerator && (
                                        <Box sx={{ height: '100%', overflowY: 'auto' }}>
                                            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', mb: 2, px: 1, mt: 1 }}>
                                                <GavelIcon fontSize="small" sx={{ mr: 1 }} />
                                                {t('room.moderation_panel')}
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
                                                                primary={isCurrentUser ? `${member.name} (You)` : member.name}
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
                                {t('action.promote')}
                            </MenuItem>
                        )}

                        {/* DEMOTE */}
                        {selectedMember.role === ROLES.MANAGER && userRole === ROLES.OWNER && (
                            <MenuItem onClick={() => handleAction('demote', selectedMember)}>
                                {t('action.demote')}
                            </MenuItem>
                        )}

                        {/* KICK/BAN */}
                        <MenuItem onClick={() => handleAction('kick', selectedMember)}>
                            {t('action.kick')}
                        </MenuItem>
                        <MenuItem onClick={() => handleAction('ban', selectedMember)} sx={{ color: 'error.main' }}>
                            {t('action.ban')}
                        </MenuItem>
                    </Box>
                )}
            </Menu>

            {/* DIALOGUE D'INVITATION */}
            <InviteDialog
                open={inviteOpen}
                onClose={() => setInviteOpen(false)}
                roomId={roomId}
            />
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
            {/* PIN DIALOG */}
            <Dialog open={pinOpen} onClose={closePinDialog} maxWidth="xs" fullWidth>
            <DialogTitle>
                {pinMode === 'set'
                ? t('room.pin_set_title', 'Set / Change PIN')
                : t('room.pin_enter_title', 'Enter PIN')}
            </DialogTitle>

            <DialogContent>
                <TextField
                autoFocus
                fullWidth
                margin="dense"
                label={t('room.pin_label', 'PIN')}
                value={pinValue}
                onChange={(e) => setPinValue(e.target.value.replace(/\D/g, '').slice(0, 8))}
                inputProps={{ inputMode: 'numeric' }}
                type="password"
                error={!!pinError}
                helperText={pinError || ' '}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                    if (pinMode === 'set') {
                        (async () => {
                        try {
                            setPinError('');
                            await RoomService.setRoomPin(roomId, pinValue);
                            setPinOk(true);
                            setPinOpen(false);
                            setPinValue('');
                        } catch (err) {
                            setPinError(err?.message || t('auth.error', 'Error'));
                        }
                        })();
                    } else {
                        submitPin();
                    }
                    }
                }}
                />
            </DialogContent>

            <DialogActions>
                <Button onClick={closePinDialog}>
                {t('common.cancel', 'Cancel')}
                </Button>

                {pinMode === 'set' && (
                    <Button variant="outlined" onClick={handleDisablePin}>
                    {t('room.pin_disable', 'Disable')}
                    </Button>
                )}

            <Button
                variant="contained"
                disabled={pinValue.length < 4}
                onClick={() => {
                    if (pinMode === 'set') handleSavePin();
                    else submitPin();
                }}
                >
                {pinMode === 'set' ? t('common.save', 'Save') : t('common.verify', 'Verify')}
            </Button>
            </DialogActions>
            </Dialog>

            </Section>
    );
}