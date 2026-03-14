import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getYouTubeId } from '../utils/youtube';
import VideoPlayerShell from '../components/VideoPlayerShell';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Grid from '@mui/material/Grid';
import SendIcon from '@mui/icons-material/Send';
import Section from '../ui/Section';
import { useParams } from "react-router-dom";

export default function RegieDirector() {
    const { roomId } = useParams();
    const [phase, setPhase] = useState('setup');
    const [playlist, setPlaylist] = useState([]);
    const [inputUrl, setInputUrl] = useState('');
    const [liveVideoId, setLiveVideoId] = useState(null);

    const progressRefs = useRef({});
    const playingRefs = useRef({});
    const lastPushRefs = useRef({});

    useEffect(() => {
        const loadInitialRegieState = async () => {
            try {
                const { data, error } = await supabase
                    .from('regie_state')
                    .select('*')
                    .eq('room_id', roomId)
                    .single();

                if (error && error.code !== 'PGRST116') throw error;

                if (data?.video_id) {
                    setLiveVideoId(data.video_id);
                }
            } catch (e) {
                console.warn('[RegieDirector] impossible de charger l’état initial', e);
            }
        };

        loadInitialRegieState();
    }, []);

    const handleAddVideo = () => {
        const videoId = getYouTubeId(inputUrl);
        if (videoId && playlist.length < 10 && !playlist.includes(videoId)) {
            setPlaylist([...playlist, videoId]);
            progressRefs.current[videoId] = 0;
            playingRefs.current[videoId] = false;
            setInputUrl('');
        }
    };

    const pushRegieState = useCallback(async (videoId, overrides = {}) => {
        if (!videoId) return;

        const payload = {
            //
            room_id: roomId,
            video_id: videoId,
            video_cursor: overrides.video_cursor ?? progressRefs.current[videoId] ?? 0,
            is_playing: overrides.is_playing ?? playingRefs.current[videoId] ?? false,
            updated_at: new Date().toISOString()
        };

        try {
            const { error } = await supabase
                .from('regie_state')
                //
                .upsert(payload, { onConflict: 'room_id' })

            if (error) throw error;
        } catch (e) {
            console.error('[RegieDirector] erreur upsert regie_state', e);
        }
    }, []);

    const handleBroadcast = async (videoId) => {
        setLiveVideoId(videoId);
        await pushRegieState(videoId);
        console.log(`Vidéo ${videoId} envoyée à l'écran`);
    };

    const handlePlay = async (videoId) => {
        playingRefs.current[videoId] = true;

        if (liveVideoId === videoId) {
            await pushRegieState(videoId, { is_playing: true });
        }
    };

    const handlePause = async (videoId) => {
        playingRefs.current[videoId] = false;

        if (liveVideoId === videoId) {
            await pushRegieState(videoId, { is_playing: false });
        }
    };

    const handleSeek = async (videoId, seconds) => {
        progressRefs.current[videoId] = seconds;

        if (liveVideoId === videoId) {
            await pushRegieState(videoId, { video_cursor: seconds });
        }
    };

    const handleProgress = async (videoId, seconds) => {
        progressRefs.current[videoId] = seconds;

        if (liveVideoId !== videoId) return;
        if (!playingRefs.current[videoId]) return;

        const now = Date.now();
        const lastPush = lastPushRefs.current[videoId] || 0;

        if (now - lastPush < 2000) return;
        lastPushRefs.current[videoId] = now;

        await pushRegieState(videoId, { video_cursor: seconds, is_playing: true });
    };

    if (phase === 'setup') {
        return (
            <Section>
                <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
                    <Typography variant="h4" gutterBottom>
                        Préparation de la Régie
                    </Typography>

                    <Stack direction="row" spacing={2} sx={{ mb: 4 }}>
                        <TextField
                            fullWidth
                            label="URL YouTube"
                            value={inputUrl}
                            onChange={(e) => setInputUrl(e.target.value)}
                            disabled={playlist.length >= 10}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddVideo()}
                        />
                        <Button
                            variant="contained"
                            onClick={handleAddVideo}
                            disabled={playlist.length >= 10}
                        >
                            Ajouter
                        </Button>
                    </Stack>

                    <Typography variant="h6" gutterBottom>
                        Vidéos ({playlist.length}/10)
                    </Typography>

                    <Stack spacing={1} sx={{ mb: 4 }}>
                        {playlist.map((id, i) => (
                            <Box
                                key={i}
                                sx={{
                                    p: 2,
                                    bgcolor: 'background.paper',
                                    borderRadius: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 2
                                }}
                            >
                                <img
                                    src={`https://img.youtube.com/vi/${id}/mqdefault.jpg`}
                                    alt="thumbnail"
                                    style={{ height: 40, borderRadius: 4 }}
                                />
                                <Typography>ID: {id}</Typography>
                            </Box>
                        ))}

                        {playlist.length === 0 && (
                            <Typography variant="body2" color="text.secondary">
                                Ajoutez des liens YouTube pour préparer vos écrans.
                            </Typography>
                        )}
                    </Stack>

                    <Button
                        variant="contained"
                        color="secondary"
                        fullWidth
                        size="large"
                        disabled={playlist.length === 0}
                        onClick={() => setPhase('live')}
                    >
                        Commencer la régie
                    </Button>
                </Box>
            </Section>
        );
    }

    return (
        <Box sx={{ p: 2, height: 'calc(100vh - 64px)', bgcolor: '#121212', overflowY: 'auto' }}>
            <Typography variant="h4" sx={{ mb: 3, color: 'white' }}>
                Live - Régisseur
            </Typography>

            {liveVideoId && (
                <Typography sx={{ mb: 2, color: '#ffb74d' }}>
                    Écran actuellement diffusé : {liveVideoId}
                </Typography>
            )}

            <Grid container spacing={2}>
                {playlist.map((videoId, index) => (
                    <Grid item xs={12} sm={6} md={4} key={index}>
                        <Box
                            sx={{
                                bgcolor: 'black',
                                borderRadius: 2,
                                overflow: 'hidden',
                                p: 1,
                                border: liveVideoId === videoId ? '2px solid #ff5252' : '1px solid #333'
                            }}
                        >
                            <VideoPlayerShell
                                url={`https://www.youtube.com/watch?v=${videoId}`}
                                playing={false}
                                canControl={true}
                                onPlay={() => handlePlay(videoId)}
                                onPause={() => handlePause(videoId)}
                                onSeek={(seconds) => handleSeek(videoId, seconds)}
                                onProgress={(seconds) => handleProgress(videoId, seconds)}
                            />

                            <Button
                                fullWidth
                                variant="contained"
                                color="error"
                                startIcon={<SendIcon />}
                                onClick={() => handleBroadcast(videoId)}
                                sx={{ mt: 1 }}
                            >
                                Diffuser cet écran
                            </Button>
                        </Box>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
}