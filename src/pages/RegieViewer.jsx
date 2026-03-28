import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
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

const REGIE_STALE_DELAY_MS = 15000;

export default function RegieViewer() {
    const { roomId } = useParams();

    const [state, setState] = useState({
        videoId: null,
        seekTo: 0,
        updatedAt: null,
    });

    const [loading, setLoading] = useState(true);
    const [isRegieAbsent, setIsRegieAbsent] = useState(false);
    const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);
    
    //
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [members, setMembers] = useState([]);
    const spectateurs = onlineUsers.filter((u) => {
        const member = members.find(m => m.userId === u.user_id);

        if (!member) return true; // visiteur = spectateur

        return !member.is_manager && !member.isOwner;
    });

    const computeViewerState = useCallback((data) => {
        if (!data || !data.video_id) {
            return {
                videoId: null,
                seekTo: 0,
                updatedAt: data?.updated_at || null,
            };
        }

        const baseCursor = Number(data.video_cursor || 0);
        let computedSeek = baseCursor;

        if (data.updated_at) {
            const elapsedSeconds = (Date.now() - new Date(data.updated_at).getTime()) / 1000;
            computedSeek = baseCursor + Math.max(0, elapsedSeconds);
        }

        return {
            videoId: data.video_id,
            seekTo: computedSeek,
            updatedAt: data.updated_at || null,
        };
    }, []);

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

            const { data, error } = await supabase
                .from('regie_state')
                .select('*')
                .eq('room_id', roomId)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            applyRegieState(data);
        } catch (e) {
            console.error('[RegieViewer] erreur chargement état initial', e);
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
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'regie_state',
                    filter: `room_id=eq.${roomId}`,
                },
                (payload) => applyRegieState(payload.new)
            )
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [roomId, applyRegieState]);

    useEffect(() => {
        const interval = setInterval(() => {
            checkRegiePresence(state.updatedAt);
        }, 3000);

        return () => clearInterval(interval);
    }, [state.updatedAt, checkRegiePresence]);

    useEffect(() => {
        const handleOnline = () => {
            setIsOffline(false);
            loadInitialState();
        };

        const handleOffline = () => {
            setIsOffline(true);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [loadInitialState]);

    //
    useEffect(() => {
        if (!roomId) return;

        const unsubscribe = RealtimeService.subscribeToRoomPresence(
            roomId,
            null,
            setOnlineUsers
        );

        return () => unsubscribe();
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
            <Box
                sx={{
                    width: '100%',
                    height: 'calc(100vh - 64px)',
                    bgcolor: 'black',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 2,
                }}
            >
                <CircularProgress />
                <Typography variant="body1" color="text.secondary">
                    Chargement du direct...
                </Typography>
            </Box>
        );
    }

    return (
        <Box
            sx={{
                width: '100%',
                height: 'calc(100vh - 64px)',
                bgcolor: 'black',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                p: { xs: 0, md: 4 },
                position: 'relative',
            }}
        >
            {(isOffline || isRegieAbsent) && (
                <Box
                    sx={{
                        position: 'absolute',
                        top: 16,
                        left: 16,
                        right: 16,
                        zIndex: 20,
                        maxWidth: 700,
                        mx: 'auto',
                    }}
                >
                    <Alert
                        severity={isOffline ? 'warning' : 'info'}
                        icon={isOffline ? <WifiOffIcon /> : <SensorsOffIcon />}
                    >
                        <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            spacing={1}
                            alignItems={{ xs: 'flex-start', sm: 'center' }}
                            justifyContent="space-between"
                        >
                            <Typography variant="body2">
                                {isOffline
                                    ? 'Connexion internet perdue. La lecture reprendra dès le retour du réseau.'
                                    : "Le régisseur semble absent ou ne diffuse plus pour le moment."}
                            </Typography>

                            <Button
                                size="small"
                                variant="outlined"
                                color="inherit"
                                startIcon={<SyncIcon />}
                                onClick={loadInitialState}
                            >
                                Réessayer
                            </Button>
                        </Stack>
                    </Alert>
                </Box>
            )}

            {state.videoId && !isRegieAbsent ? (
                <Box sx={{ width: '100%', height: '100%', maxWidth: '1600px' }}>
                    <VideoPlayerShell
                        url={`https://www.youtube.com/watch?v=${state.videoId}`}
                        playing={true}
                        seekToTimestamp={state.seekTo}
                        canControl={false}
                        fullSize={true}
                    />
                </Box>
            ) : (
                <Stack spacing={2} alignItems="center" justifyContent="center" sx={{ px: 3, textAlign: 'center' }}>
                    <Typography variant="h5" color="text.secondary">
                        {isRegieAbsent ? 'Régisseur absent' : 'En attente du régisseur...'}
                    </Typography>

                    <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 520 }}>
                        {isRegieAbsent
                            ? "Aucune mise à jour récente n'a été reçue. La diffusion reprendra dès que le régisseur sera revenu."
                            : 'La vidéo apparaîtra automatiquement dès que le régisseur lancera une diffusion.'}
                    </Typography>

                    <Button variant="outlined" startIcon={<SyncIcon />} onClick={loadInitialState}>
                        Réactualiser
                    </Button>
                </Stack>
            )}

            {/* Liste spect */}
            <Box sx={{
                position: 'absolute',
                right: 20,
                top: 20,
                background: 'rgba(0,0,0,0.7)',
                padding: 2,
                borderRadius: 2,
            }}>
                <Typography variant="h6">👥 Spectateurs</Typography>

                {spectateurs.map((u) => (
                    <Typography key={u.user_id}>
                        {u.username || "Visiteur"}
                    </Typography>
                ))}
            </Box>
        </Box>
    );
}