// src/pages/Room.jsx
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/auth';
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';

// Repositories et Services
import { RoleService } from '../services/RoleService';
import { BanRepository } from '../repositories/BanRepository';
import { RealtimeService } from '../services/RealtimeService';
import { cacheService } from '../services/CacheService';
import { getYouTubeId } from '../utils/youtube';
import { RoomService } from '../services/RoomService';

// Hooks
import { useRoom } from '../hooks/useRoom';
import { usePlaylistForRoom } from '../hooks/usePlaylistForRoom';
import { useVideoSync } from '../hooks/useVideoSync';

// Components
import GuestUpgradeBanner from '../components/GuestUpgradeBanner';
import ChatBox from '../components/ChatBox';
import Section from '../ui/Section';
import VideoPlayerShell from '../components/VideoPlayerShell';
import PlaylistPanel from '../components/PlaylistPanel';
import InviteDialog from '../components/InviteDialog';

// UI Imports
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import Avatar from '@mui/material/Avatar';
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
import Badge from '@mui/material/Badge';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import PeopleIcon from '@mui/icons-material/People';
import DeleteIcon from '@mui/icons-material/Delete';


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

    const {
        canControl,
        isLeader,
        currentLeader,
        takeLeadership,
        releaseLeadership,
        requirePin,
        requestControl,
        requestPending,
        incomingRequests = [],
        respondToRequest,
    } = controlInfo || {};

    if (canControl) {
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, p: 1, bgcolor: 'success.dark', borderRadius: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircleIcon fontSize="small" />
                    <Typography variant="body2">
                        {isLeader
                            ? t('room.you_are_leader', 'You are controlling playback')
                            : t('room.you_can_control', 'You can control playback')
                        }
                    </Typography>
                    {isLeader && (
                        <Button
                            size="small"
                            variant="outlined"
                            onClick={releaseLeadership}
                            sx={{ ml: 1 }}
                        >
                            {t('room.release_control')}
                        </Button>
                    )}
                    {!isLeader && takeLeadership && (
                        <Button
                            size="small"
                            variant="outlined"
                            onClick={() => (requirePin ? requirePin(takeLeadership) : takeLeadership())}
                            sx={{ ml: 1 }}
                        >
                            {t('room.take_control')}
                        </Button>
                    )}
                </Box>
                {respondToRequest && incomingRequests.length > 0 && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Typography variant="subtitle2">
                            {t('room.control_requests', 'Control requests')}
                        </Typography>
                        <Stack spacing={0.5}>
                            {incomingRequests.map((req) => (
                                <Box key={req.userId} sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'rgba(255,255,255,0.08)', p: 1, borderRadius: 1 }}>
                                    <Typography variant="body2" sx={{ flex: 1 }}>
                                        {req.username || t('common.visitor', 'Visitor')}
                                    </Typography>
                                    <Button size="small" variant="contained" onClick={() => respondToRequest(req.userId, true)}>
                                        {t('common.accept', 'Accept')}
                                    </Button>
                                    <Button size="small" color="error" onClick={() => respondToRequest(req.userId, false)}>
                                        {t('common.decline', 'Decline')}
                                    </Button>
                                </Box>
                            ))}
                        </Stack>
                    </Box>
                )}
            </Box>
        );
    }

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, bgcolor: 'warning.dark', borderRadius: 1 }}>
            <WarningIcon fontSize="small" />
            <Typography variant="body2">
                {currentLeader
                    ? t('room.someone_controlling', 'Someone else is controlling playback')
                    : t('room.request_control', 'Request control to manage playback')
                }
            </Typography>
            <Button
                size="small"
                variant="contained"
                disabled={requestPending}
                onClick={() => {
                    if (requestControl) {
                        requestControl();
                        return;
                    }
                    (requirePin ? requirePin(takeLeadership) : takeLeadership());
                }}
                sx={{ ml: 1 }}
            >
                {requestPending
                    ? t('room.request_pending', 'Waiting for approval...')
                    : t('room.take_control')}
            </Button>
        </Box>
    );
}

function ConnectionStatus({ connectionStatus }) {
    const { t } = useTranslation(); // AJOUT DU HOOK

    const getStatusInfo = (status) => {
        switch (status) {
            case 'connected':
                return { text: t('room.sync_realtime'), color: 'success.main' };
            case 'polling':
                return { text: t('room.sync_active'), color: 'success.main' };
            case 'error':
                return { text: t('room.sync_error'), color: 'error.main' };
            default:
                return { text: t('room.sync_connecting'), color: 'grey.500' };
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
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));    const { roomId } = useParams();
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
    const [pinMode, setPinMode] = useState('verify');
    const [mobileSection, setMobileSection] = useState('video');

    const pendingActionRef = useRef(null);
    const pinOkRef = useRef(false);
    const ownerTransferRef = useRef(false);
    useEffect(() => { pinOkRef.current = pinOk; }, [pinOk]);
    useEffect(() => {
        setPinOk(false);
        setPinValue('');
        setPinError('');
        setPinOpen(false);
        pendingActionRef.current = null;
    }, [roomId]);
    useEffect(() => {
        setMembers([]);
        setOnlineUsers([]);
        setUserRole(null);
    }, [roomId, user?.id]);

    const isProduction = typeof window !== 'undefined' &&
        window.location.hostname !== 'localhost' &&
        window.location.hostname !== '127.0.0.1';

    // UI States
    const [activeTab, setActiveTab] = useState('playlist');
    const [history, setHistory] = useState([])
    const [historyLoading, setHistoryLoading] = useState(false)
    const [pw, setPw] = useState('');
    const [inviteOpen, setInviteOpen] = useState(false);

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

    // --- STATES POUR MODÉRATION & PRÉSENCE ---
    const [members, setMembers] = useState([]); // Membres issus de la BDD (Rôles)
    const [onlineUsers, setOnlineUsers] = useState([]); // Membres connectés (Realtime)
    const [userRole, setUserRole] = useState(null);
    const [isBanned, setIsBanned] = useState(false);
    const [isKicked, setIsKicked] = useState(false);
    const [modView, setModView] = useState('members'); // 'members' | 'banned'
    const [bannedUsers, setBannedUsers] = useState([]); // Liste des bannis

    // UI Helpers
    const [anchorEl, setAnchorEl] = useState(null);
    const [selectedMember, setSelectedMember] = useState(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    // --- PIN LOGIC ---
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
            await refresh();
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
            await refresh();
            setSnackbar({ open: true, message: t('room.pin_disabled', 'PIN disabled'), severity: 'success' });
        } catch (e) {
        console.error('[PIN] disable failed:', e);
        const msg = e?.message || 'Disable failed (check Network tab / RLS)';
        setPinError(msg);
        setSnackbar({ open: true, message: msg, severity: 'error' });
        }
    }, [roomId, user, refresh, t]);

    // --- SYNC & PLAYLIST ---
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
        onlineUsers: onlineUsersSync = [],
        controlInfo = {}
    } = useVideoSync({
        roomId,
        user,
        userRole
    });
    
    const canControlVideo = controlInfo.canControl;
    const controlInfoWithPin = { ...controlInfo, requirePin };

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
        const targetId = syncVideoId || currentVideoId
        playNextVideo(targetId)
    }, [playNextVideo, syncVideoId, currentVideoId])

    const verify = async (e) => {
        e.preventDefault();
        const ok = await verifyPassword(pw);
        if (ok) setPw('');
    };

    // --- HELPERS ROLE & MODERATION ---
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

    // --- CHARGEMENT DES DONNÉES (DB) ---
    const loadRoomData = useCallback(async (forceRefresh = false) => {
        if (!user || !roomId) {
            setMembersLoading(false);
            return;
        }

        setMembersLoading(true);
        const cacheKey = `room_data_${roomId}_${user.id}`;
        const cacheTTL = isProduction ? 600000 : 30000;

        try {
            if (!forceRefresh) {
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
            }

            console.log(`[Room] Cache MISS for room ${roomId}, fetching...`);

            // Charger le statut de bannissement et les membres
            const [bannedStatus, initialMembers] = await Promise.all([
                BanRepository.isUserBanned(roomId, user.id),
                RoleService.listMembers(roomId, forceRefresh) 
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

            let role = null;
            if (room?.ownerId === user.id) {
                role = 'owner';
                if (!initialMembers.length) {
                  initialMembers.push({
                    userId: user.id,
                    name: user.username || user.email || user.id.slice(0, 8),
                    email: user.email,
                    avatar_url: user.avatar_url,
                    is_manager: true,
                    isOwner: true,
                    isCurrentUser: true,
                  });
                  setMembers([...initialMembers]);
                }
            } else if (initialMembers.length > 0) {
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
    }, [roomId, user, room?.ownerId, isProduction, t]);

    useEffect(() => {
        if (activeTab !== 'history') return
        loadHistory()
    }, [activeTab, loadHistory])

    const allMembers = useMemo(() => {
        const map = new Map();
        
        members.forEach(m => map.set(m.userId, { ...m, isOnline: false }));

        onlineUsers.forEach(u => {
            if (map.has(u.user_id)) {
                const existing = map.get(u.user_id);
                map.set(u.user_id, { ...existing, isOnline: true });
            } else {
                map.set(u.user_id, {
                    userId: u.user_id,
                    name: u.username || t('common.visitor', 'Visitor'), // TRADUCTION
                    avatar_url: u.avatar_url,
                    role: ROLES.MEMBER,
                    is_manager: false,
                    isOwner: false,
                    isOnline: true
                });
            }
        });

        return Array.from(map.values());
    }, [members, onlineUsers, t]);
    const sortedMembers = useMemo(() => {
        return [...allMembers].sort((a, b) => Number(b.isOnline) - Number(a.isOnline));
    }, [allMembers]);

    useEffect(() => {
        if (!user || !room) {
            setIsModerator(false);
            return;
        }
        if (room.ownerId === user.id) {
            setIsModerator(true);
            return;
        }
        if (userRole === 'owner' || userRole === 'manager') {
            setIsModerator(true);
            return;
        }
        const userMember = members.find(m => m.userId === user.id);
        setIsModerator(userMember?.isOwner || userMember?.is_manager || false);
    }, [user, room, userRole, members]);

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
                    if (targetMember.role === ROLES.OWNER) throw new Error(t('error.cannot_demote_owner')); // TRADUCTION
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

    // Sync online users coming from useVideoSync presence tracking
    useEffect(() => {
        setOnlineUsers(onlineUsersSync || []);
    }, [onlineUsersSync]);

    useEffect(() => {
        if (!room || !room.ownerId || !user || onlineUsers.length === 0) return;

        const checkOwnerAndTransfer = async () => {
            const ownerStillHere = onlineUsers.some(u => u.user_id === room.ownerId);

            if (!ownerStillHere && user.id !== room.ownerId) {
                    console.log("[OWNER LEFT] L'owner a quitté la room");
                
                const list = await RoleService.listMembers(roomId);
                const managers = list.filter(m => m.is_manager && m.userId !== room.ownerId);
                const members = list.filter(m => !m.is_manager && !m.isOwner && m.userId !== room.ownerId);

                const newOwner = managers[0] || members[0] || null;
                
                if (newOwner) {
                    if (ownerTransferRef.current) return;
                    if (userRole === 'manager' || user.id === newOwner.userId) {
                        try {
                            ownerTransferRef.current = true;
                            console.log("Tentative de transfert de propriété vers :", newOwner.username || newOwner.name);
                            await RoomService.transferOwnership(roomId, newOwner.userId);
                            if (newOwner.userId === user.id) {
                                setUserRole('owner');
                            }
                            refresh();
                            loadRoomData(true);
                        } catch (e) {
                            console.warn('[OWNER LEFT] transfer failed:', e);
                        } finally {
                            ownerTransferRef.current = false;
                        }
                    }
                }
            }
        };

        const timer = setTimeout(checkOwnerAndTransfer, 5000);
        return () => clearTimeout(timer);

    }, [onlineUsers, room, user, userRole, roomId, refresh, loadRoomData]);

    // ÉCOUTEUR DE KICK (Suppression de rôle)
    useEffect(() => {
        if (!user || !roomId) return;

        const handleRoleChange = (payload) => {
            const eventRoomId = payload.new?.room_id || payload.old?.room_id;
            if (String(eventRoomId) !== String(roomId)) return;
            console.log("Changement de rôle détecté (Realtime) :", payload);
            loadRoomData(true);
            const eventUserId = payload.new?.user_id || payload.old?.user_id;
            
            if (eventUserId === user.id) {
                if (payload.eventType === 'DELETE') {
                    setIsKicked(true);
                }
                else if (payload.new?.is_manager === true) {
                    setSnackbar({ open: true, message: t('room.promoted_message'), severity: 'success' }); // TRADUCTION
                }
            }
        };

        const unsub = RoleService.onRoleChange(roomId, handleRoleChange);

        return () => {
            if (unsub) unsub();
        };
    }, [roomId, user, loadRoomData, t]);

    const loadBannedUsers = useCallback(async () => {
        if (!roomId) return;
        try {
            const list = await BanRepository.listBannedUsers(roomId);
            setBannedUsers(list);
        } catch (error) {
            console.error("Erreur chargement bannis:", error);
        }
    }, [roomId]);

    // EFFET : Charger la liste quand on change de vue
    useEffect(() => {
        if (activeTab === 'moderation' && modView === 'banned') {
            loadBannedUsers();
        }
    }, [activeTab, modView, loadBannedUsers]);

    // NOUVELLE ACTION : Débannir
    const handleUnbanUser = async (targetUserId, targetName) => {
        if (!window.confirm(t('confirm.unban_user', { user: targetName }))) return; // TRADUCTION
        try {
            await BanRepository.unbanUser(roomId, targetUserId);
            setSnackbar({ open: true, message: t('room.user_unbanned', { user: targetName }), severity: 'success' }); // TRADUCTION
            loadBannedUsers(); // Rafraîchir la liste
        } catch (err) {
            setSnackbar({ open: true, message: t('error.unban_failed'), severity: 'error' }); // TRADUCTION
        }
    };

    useEffect(() => {
        if (!roomId) return;

        const unsubscribe = BanRepository.onBanChange(roomId, (payload) => {
            console.log("Changement détecté dans les bans !", payload);
            loadRoomData();
            loadBannedUsers(); 
        });

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [roomId, loadRoomData, loadBannedUsers]);

    // --- RENDER ---
    if (roomLoading && !room) return <Section><Typography>{t('room.loading')}</Typography></Section>;
    if (!roomLoading && !room && err) return <Section><Typography color="error">{t('room.error_generic')}</Typography><Button onClick={() => refresh()}>{t('room.reload')}</Button></Section>;
    if (!room) return <Section><Typography>{t('room.not_found')}</Typography></Section>;
    if (isBanned) return <Section><Typography color="error">{t('room.banned_message')}</Typography></Section>;
    if (isKicked) {
        return (
            <Box component={Section} sx={{ p: 4, textAlign: 'center', mt: 4 }}>
                <Typography variant="h4" color="warning.main" gutterBottom sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                    <WarningIcon fontSize="large" />
                    {t('room.kicked_title')} 
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.8, mb: 3 }}>
                    {t('room.kicked_message')} 
                </Typography>
                <Button 
                    variant="outlined" 
                    color="inherit"
                    onClick={() => window.location.href = '/'} 
                >
                    {t('common.back_to_home')} 
                </Button>
                
                {!room.hasPassword && (
                    <Button 
                        sx={{ ml: 2, opacity: 0.6 }}
                        onClick={() => {
                            setIsKicked(false);
                            loadRoomData();
                        }}
                    >
                        {t('common.refresh')} 
                    </Button>
                )}
            </Box>
        );
    }

    const videoArea = (
        <Box
            sx={{
                width: '100%',
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

            {/* BOUTONS PREV/NEXT */}
            {canControlVideo && playlistItems.length > 1 && (
                <Box
                sx={{
                    display: 'flex',
                    gap: 1,
                    mt: 2,
                    justifyContent: 'center',
                    flexWrap: 'wrap'
                }}
                >
                    <Button
                        variant="outlined"
                        sx={{ width: { xs: 'calc(50% - 4px)', sm: 'auto' } }}
                        onClick={() => requirePin(() => {
                            const videoIdToUse = syncVideoId || currentVideoId;
                            const prevVideo = getPrevVideo(videoIdToUse);
                            if (prevVideo?.url) changeVideo(prevVideo.url);
                        })}
                        disabled={!currentVideoId && !syncVideoId}
                    >
                        {t('room.previous')}
                    </Button>
                    <Button
                        variant="outlined"
                        onClick={() => requirePin(() => {
                            const videoIdToUse = syncVideoId || currentVideoId;
                            const nextVideo = getNextVideo(videoIdToUse);
                            if (nextVideo?.url) changeVideo(nextVideo.url);
                        })}
                        disabled={!currentVideoId && !syncVideoId}
                    >
                        {t('room.next')}
                    </Button>
                </Box>
            )}
        </Box>
    );

    const sidebarArea = (
        <Box
        sx={{
            position: { xs: 'static', lg: 'absolute' },
            top: 0,
            right: 0,
            bottom: 0,

            width: { xs: '100%', lg: '450px' },

            height: { xs: '70vh', sm: '75vh', lg: 'auto' },

            display: 'flex',
            flexDirection: 'column',
            bgcolor: 'background.paper',

            borderRadius: { xs: 2, lg: 1 },
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.1)',
            maxHeight: { xs: '70vh', sm: '75vh', lg: 'none' },
            boxSizing: 'border-box'
        }}
        >
            {/* ONGLETS */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
                    <Tabs
                    value={activeTab}
                    onChange={(e, val) => setActiveTab(val)}
                    variant={isMobile ? "scrollable" : "fullWidth"}
                    scrollButtons={isMobile ? "auto" : false}
                    allowScrollButtonsMobile
                    textColor="primary"
                    indicatorColor="primary"
                    key={`tabs-${roomId}-${user?.id}`}
                    sx={{
                        '& .MuiTab-root': {
                            minWidth: isMobile ? 100 : undefined,
                            px: isMobile ? 1 : 2,
                            minHeight: isMobile ? 40 : 48
                        }
                    }}
                    >
                    <Tab label={t('room.playlist')} value="playlist" />
                    <Tab label={t('room.chat')} value="chat" />
                    <Tab label={t('room.history')} value="history" sx={{ minWidth: '60px' }} />
                    {isModerator && <Tab label={t('room.moderation')} value="moderation" sx={{ minWidth: '60px' }} />}
                </Tabs>
            </Box>

            {/* CONTENU DES ONGLETS */}
            <Box
            sx={{
                flex: 1,
                minHeight: 0,
                overflow: 'hidden'
            }}
            >
                <Box sx={{ p: { xs: 1, sm: 1 }, height: '100%', overflowY: 'auto' }}>
                    {activeTab === 'playlist' && (
                        <Box sx={{ height: '100%', overflowY: 'auto' }}>
                            <PlaylistPanel
                                playlistId={playlistId}
                                canEdit={canControlVideo}
                                onAdd={handleAddVideo}
                                onPlay={handleVideoSelect}
                                currentVideoId={syncVideoId || currentVideoId}
                                onVideoSelect={handleVideoSelect}
                            />
                        </Box>
                    )}

                    {activeTab === 'chat' && (
                        <Box sx={{ height: '100%', minHeight: 0, overflow: 'hidden' }}>
                            <ChatBox 
                                roomId={roomId} 
                                isBanned={isBanned}
                                isModerator={isModerator || userRole === 'owner'} 
                            />
                        </Box>
                    )}
                    
                    {activeTab === 'history' && (
                        <Box sx={{ height: '100%', overflowY: 'auto', px: 1, py: 1 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: { xs: 1, sm: 1 } }}>
                                <Typography variant="h6"> {t('room.history', 'History')}</Typography>
                                <Button
                                size="small"
                                variant="outlined"
                                onClick={loadHistory}
                                disabled={historyLoading}
                                sx={{ width: { xs: '100%', sm: 'auto' } }}
                                >
                                    {t('common.refresh')}
                                </Button>
                            </Stack>
                                            {historyLoading ? (
                                                <Typography sx={{ opacity: 0.8 }}>{t('common.loading')}</Typography>
                                            ) : history.length === 0 ? (
                                                <Typography sx={{ opacity: 0.8 }}>{t('room.history_empty')}</Typography>
                                            ) : (
                                                <List dense sx={{ pr: 0.5 }}>
                                                    {history.map((h) => {
                                                        const yid = h.video_youtube_id || getYouTubeId(h.video_url);
                                                        const thumb = yid ? `https://i.ytimg.com/vi/${yid}/mqdefault.jpg` : null;
                                                        const title = h.video_title || h.video_url || t('room.history_empty');

                                                        const playFromHistory = () => {
                                                            if (!yid) return;
                                                            requirePin(() => changeVideo(`https://www.youtube.com/watch?v=${yid}`));
                                                        };

                                                        return (
                                                            <ListItemButton
                                                                key={h.id || `${h.video_youtube_id}-${h.created_at}`}
                                                                alignItems="center"
                                                                disableGutters
                                                                sx={{
                                                                    py: 0.75,
                                                                    px: 0.5,
                                                                    borderBottom: '1px solid rgba(255,255,255,0.08)'
                                                                }}
                                                                onClick={playFromHistory}
                                                            >
                                                                {thumb && (
                                                                    <ListItemAvatar sx={{ mr: 1.25, minWidth: 60 }}>
                                                                        <Avatar
                                                                            src={thumb}
                                                                            variant="rounded"
                                                                            sx={{ width: 72, height: 48, borderRadius: 1 }}
                                                                        />
                                                                    </ListItemAvatar>
                                                                )}
                                                                <ListItemText
                                                                    primary={title}
                                                                    secondary={h.created_at ? new Date(h.created_at).toLocaleString() : ''}
                                                                    primaryTypographyProps={{
                                                                        sx: { fontSize: { xs: '0.95rem', sm: '1rem' }, wordBreak: 'break-word' }
                                                                    }}
                                                                    secondaryTypographyProps={{
                                                                        sx: { fontSize: { xs: '0.75rem', sm: '0.8rem' }, opacity: 0.75 }
                                                                    }}
                                                                />
                                                            </ListItemButton>
                                                        );
                                                    })}
                                                </List>
                                            )}
                                        </Box>
                                    )}

                    {activeTab === 'moderation' && isModerator && (
                        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', mb: 2, px: 1, mt: 1 }}>
                                <GavelIcon fontSize="small" sx={{ mr: 1 }} />
                                {t('room.moderation_panel')}
                            </Typography>
                            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                                <ToggleButtonGroup
                                    value={modView}
                                    exclusive
                                    onChange={(e, newView) => { if (newView) setModView(newView); }}
                                    size="small"
                                    color="primary"
                                    sx={{
                                        width: { xs: '100%', sm: 'auto' },
                                        '& .MuiToggleButton-root': { flex: 1 }
                                    }}
                                >
                                    <ToggleButton value="members">{t('moderation.actif')}</ToggleButton>
                                    <ToggleButton value="banned">{t('moderation.ban')}</ToggleButton>
                                </ToggleButtonGroup>
                            </Box>
                            {modView === 'members' && (
                                <List dense sx={{ overflowY: 'auto', flex: 1 }}>
                                    {sortedMembers.map((member) => {
                                        const memberRole = getMemberRole(member);
                                        const isCurrentUser = member.userId === user?.id;
                                        const canActOn = !isCurrentUser && canInteract(memberRole, member.userId);
                                        return (
                                            <ListItem
                                                key={member.userId}
                                                sx={{ py: 0.75 }}
                                                secondaryAction={
                                                    canActOn && (
                                                        <IconButton edge="end" onClick={(e) => {
                                                            setAnchorEl(e.currentTarget);
                                                            setSelectedMember({ ...member, name: member.name, role: memberRole });
                                                        }}>
                                                            <MoreVertIcon />
                                                        </IconButton>
                                                    )
                                                }
                                            >
                                                <ListItemAvatar><Avatar src={member.avatar_url} sx={{ width: { xs: 36, sm: 40 }, height: { xs: 36, sm: 40 } }}/></ListItemAvatar>
                                                <ListItemText
                                                    primary={
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                                                            {isCurrentUser ? t('room.user_you', { name: member.name }) : member.name}
                                                            {member.isOnline && <Box sx={{ width: 8, height: 8, bgcolor: 'success.main', borderRadius: '50%' }} />}
                                                        </Box>
                                                    }
                                                    secondary={getRoleBadge(memberRole)}
                                                />
                                            </ListItem>
                                        );
                                    })}
                                </List>
                            )}
                            {modView === 'banned' && (
                                <Box sx={{ overflowY: 'auto', flex: 1 }}>
                                    {bannedUsers.length === 0 ? (
                                        <Typography variant="body2" sx={{ opacity: 0.6, textAlign: 'center', mt: 4 }}>
                                            {t('moderation.no_banned_users')}
                                        </Typography>
                                    ) : (
                                        <List dense>
                                            {bannedUsers.map((banned) => (
                                                <ListItem
                                                    key={banned.userId}
                                                    secondaryAction={
                                                        <Button variant="outlined" size="small" color="success" onClick={() => handleUnbanUser(banned.userId, banned.name)}>
                                                            {t('action.unban')}
                                                        </Button>
                                                    }
                                                >
                                                    <ListItemAvatar><Avatar src={banned.avatar_url} /></ListItemAvatar>
                                                    <ListItemText primary={banned.name} secondary={t('moderation.banned_date', { date: new Date(banned.bannedAt).toLocaleDateString() })} />
                                                </ListItem>
                                            ))}
                                        </List>
                                    )}
                                </Box>
                            )}
                        </Box>
                    )}
                </Box>
            </Box>
        </Box>
    );

    return (
        <Section sx={{ px: { xs: 1, sm: 0 } }}>
            {/* --- BANNIÈRES & STATUTS --- */}
            {!user && (
                <Box sx={{ mb: { xs: 1.5, sm: 2 } }}>
                    <GuestUpgradeBanner />
                </Box>
            )}

            {user && controlInfo && (
                <Box sx={{ mb: { xs: 1, sm: 2 } }}>
                    <ControlStatus controlInfo={controlInfoWithPin} user={user} />
                </Box>
            )}
            {user && (
                <Box sx={{ mb: { xs: 1, sm: 1 } }}>
                    <ConnectionStatus connectionStatus={connectionStatus} />
                </Box>
            )}

            {/* --- HEADER --- */}
            <Box sx={{ pb: 2, mb: 2, borderBottom: '1px solid rgba(255,255,255,0.4)' }}>
                <Typography
                    variant="h4"
                    sx={{
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                        fontSize: { xs: '1.35rem', sm: '1.6rem', md: '2.125rem' },
                        lineHeight: { xs: 1.15, md: 1.2 },
                        wordBreak: 'break-word'
                    }}
                >
                    {room.name}
                </Typography>
            </Box>

            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                alignItems={{ xs: 'stretch', sm: 'center' }}
                spacing={2}
                sx={{
                    mb: 2,
                    gap: 1,
                    '& .MuiButton-root': {
                        width: { xs: '100%', sm: 'auto' }
                    }
                }}
                >
                <Typography sx={{ opacity: 0.8, textAlign: { xs: 'left', sm: 'inherit' } }}>
                    {room.hasPassword ? t('room.private') : t('room.public')}
                </Typography>

                <Button
                    variant="contained"
                    color="secondary"
                    size="small"
                    startIcon={<PersonAddIcon />}
                    onClick={() => setInviteOpen(true)}
                    fullWidth={isMobile}
                    sx={{ borderRadius: 20, px: 2 }}
                >
                    {t('room.invite')}
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
                        fullWidth={isMobile}
                        sx={{ borderRadius: 20, px: 2 }}
                    >
                        {t('room.pin_button')}
                    </Button>
                )}
            </Stack>

            {/* --- CONTENU PRINCIPAL --- */}
            {needPw && !checked ? (
                // FORMULAIRE MOT DE PASSE
                <Box component="form" onSubmit={verify} sx={{ mt: 2, maxWidth: 480 }}>
                    <Stack spacing={2}>
                        <Typography>{t('room.enterPassword')}</Typography>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                            <TextField
                                type="password"
                                placeholder={t('room.password_placeholder')}
                                value={pw}
                                onChange={(e) => setPw(e.target.value)}
                                fullWidth
                            />
                            <Button
                                type="submit"
                                variant="contained"
                                sx={{ width: { xs: '100%', sm: 'auto' } }}
                            >
                                {t('room.join')}
                            </Button>
                        </Stack>
                        {err && <Typography color="error" role="alert">{err}</Typography>}
                    </Stack>
                </Box>
            ) : (
                // LAYOUT VIDEO + SIDEBAR
                <>
                {isMobile ? (
                    <Stack spacing={2} sx={{ mt: 2 }}>
                        <ToggleButtonGroup
                            value={mobileSection}
                            exclusive
                            onChange={(e, val) => { if (val) setMobileSection(val); }}
                            fullWidth
                            color="primary"
                        >
                            <ToggleButton value="video">{t('room.video_section', 'Видео')}</ToggleButton>
                            <ToggleButton value="sidebar">{t('room.sidebar_section', 'Чат и плейлист')}</ToggleButton>
                        </ToggleButtonGroup>
                        {mobileSection === 'video' ? videoArea : sidebarArea}
                    </Stack>
                ) : (
                    <Box
                    sx={{
                        mt: 2,
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        px: { xs: 1, sm: 0 },
                        gap: { xs: 1.5, sm: 2 }
                    }}
                    >
                        <Box sx={{ position: 'relative', width: '100%' }}>
                            <Box
                                sx={{
                                    mr: { xs: 0, lg: '466px' },
                                    width: { xs: '100%', lg: 'auto' },
                                    mb: { xs: 1.5, lg: 0 },
                                    minWidth: 0
                                }}
                            >
                                {videoArea}
                            </Box>
                            {sidebarArea}
                        </Box>
                    </Box>
                )}
                </>
            )}

            {/* MENUS FLOTTANTS ET DIALOGUES */}
            <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
            PaperProps={{
                sx: {
                '& .MuiMenuItem-root': { minHeight: { xs: 44, sm: 36 } }
                }
            }}
            >
                {selectedMember && (
                    <Box>
                        {(selectedMember.role === ROLES.MEMBER || selectedMember.role === ROLES.MANAGER) && userRole === ROLES.OWNER && (
                            <MenuItem onClick={() => handleAction('promote', selectedMember)}>{t('action.promote')}</MenuItem>
                        )}
                        {selectedMember.role === ROLES.MANAGER && userRole === ROLES.OWNER && (
                            <MenuItem onClick={() => handleAction('demote', selectedMember)}>{t('action.demote')}</MenuItem>
                        )}
                        <MenuItem onClick={() => handleAction('kick', selectedMember)}>{t('action.kick')}</MenuItem>
                        <MenuItem onClick={() => handleAction('ban', selectedMember)} sx={{ color: 'error.main' }}>{t('action.ban')}</MenuItem>
                    </Box>
                )}
            </Menu>

            <InviteDialog open={inviteOpen} onClose={() => setInviteOpen(false)} roomId={roomId} />
            <Snackbar
            open={snackbar.open}
            autoHideDuration={4000}
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            sx={{ px: { xs: 1, sm: 0 } }}
            >
                <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>

            <Dialog open={pinOpen} onClose={closePinDialog} maxWidth="xs" fullWidth>
                <DialogTitle>{pinMode === 'set' ? t('room.pin_set_title') : t('room.pin_enter_title')}</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus fullWidth margin="dense"
                        label={t('room.pin_label')} type="password"
                        inputProps={{ inputMode: 'numeric' }}
                        value={pinValue} onChange={(e) => setPinValue(e.target.value.replace(/\D/g, '').slice(0, 8))}
                        error={!!pinError} helperText={pinError}
                        onKeyDown={(e) => { if (e.key === 'Enter') pinMode === 'set' ? handleSavePin() : submitPin() }}
                    />
                </DialogContent>
                <DialogActions
                sx={{
                    flexDirection: { xs: 'column', sm: 'row' },
                    alignItems: { xs: 'stretch', sm: 'center' },
                    gap: { xs: 1, sm: 0.5 },
                    px: { xs: 2, sm: 1.5 },
                    pb: { xs: 2, sm: 1.5 }
                }}
                >
                <Button onClick={closePinDialog} sx={{ width: { xs: '100%', sm: 'auto' } }}>
                    {t('common.cancel')}
                </Button>

                {pinMode === 'set' && (
                    <Button color="error" onClick={handleDisablePin} sx={{ width: { xs: '100%', sm: 'auto' } }}>
                    {t('room.pin_disable')}
                    </Button>
                )}

                <Button
                    variant="contained"
                    onClick={() => pinMode === 'set' ? handleSavePin() : submitPin()}
                    sx={{ width: { xs: '100%', sm: 'auto' } }}
                >
                    {pinMode === 'set' ? t('common.save') : t('common.verify')}
                </Button>
                </DialogActions>
            </Dialog>
        </Section>
    );
}
