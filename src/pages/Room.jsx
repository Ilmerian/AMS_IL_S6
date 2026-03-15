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
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
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
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import PeopleIcon from '@mui/icons-material/People';
import HistoryIcon from '@mui/icons-material/History';
import CircularProgress from '@mui/material/CircularProgress';
import MovieIcon from '@mui/icons-material/Movie';

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

function ControlStatus({ controlInfo, onRequestManager, requestStatus }) {
    const { t } = useTranslation();

    if (controlInfo.canControl) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, bgcolor: 'success.dark', borderRadius: 1 }}>
                <CheckCircleIcon fontSize="small" />
                <Typography variant="body2">
                    {t('room.you_can_control', 'Vous pouvez contrôler la lecture')}
                </Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid rgba(255,255,255,0.1)' }}>
            <Typography variant="body2" sx={{ flex: 1, opacity: 0.8 }}>
                {t('room.read_only_mode', 'Mode spectateur. Devenez manager pour contrôler.')}
            </Typography>

            <Button
                size="small"
                variant="outlined"
                color="secondary"
                disabled={requestStatus === 'pending'}
                onClick={onRequestManager}
                startIcon={requestStatus === 'pending' ? <CircularProgress size={16} /> : <GavelIcon />}
            >
                {requestStatus === 'pending'
                    ? t('room.request_sent', 'Demande envoyée...')
                    : t('room.request_manager', 'Demander Manager')}
            </Button>
        </Box>
    );
}

function ConnectionStatus({ connectionStatus }) {
    const { t } = useTranslation();

    const getStatusInfo = (status) => {
        switch (status) {
            case 'connected': return { text: t('room.sync_realtime'), color: 'success.main' };
            case 'polling': return { text: t('room.sync_active'), color: 'warning.main' };
            case 'error': return { text: t('room.sync_error'), color: 'error.main' };
            default: return { text: t('room.sync_connecting'), color: 'grey.500' };
        }
    };

    const statusInfo = getStatusInfo(connectionStatus);

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, borderRadius: 1, backgroundColor: statusInfo.color, opacity: 0.9 }}>
            <Typography variant="body2" sx={{ color: 'white', fontSize: '0.8rem' }}>{statusInfo.text}</Typography>
        </Box>
    );
}

export default function Room() {
    const { t } = useTranslation();
    const { roomId } = useParams();
    const { user, loading: authLoading } = useAuth();
    const { openLogin } = useOutletContext() || {};

    const hasAutoOpenedRef = useRef(false);
    const [membersLoading, setMembersLoading] = useState(false);
    const [isModerator, setIsModerator] = useState(false);
    const [pinOpen, setPinOpen] = useState(false);
    const [pinValue, setPinValue] = useState('');
    const [pinError, setPinError] = useState('');
    const [pinOk, setPinOk] = useState(false);
    const [pinMode, setPinMode] = useState('verify');
    const pendingActionRef = useRef(null);
    const pinOkRef = useRef(false);

    const [managerRequestStatus, setManagerRequestStatus] = useState('idle');
    const [broadcastChannel, setBroadcastChannel] = useState(null);
    const [pendingRequestUser, setPendingRequestUser] = useState(null);

    useEffect(() => { pinOkRef.current = pinOk; }, [pinOk]);

    const [activeTab, setActiveTab] = useState('playlist');
    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [pw, setPw] = useState('');
    const [inviteOpen, setInviteOpen] = useState(false);

    const { room, needPw, checked, error: err, loading: roomLoading, refresh, verifyPassword } = useRoom(roomId);

    const [members, setMembers] = useState([]);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [userRole, setUserRole] = useState(null);
    const [isBanned, setIsBanned] = useState(false);
    const [isKicked, setIsKicked] = useState(false);
    const [modView, setModView] = useState('members');
    const [bannedUsers, setBannedUsers] = useState([]);
    const [anchorEl, setAnchorEl] = useState(null);
    const [selectedMember, setSelectedMember] = useState(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

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
        isHydrated,
        controlInfo
    } = useVideoSync({ roomId, user, userRole });

    const canControlVideo = controlInfo.canControl;

    const {
        playlistId,
        embedUrl,
        currentVideoId,
        playlistItems,
        playbackPositionSec,
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
    });

    const effectiveSeekTimestamp =
        seekTimestamp !== null && seekTimestamp !== undefined
            ? seekTimestamp
            : (playbackPositionSec > 0 ? playbackPositionSec : null);

    useEffect(() => {
        if (!roomId || !user) return;
        const channel = RealtimeService.joinBroadcast(roomId, (event) => {
            if (event.type === 'REQUEST_MANAGER' && userRole === 'owner') {
                setPendingRequestUser({ id: event.userId, name: event.username });
                new Audio('/notification.mp3').play().catch(() => {});
            }
            if (event.type === 'RESPONSE_MANAGER' && event.targetId === user.id) {
                setManagerRequestStatus('idle');
                if (event.approved) setSnackbar({ open: true, message: t('room.request_accepted'), severity: 'success' });
                else setSnackbar({ open: true, message: t('room.request_rejected'), severity: 'error' });
            }
        });
        setBroadcastChannel(channel);
        return () => channel && channel.unsubscribe();
    }, [roomId, user, userRole, t]);

    const handleRequestManager = async () => {
        if (!broadcastChannel) return;
        setManagerRequestStatus('pending');
        await broadcastChannel.send('REQUEST_MANAGER', { userId: user.id, username: user.user_metadata?.username || user.email });
        setTimeout(() => setManagerRequestStatus('idle'), 30000);
    };

    const handleApproveRequest = async () => {
        if (!pendingRequestUser) return;
        try {
            await RoleService.promote(roomId, pendingRequestUser.id);
            setPendingRequestUser(null);
            broadcastChannel.send('RESPONSE_MANAGER', { targetId: pendingRequestUser.id, approved: true });
            setSnackbar({ open: true, message: `Vous avez promu ${pendingRequestUser.name}`, severity: 'success' });
        } catch (e) {
            setSnackbar({ open: true, message: 'Erreur', severity: 'error' });
        }
    };

    const handleRejectRequest = () => {
        if (!pendingRequestUser) return;
        broadcastChannel.send('RESPONSE_MANAGER', { targetId: pendingRequestUser.id, approved: false });
        setPendingRequestUser(null);
    };

    useEffect(() => {
        if (!authLoading && !user && !hasAutoOpenedRef.current && openLogin) {
            setTimeout(() => openLogin(), 500);
            hasAutoOpenedRef.current = true;
        }
    }, [user, authLoading, openLogin]);

    useEffect(() => {
        setPinOk(false); setPinValue(''); setPinError(''); setPinOpen(false);
    }, [roomId]);

    const loadHistory = useCallback(async () => {
        if (!roomId) return;
        setHistoryLoading(true);
        try {
            const rows = await RoomService.getVideoHistoryForRoom(roomId);
            setHistory(rows || []);
        } catch (e) { console.warn(e); } finally { setHistoryLoading(false); }
    }, [roomId]);

    useEffect(() => { if (activeTab === 'history') loadHistory(); }, [activeTab, loadHistory]);

    const loadRoomData = useCallback(async (forceRefresh = false) => {
        if (!user || !roomId) { setMembersLoading(false); return; }
        if (userRole === 'owner' && room?.ownerId === user.id) { setMembersLoading(false); return; }
        setMembersLoading(true);
        try {
            const [bannedStatus, initialMembers] = await Promise.all([
                BanRepository.isUserBanned(roomId, user.id),
                RoleService.listMembers(roomId, forceRefresh)
            ]);
            setIsBanned(bannedStatus);
            if (bannedStatus) { setMembersLoading(false); return; }
            setMembers(initialMembers);
            let role = null;
            if (room?.ownerId === user.id) role = 'owner';
            else if (initialMembers.length > 0) {
                const currentUserMember = initialMembers.find(m => m.userId === user.id);
                if (currentUserMember) role = currentUserMember.isOwner ? 'owner' : currentUserMember.is_manager ? 'manager' : 'member';
            }
            setUserRole(role);
        } catch (error) { console.error(error); } finally { setMembersLoading(false); }
    }, [roomId, user, room?.ownerId, userRole]);

    const allMembers = useMemo(() => {
        const map = new Map();
        members.forEach(m => map.set(m.userId, { ...m, isOnline: false }));
        onlineUsers.forEach(u => {
            if (map.has(u.user_id)) {
                map.set(u.user_id, { ...map.get(u.user_id), isOnline: true });
            } else {
                map.set(u.user_id, { userId: u.user_id, name: u.username || 'Visiteur', avatar_url: u.avatar_url, role: ROLES.MEMBER, isOnline: true });
            }
        });
        return Array.from(map.values());
    }, [members, onlineUsers]);

    useEffect(() => {
        if (!user || !room) { setIsModerator(false); return; }
        if (room.ownerId === user.id || userRole === 'owner' || userRole === 'manager') { setIsModerator(true); return; }
        const userMember = members.find(m => m.userId === user.id);
        setIsModerator(userMember?.isOwner || userMember?.is_manager || false);
    }, [user, room, userRole, members]);

    const closePinDialog = useCallback(() => { setPinOpen(false); setPinValue(''); setPinError(''); pendingActionRef.current = null; }, []);

    const requirePin = useCallback((actionFn) => {
        if (typeof actionFn !== 'function') return;
        if (!room?.parental_pin_enabled) return actionFn();
        if (pinOkRef.current) return actionFn();
        pendingActionRef.current = actionFn;
        setPinMode('verify'); setPinError(''); setPinOpen(true);
    }, [room?.parental_pin_enabled]);

    const submitPin = async () => {
        try {
            setPinError('');
            const ok = await RoomService.verifyRoomPin(roomId, pinValue);
            if (!ok) { setPinError(t('room.pin_invalid')); return; }
            setPinOk(true); setPinOpen(false);
            if (pendingActionRef.current) pendingActionRef.current();
            pendingActionRef.current = null;
        } catch (e) { setPinError(e.message); }
    };

    const handleSavePin = async () => {
        try {
            await RoomService.setRoomPin(roomId, pinValue);
            setPinOk(true); setPinOpen(false); setPinValue(''); await refresh();
            setSnackbar({ open: true, message: t('room.pin_saved'), severity: 'success' });
        } catch (e) { setPinError(e.message); }
    };

    const handleDisablePin = async () => {
        try {
            await RoomService.disableRoomPin(roomId);
            setPinOk(false); setPinOpen(false); await refresh();
            setSnackbar({ open: true, message: t('room.pin_disabled'), severity: 'success' });
        } catch (e) { setPinError(e.message); }
    };

    const handleVideoSelect = async (url, title = null) => {
        const videoId = getYouTubeId(url);
        if (videoId) requirePin(() => canControlVideo && changeVideo(`https://www.youtube.com/watch?v=${videoId}`, title));
    };

    const handleAddVideo = (value) => requirePin(() => addVideoByRawUrl(value));
    const handleVideoEnded = () => playNextVideo();
    const verify = async (e) => { e.preventDefault(); if (await verifyPassword(pw)) setPw(''); };

    useEffect(() => {
        if (!user || !roomId || roomLoading || !room || needPw) return;
        setMembers([]);
        const loadTimeout = setTimeout(() => loadRoomData(), 500);
        return () => clearTimeout(loadTimeout);
    }, [roomId, user, room, roomLoading, needPw, loadRoomData]);

    useEffect(() => {
        if (!roomId || !user) return;
        const unsubscribe = RealtimeService.subscribeToRoomPresence(roomId, user, setOnlineUsers);
        return () => unsubscribe();
    }, [roomId, user]);

    useEffect(() => {
        if (!user || !roomId) return;
        const handleRoleChange = (payload) => {
            if (String(payload.new?.room_id || payload.old?.room_id) !== String(roomId)) return;
            loadRoomData(true);
            if ((payload.new?.user_id || payload.old?.user_id) === user.id) {
                if (payload.eventType === 'DELETE') setIsKicked(true);
                else if (payload.new?.is_manager) setSnackbar({ open: true, message: t('room.promoted_message'), severity: 'success' });
            }
        };
        const unsub = RoleService.onRoleChange(roomId, handleRoleChange);
        return () => unsub && unsub();
    }, [roomId, user, loadRoomData, t]);

    useEffect(() => {
        if (!roomId) return;
        const unsub = BanRepository.onBanChange(roomId, () => { loadRoomData(); loadBannedUsers(); });
        return () => unsub && unsub();
    }, [roomId, loadRoomData]);

    const loadBannedUsers = async () => {
        if (roomId) try { setBannedUsers(await BanRepository.listBannedUsers(roomId)); } catch (e) {}
    };
    useEffect(() => { if (activeTab === 'moderation' && modView === 'banned') loadBannedUsers(); }, [activeTab, modView]);

    const getMemberRole = (m) => m ? (m.isOwner ? ROLES.OWNER : m.is_manager ? ROLES.MANAGER : ROLES.MEMBER) : null;
    const canInteract = (targetRole, targetId) => userRole && targetId !== user?.id && (userRole === ROLES.OWNER || (userRole === ROLES.MANAGER && targetRole === ROLES.MEMBER));

    const handleAction = async (action, target) => {
        setAnchorEl(null);
        try {
            if (action === 'promote') await RoleService.promote(roomId, target.userId);
            else if (action === 'demote') await RoleService.demote(roomId, target.userId);
            else if (action === 'kick') await RoleService.remove(roomId, target.userId);
            else if (action === 'ban') { await BanRepository.banUser(roomId, target.userId); await RoleService.remove(roomId, target.userId); }
            loadRoomData();
        } catch (e) { setSnackbar({ open: true, message: e.message, severity: 'error' }); }
    };
    const handleUnbanUser = async (id, name) => {
        if (window.confirm(t('confirm.unban_user', { user: name }))) {
            await BanRepository.unbanUser(roomId, id); loadBannedUsers();
        }
    };

    if (roomLoading && !room) return <Section><Typography>{t('room.loading')}</Typography></Section>;
    if (!room && err) return <Section><Typography color="error">{t('room.error_generic')}</Typography><Button onClick={refresh}>{t('room.reload')}</Button></Section>;
    if (!room) return <Section><Typography>{t('room.not_found')}</Typography></Section>;
    if (isBanned) return <Section><Typography color="error">{t('room.banned_message')}</Typography></Section>;

    if (room && (!needPw || checked) && connectionStatus === 'connecting' && !isHydrated) {
        return (
            <Section>
                <Box sx={{ py: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <CircularProgress />
                    <Typography>{t('room.loading')}</Typography>
                </Box>
            </Section>
        );
    }

    if (isKicked) return (
        <Box component={Section} sx={{ p: 4, textAlign: 'center', mt: 4 }}>
            <Typography variant="h4" color="warning.main" gutterBottom sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}><WarningIcon fontSize="large" /> {t('room.kicked_title')}</Typography>
            <Typography variant="body1" sx={{ mb: 3 }}>{t('room.kicked_message')}</Typography>
            <Button variant="outlined" onClick={() => window.location.href = '/'}>{t('common.back_to_home')}</Button>
            {!room.password && <Button sx={{ ml: 2 }} onClick={() => { setIsKicked(false); loadRoomData(); }}>{t('common.refresh')}</Button>}
        </Box>
    );

    return (
        <Section>
            {!user && <Box sx={{ mb: 2 }}><GuestUpgradeBanner /></Box>}

            {user && (
                <Box sx={{ mb: 2 }}>
                    <ControlStatus
                        controlInfo={{ ...controlInfo, requirePin }}
                        user={user}
                        onRequestManager={handleRequestManager}
                        requestStatus={managerRequestStatus}
                    />
                </Box>
            )}

            {user && <Box sx={{ mb: 1 }}><ConnectionStatus connectionStatus={connectionStatus} /></Box>}

            <Box sx={{ pb: 2, mb: 2, borderBottom: '1px solid rgba(255,255,255,0.4)' }}>
                <Typography variant="h4" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: { xs: '1.5rem', md: '2.125rem' } }}>{room.name}</Typography>
            </Box>

            <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                <Typography sx={{ opacity: 0.8 }}>{room.password ? t('room.private') : t('room.public')}</Typography>
                <Button variant="contained" color="secondary" size="small" startIcon={<PersonAddIcon />} onClick={() => setInviteOpen(true)} sx={{ borderRadius: 20 }}>{t('room.invite')}</Button>
                {canControlVideo && <Button variant="outlined" size="small" onClick={() => { setPinMode('set'); setPinValue(''); setPinError(''); setPinOpen(true); }} sx={{ borderRadius: 20 }}>{t('room.pin_button')}</Button>}
            </Stack>

            {needPw && !checked ? (
                <Box component="form" onSubmit={verify} sx={{ mt: 2, maxWidth: 480 }}>
                    <Stack spacing={2}>
                        <Typography>{t('room.enterPassword')}</Typography>
                        <Stack direction="row" spacing={1}>
                            <TextField type="password" placeholder={t('room.password_placeholder')} value={pw} onChange={(e) => setPw(e.target.value)} fullWidth />
                            <Button type="submit" variant="contained">{t('room.join')}</Button>
                        </Stack>
                        {err && <Typography color="error">{err}</Typography>}
                    </Stack>
                </Box>
            ) : (
                <Box sx={{ mt: 2, position: 'relative', display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ position: 'relative', width: '100%' }}>
                        <Box sx={{ mr: { xs: 0, lg: '466px' }, width: { xs: '100%', lg: 'auto' }, mb: { xs: 2, lg: 0 } }}>
                            <VideoPlayerShell
                                url={syncVideoId ? `https://www.youtube.com/watch?v=${syncVideoId}` : embedUrl || null}
                                playing={syncIsPlaying}
                                canControl={canControlVideo}
                                onPlay={() => requirePin(() => triggerPlay())}
                                onPause={() => requirePin(() => triggerPause())}
                                onSeek={triggerSeek}
                                onProgress={updateLocalProgress}
                                seekToTimestamp={effectiveSeekTimestamp}
                                onEnded={handleVideoEnded}
                                onError={handleVideoError}
                            />
                            {canControlVideo && playlistItems.length > 1 && (
                                <Box sx={{ display: 'flex', gap: 1, mt: 2, justifyContent: 'center' }}>
                                    <Button variant="outlined" onClick={() => requirePin(() => { const v = syncVideoId || currentVideoId; const p = getPrevVideo(v); if(p) changeVideo(p.url, p.title); })} disabled={!currentVideoId && !syncVideoId}>{t('room.previous')}</Button>
                                    <Button variant="outlined" onClick={() => requirePin(() => { const v = syncVideoId || currentVideoId; const n = getNextVideo(v); if(n) changeVideo(n.url, n.title); })} disabled={!currentVideoId && !syncVideoId}>{t('room.next')}</Button>
                                </Box>
                            )}
                        </Box>

                        <Box sx={{ position: { xs: 'static', lg: 'absolute' }, top: 0, right: 0, bottom: 0, width: { xs: '100%', lg: '450px' }, mt: { xs: 2, lg: 0 }, display: 'flex', flexDirection: 'column', bgcolor: 'background.paper', borderRadius: 1, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                                <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} variant="fullWidth" textColor="primary" indicatorColor="primary">
                                    <Tab label={t('room.playlist')} value="playlist" />
                                    <Tab label={t('room.chat')} value="chat" />
                                    <Tab label={t('room.history')} value="history" sx={{minWidth:'60px'}} />
                                    {isModerator && <Tab label={t('room.moderation')} value="moderation" sx={{minWidth:'60px'}} />}
                                </Tabs>
                            </Box>
                            <Box sx={{ flex: 1, overflowY: activeTab === 'chat' ? 'hidden' : 'auto', p: 1 }}>
                                {activeTab === 'playlist' && <PlaylistPanel playlistId={playlistId} canEdit={canControlVideo} onAdd={handleAddVideo} onPlay={handleVideoSelect} currentVideoId={syncVideoId || currentVideoId} />}
                                {activeTab === 'chat' && <Box sx={{ height: '100%', minHeight: 300 }}><ChatBox roomId={roomId} isBanned={isBanned} isModerator={isModerator} /></Box>}

                                {activeTab === 'history' && (
                                    <List dense>
                                        {history.length === 0 ? (
                                            <Typography sx={{opacity:0.7}}>{t('room.history_empty')}</Typography>
                                        ) : (
                                            history.map(h => {
                                                const videoId = getYouTubeId(h.video_url);
                                                const thumb = videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : null;
                                                return (
                                                    <ListItem key={h.id} sx={{ mb: 1 }}>
                                                        {thumb && (
                                                            <ListItemAvatar>
                                                                <Avatar variant="rounded" src={thumb} sx={{ width: 60, height: 45, mr: 1 }}>
                                                                    <MovieIcon />
                                                                </Avatar>
                                                            </ListItemAvatar>
                                                        )}
                                                        <ListItemText
                                                            primary={h.video_title || h.video_url}
                                                            secondary={new Date(h.created_at).toLocaleString()}
                                                            primaryTypographyProps={{ style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }}
                                                        />
                                                    </ListItem>
                                                );
                                            })
                                        )}
                                    </List>
                                )}

                                {activeTab === 'moderation' && isModerator && (
                                    <Box>
                                        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                                            <ToggleButtonGroup value={modView} exclusive onChange={(e, v) => v && setModView(v)} size="small" color="primary">
                                                <ToggleButton value="members"><PeopleIcon sx={{mr:1}}/>{t('moderation.actif')}</ToggleButton>
                                                <ToggleButton value="banned"><PersonOffIcon sx={{mr:1}}/>{t('moderation.ban')}</ToggleButton>
                                            </ToggleButtonGroup>
                                        </Box>
                                        {modView === 'members' && (
                                            <List dense>
                                                {allMembers.filter(m => m.isOnline).map(m => (
                                                    <ListItem key={m.userId} secondaryAction={canInteract(getMemberRole(m), m.userId) && (
                                                        <IconButton edge="end" onClick={(e) => { setAnchorEl(e.currentTarget); setSelectedMember({...m, role: getMemberRole(m)}); }}><MoreVertIcon /></IconButton>
                                                    )}>
                                                        <ListItemAvatar><Avatar src={m.avatar_url} /></ListItemAvatar>
                                                        <ListItemText primary={<Box sx={{display:'flex', gap:1, alignItems:'center'}}>{m.userId === user.id ? t('room.user_you', {name:m.name}) : m.name} {m.isOnline && <Box sx={{width:8,height:8,bgcolor:'success.main',borderRadius:'50%'}}/>}</Box>} secondary={getRoleBadge(getMemberRole(m))} />
                                                    </ListItem>
                                                ))}
                                            </List>
                                        )}
                                        {modView === 'banned' && (
                                            <List dense>
                                                {bannedUsers.map(b => (
                                                    <ListItem key={b.userId} secondaryAction={<Button size="small" color="success" onClick={() => handleUnbanUser(b.userId, b.name)}>{t('action.unban')}</Button>}>
                                                        <ListItemAvatar><Avatar src={b.avatar_url} /></ListItemAvatar>
                                                        <ListItemText primary={b.name} secondary={new Date(b.bannedAt).toLocaleDateString()} />
                                                    </ListItem>
                                                ))}
                                            </List>
                                        )}
                                    </Box>
                                )}
                            </Box>
                        </Box>
                    </Box>
                </Box>
            )}

            <Snackbar open={!!pendingRequestUser} anchorOrigin={{ vertical: 'top', horizontal: 'center' }} sx={{ top: { xs: 90, sm: 100 } }}>
                <Alert severity="info" icon={<GavelIcon fontSize="inherit" />} action={<Box><Button color="inherit" size="small" onClick={handleRejectRequest}>REFUSER</Button><Button color="inherit" size="small" onClick={handleApproveRequest} sx={{ fontWeight: 'bold' }}>ACCEPTER</Button></Box>}>{pendingRequestUser?.name} demande à devenir Manager</Alert>
            </Snackbar>

            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
                {selectedMember && (
                    <Box>
                        {userRole === 'owner' && (
                            selectedMember.role === ROLES.MANAGER
                                ? <MenuItem onClick={() => handleAction('demote', selectedMember)}>{t('action.demote')}</MenuItem>
                                : <MenuItem onClick={() => handleAction('promote', selectedMember)}>{t('action.promote')}</MenuItem>
                        )}
                        <MenuItem onClick={() => handleAction('kick', selectedMember)}>{t('action.kick')}</MenuItem>
                        <MenuItem onClick={() => handleAction('ban', selectedMember)} sx={{ color: 'error.main' }}>{t('action.ban')}</MenuItem>
                    </Box>
                )}
            </Menu>

            <InviteDialog open={inviteOpen} onClose={() => setInviteOpen(false)} roomId={roomId} />
            <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
                <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert>
            </Snackbar>
            <Dialog open={pinOpen} onClose={closePinDialog} maxWidth="xs" fullWidth>
                <DialogTitle>{pinMode === 'set' ? t('room.pin_set_title') : t('room.pin_enter_title')}</DialogTitle>
                <DialogContent>
                    <TextField autoFocus fullWidth margin="dense" label={t('room.pin_label')} type="password" inputProps={{ inputMode: 'numeric' }} value={pinValue} onChange={(e) => setPinValue(e.target.value.replace(/\D/g, '').slice(0, 8))} error={!!pinError} helperText={pinError} onKeyDown={(e) => e.key === 'Enter' && (pinMode === 'set' ? handleSavePin() : submitPin())} />
                </DialogContent>
                <DialogActions>
                    <Button onClick={closePinDialog}>{t('common.cancel')}</Button>
                    {pinMode === 'set' && <Button color="error" onClick={handleDisablePin}>{t('room.pin_disable')}</Button>}
                    <Button variant="contained" onClick={() => pinMode === 'set' ? handleSavePin() : submitPin()}>{pinMode === 'set' ? t('common.save') : t('common.verify')}</Button>
                </DialogActions>
            </Dialog>
        </Section>
    );
}