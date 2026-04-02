import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import VideoPlayerShell from '../components/VideoPlayerShell';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import SensorsOffIcon from '@mui/icons-material/SensorsOff';
import SyncIcon from '@mui/icons-material/Sync';
import { RealtimeService } from '../services/RealtimeService';
import { RoleService } from '../services/RoleService';
import { RoomService } from '../services/RoomService';

// LE NOUVEAU DÉLAI : 5 heures (5 * 60 * 60 * 1000 millisecondes)
const REGIE_STALE_DELAY_MS = 5 * 60 * 60 * 1000;

export default function RegieViewer() {
    const { roomId } = useParams();
    const navigate = useNavigate();

    const [state, setState] = useState({
        videoId: null,
        seekTo: 0,
        updatedAt: null,
    });

    const [loading, setLoading] = useState(true);
    const [isRegieAbsent, setIsRegieAbsent] = useState(false);
    const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);
    
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [members, setMembers] = useState([]);
    const spectateurs = onlineUsers.filter((u) => {
        const member = members.find(m => m.userId === u.user_id);
        if (!member) return true;
        return !member.is_manager && !member.isOwner;
    });

    // Écouteur pour la promotion automatique en Régisseur
    useEffect(() => {
        if (!roomId) return;

        const checkPermissionAndRedirect = async () => {
            try {
                const isManager = await RoomService.isManager(roomId);
                if (isManager) {
                    navigate(`/regie/${roomId}/director`, { replace: true });
                }
            } catch (e) {
                console.error("[RegieViewer] Erreur vérification permission", e);
            }
        };

        const channel = supabase
            .channel(`permissions_sync_viewer_${roomId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `room_id=eq.${roomId}` }, checkPermissionAndRedirect)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'roles', filter: `room_id=eq.${roomId}` }, checkPermissionAndRedirect)
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [roomId, navigate]);

    const computeViewerState = useCallback((data) => {
        if (!data || !data.video_id) {
            return { videoId: null, seekTo: 0, updatedAt: data?.updated_at || null };
        }

        const baseCursor = Number(data.video_cursor || 0);
        let computedSeek = baseCursor;

        if (data.updated_at) {
            const elapsedSeconds = (Date.now() - new Date(data.updated_at).getTime()) / 1000;
            computedSeek = baseCursor + Math.max(0, elapsedSeconds);
        }

        return { videoId: data.video_id, seekTo: computedSeek, updatedAt: data.updated_at || null };
    }, []);

    // LE RETOUR DU CHRONOMÈTRE (Vérifie si ça fait plus de 5h)
    const checkRegiePresence = useCallback((updatedAt) => {
        if (!updatedAt) {
            setIsRegieAbsent(true);
            return;
        }

        const ageMs = Date.now() - new Date(updatedAt).getTime();
        setIsRegieAbsent(ageMs > REGIE_STALE_DELAY_MS);
    }, []);

    const applyRegieState = useCallback((data) => {
        const nextState = computeViewerState(data);
        setState(nextState);
        checkRegiePresence(nextState.updatedAt);
        setLoading(false);
    }, [computeViewerState, checkRegiePresence]);

    const loadInitialState = useCallback(async () => {
        if (!roomId) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const { data, error } = await supabase.from('regie_state').select('*').eq('room_id', roomId).single();
            if (error && error.code !== 'PGRST116') throw error;
            applyRegieState(data);
        } catch (e) {
            setLoading(false);
            setIsRegieAbsent(true);
        }
    }, [roomId, applyRegieState]);

    useEffect(() => {
        loadInitialState();
    }, [loadInitialState]);

    useEffect(() => {
        if (!roomId) return;

        const channel = supabase
            .channel(`regie_viewer_sync_${roomId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'regie_state', filter: `room_id=eq.${roomId}` }, (payload) => applyRegieState(payload.new))
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [roomId, applyRegieState]);

    // L'INTERVALLE : On vérifie l'heure toutes les minutes (60000 ms)
    useEffect(() => {
        const interval = setInterval(() => {
            checkRegiePresence(state.updatedAt);
        }, 60000);

        return () => clearInterval(interval);
    }, [state.updatedAt, checkRegiePresence]);

    useEffect(() => {
        const handleOnline = () => { setIsOffline(false); loadInitialState(); };
        const handleOffline = () => { setIsOffline(true); };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [loadInitialState]);

    useEffect(() => {
        if (!roomId) return;
        const setup = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            return RealtimeService.subscribeToRoomPresence(roomId, user, setOnlineUsers);
        };
        setup();
    }, [roomId]);

    useEffect(() => {
        if (!roomId) return;
        const loadMembers = async () => {
            const data = await RoleService.listMembers(roomId);
            setMembers(data || []);
        };
        loadMembers();
    }, [roomId]);
    
    if (loading) {
        return (
            <Box sx={{ width: '100%', height: 'calc(100vh - 64px)', bgcolor: 'black', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                <CircularProgress sx={{ color: '#9147ff' }} />
                <Typography variant="body1" color="text.secondary">Chargement du direct...</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ width: '100%', height: 'calc(100vh - 64px)', bgcolor: 'black', display: 'flex', alignItems: 'center', justifyContent: 'center', p: { xs: 0, md: 4 }, position: 'relative' }}>
            
            <Box sx={{ position: 'absolute', top: { xs: 10, md: 20 }, left: { xs: 10, md: 20 }, background: 'rgba(30,20,60,0.8)', border: '1px solid rgba(150,70,255,0.3)', borderRadius: 2, px: 1.5, py: 0.5, display: 'flex', alignItems: 'center', gap: 1, zIndex: 10 }}>
                <Typography sx={{ color: '#e7d5ff', fontWeight: 600 }}>Spectateurs</Typography>
                <Box sx={{ background: "rgba(255,70,70,0.18)", px: 1, py: 0.2, borderRadius: "6px", border: "1px solid rgba(255,70,70,0.35)" }}>
                    <span style={{ color: "#ff6b6b", fontWeight: 700, fontSize: 12 }}>{spectateurs.length}</span>
                </Box>
            </Box>

            {(isOffline || isRegieAbsent) && (
                <Box sx={{ position: 'absolute', top: 80, left: 16, right: 16, zIndex: 20, maxWidth: 700, mx: 'auto' }}>
                    <Alert severity={isOffline ? 'warning' : 'info'} icon={isOffline ? <WifiOffIcon /> : <SensorsOffIcon />} sx={{ bgcolor: 'rgba(0,0,0,0.8)', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between">
                            <Typography variant="body2">
                                {isOffline ? 'Connexion internet perdue. La lecture reprendra dès le retour du réseau.' : "Le régisseur est inactif ou a mis fin au direct."}
                            </Typography>
                            <Button size="small" variant="outlined" color="inherit" startIcon={<SyncIcon />} onClick={loadInitialState}>Réessayer</Button>
                        </Stack>
                    </Alert>
                </Box>
            )}

            {state.videoId && !isRegieAbsent ? (
                <Box sx={{ width: '100%', height: '100%', maxWidth: '1600px' }}>
                    <VideoPlayerShell url={`https://www.youtube.com/watch?v=${state.videoId}`} playing={true} seekToTimestamp={state.seekTo} canControl={false} fullSize={true} />
                </Box>
            ) : (
                <Stack spacing={2} alignItems="center" justifyContent="center" sx={{ px: 3, textAlign: 'center' }}>
                    <Typography variant="h5" color="text.secondary">Fin des programmes</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 520 }}>La diffusion a été interrompue. Le direct reprendra dès que le régisseur relancera une vidéo.</Typography>
                    <Button variant="outlined" startIcon={<SyncIcon />} onClick={loadInitialState} sx={{ color: '#b07bff', borderColor: '#b07bff' }}>Réactualiser</Button>
                </Stack>
            )}
        </Box>
    );
}