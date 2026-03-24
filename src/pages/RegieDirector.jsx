import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getYouTubeId } from '../utils/youtube';
import { VideoService } from '../services/VideoService';
import VideoPlayerShell from '../components/VideoPlayerShell';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import SendIcon from '@mui/icons-material/Send';
import SensorsIcon from '@mui/icons-material/Sensors';
import CloseIcon from '@mui/icons-material/Close';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import CircularProgress from '@mui/material/CircularProgress';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import Section from '../ui/Section';
import { useParams, useNavigate } from 'react-router-dom';
import { RoomService } from '../services/RoomService';

export default function RegieDirector() {
    const { roomId } = useParams();
    const navigate = useNavigate();

    const [phase, setPhase] = useState('setup');
    const [playlist, setPlaylist] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    const [liveVideoId, setLiveVideoId] = useState(null);
    const [localPlaying, setLocalPlaying] = useState({});
    const [initialSeeks, setInitialSeeks] = useState({});

    const [permissionLoading, setPermissionLoading] = useState(true);
    const [canAccessDirector, setCanAccessDirector] = useState(false);

    const progressRefs = useRef({});
    const playingRefs = useRef({});

    useEffect(() => {
        const checkPermission = async () => {
            if (!roomId) {
                setPermissionLoading(false);
                setCanAccessDirector(false);
                return;
            }

            try {
                const isManager = await RoomService.isManager(roomId);

                if (!isManager) {
                    setCanAccessDirector(false);
                    navigate(`/regie/${roomId}/viewer`, { replace: true });
                    return;
                }

                setCanAccessDirector(true);
            } catch (e) {
                setCanAccessDirector(false);
                navigate(`/regie/${roomId}/viewer`, { replace: true });
            } finally {
                setPermissionLoading(false);
            }
        };

        checkPermission();
    }, [roomId, navigate]);

    useEffect(() => {
        if (!roomId || !canAccessDirector) return;

        const storageKey = `regie_director_playlist_${roomId}`;
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setPlaylist(parsed);
                    parsed.forEach((videoId) => {
                        if (progressRefs.current[videoId] === undefined) progressRefs.current[videoId] = 0;
                        if (playingRefs.current[videoId] === undefined) playingRefs.current[videoId] = false;
                    });
                    setPhase('live');
                }
            }
        } catch (e) {}
    }, [roomId, canAccessDirector]);

    useEffect(() => {
        if (!roomId || !canAccessDirector) return;
        const storageKey = `regie_director_playlist_${roomId}`;
        try {
            localStorage.setItem(storageKey, JSON.stringify(playlist));
        } catch (e) {}
    }, [playlist, roomId, canAccessDirector]);

    useEffect(() => {
        if (!roomId || !canAccessDirector) return;

        const applyRegieState = (data) => {
            if (!data?.video_id) return;

            const videoId = data.video_id;
            const cursor = Number(data.video_cursor || 0);

            setLiveVideoId(videoId);
            setPhase('live');

            const currentCursor = progressRefs.current[videoId] || 0;
            if (Math.abs(cursor - currentCursor) > 3) {
                progressRefs.current[videoId] = cursor;
                setInitialSeeks((prev) => ({ ...prev, [videoId]: cursor }));
            }

            setPlaylist((prev) => (prev.includes(videoId) ? prev : [videoId, ...prev]));
        };

        const loadInitialRegieState = async () => {
            try {
                const { data, error } = await supabase
                    .from('regie_state')
                    .select('*')
                    .eq('room_id', roomId)
                    .single();

                if (error && error.code !== 'PGRST116') throw error;
                applyRegieState(data);
            } catch (e) {}
        };

        loadInitialRegieState();

        const channel = supabase
            .channel(`regie_director_sync_${roomId}`)
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
    }, [roomId, canAccessDirector]);

    const addVideoToState = (videoId) => {
        setPlaylist((prev) => [...prev, videoId]);
        progressRefs.current[videoId] = 0;
        playingRefs.current[videoId] = false;
        setLocalPlaying((prev) => ({ ...prev, [videoId]: false }));
    };

    const handleAddOrSearch = async () => {
        if (!canAccessDirector) return;

        const val = inputValue.trim();
        if (!val) return;

        const videoId = getYouTubeId(val);
        if (videoId) {
            if (playlist.length < 10 && !playlist.includes(videoId)) {
                addVideoToState(videoId);
                setInputValue('');
                setSearchResults([]);
            }
            return;
        }

        if (isSearching) return;

        setIsSearching(true);
        try {
            const results = await VideoService.searchYoutube(val);
            setSearchResults(results || []);
        } catch (e) {
            console.error('Erreur de recherche YouTube', e);
        } finally {
            setIsSearching(false);
        }
    };

    const handleAddSearchResult = (youtubeId) => {
        if (!canAccessDirector) return;

        if (playlist.length < 10 && !playlist.includes(youtubeId)) {
            addVideoToState(youtubeId);
            if (playlist.length === 9) setSearchResults([]);
        }
    };

    const handleRemoveVideo = (videoIdToRemove) => {
        if (!canAccessDirector) return;
        setPlaylist((prev) => prev.filter((id) => id !== videoIdToRemove));

        if (liveVideoId === videoIdToRemove) {
            setLiveVideoId(null);
        }
    };

    const closeSearch = () => {
        setSearchResults([]);
        setInputValue('');
    };

    // Envoie les infos à Supabase
    const pushRegieState = useCallback(
        async (videoId, overrides = {}) => {
            if (!videoId || !roomId || !canAccessDirector) return;

            const isManager = await RoomService.isManager(roomId);
            
            // Sécurité : si un user n'est pas le manager on arrête. 
            if (!isManager) {
                console.error("Unauthorized action")
                return
            }

            const payload = {
                room_id: Number(roomId),
                video_id: videoId,
                video_cursor: overrides.video_cursor ?? progressRefs.current[videoId] ?? 0,
                is_playing: true,
                updated_at: new Date().toISOString(),
            };

            try {
                await supabase.from('regie_state').upsert(payload, { onConflict: 'room_id' });
            } catch (e) {}
        },
        [roomId, canAccessDirector]
    );

    const handleBroadcast = async (videoId) => {
        if (!canAccessDirector) return;

        const cursor = progressRefs.current[videoId] || 0;
        setLiveVideoId(videoId);
        setPhase('live');
        await pushRegieState(videoId, { video_cursor: cursor });
    };

    const handlePlay = (videoId) => {
        if (!canAccessDirector) return;
        playingRefs.current[videoId] = true;
        setLocalPlaying((prev) => ({ ...prev, [videoId]: true }));
    };

    const handlePause = (videoId) => {
        if (!canAccessDirector) return;
        playingRefs.current[videoId] = false;
        setLocalPlaying((prev) => ({ ...prev, [videoId]: false }));
    };

    const handleProgress = (videoId, seconds) => {
        if (!canAccessDirector) return;
        progressRefs.current[videoId] = seconds;
    };

    const renderSearchResults = () => {
        if (!canAccessDirector || searchResults.length === 0) return null;

        return (
            <Box
                sx={{
                    position: phase === 'live' ? 'absolute' : 'relative',
                    top: phase === 'live' ? '100%' : 'auto',
                    left: 0,
                    right: 0,
                    zIndex: 100,
                    bgcolor: 'background.paper',
                    mt: 1,
                    borderRadius: 1,
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: phase === 'live' ? '0 10px 30px rgba(0,0,0,0.8)' : 'none',
                }}
            >
                <Box
                    sx={{
                        p: 1,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: '1px solid rgba(255,255,255,0.1)',
                    }}
                >
                    <Typography variant="caption" sx={{ color: 'text.secondary', ml: 1 }}>
                        Résultats YouTube
                    </Typography>
                    <IconButton size="small" onClick={closeSearch}>
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </Box>

                <List sx={{ maxHeight: 300, overflowY: 'auto', p: 0 }}>
                    {searchResults.map((item) => {
                        const youtubeId = item.id?.videoId || item.videoId || item.id;
                        const title = item.snippet?.title || item.title || 'Vidéo YouTube';
                        const thumbnail =
                            item.snippet?.thumbnails?.medium?.url ||
                            `https://i.ytimg.com/vi/${youtubeId}/mqdefault.jpg`;
                        const isAlreadyAdded = playlist.includes(youtubeId);

                        return (
                            <ListItem key={youtubeId} divider sx={{ alignItems: 'flex-start', py: 1 }}>
                                <Stack direction="row" spacing={1.5} sx={{ width: '100%', alignItems: 'center' }}>
                                    <Box
                                        component="img"
                                        src={thumbnail}
                                        sx={{ width: 80, height: 45, borderRadius: 1, objectFit: 'cover' }}
                                    />
                                    <Typography
                                        variant="body2"
                                        sx={{ flexGrow: 1, fontWeight: 600, lineHeight: 1.2 }}
                                    >
                                        {title}
                                    </Typography>
                                    <IconButton
                                        size="small"
                                        onClick={() => handleAddSearchResult(youtubeId)}
                                        disabled={playlist.length >= 10 || isAlreadyAdded}
                                        color={isAlreadyAdded ? 'success' : 'default'}
                                    >
                                        {isAlreadyAdded ? <CloseIcon /> : <PlaylistAddIcon />}
                                    </IconButton>
                                </Stack>
                            </ListItem>
                        );
                    })}
                </List>
            </Box>
        );
    };

    if (permissionLoading) {
        return (
            <Section>
                <Box
                    sx={{
                        py: 6,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 2,
                    }}
                >
                    <CircularProgress />
                    <Typography>Vérification des permissions...</Typography>
                </Box>
            </Section>
        );
    }

    if (!canAccessDirector) {
        return null;
    }

    if (phase === 'setup') {
        return (
            <Section>
                <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
                    <Typography variant="h4" gutterBottom>
                        Préparation de la Régie
                    </Typography>

                    <Box sx={{ mb: 4 }}>
                        <Stack direction="row" spacing={2}>
                            <TextField
                                fullWidth
                                label="Rechercher (ex: lofi) ou coller une URL..."
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                disabled={playlist.length >= 10}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddOrSearch()}
                            />
                            <Button
                                variant="contained"
                                onClick={handleAddOrSearch}
                                disabled={playlist.length >= 10 || isSearching || !inputValue}
                            >
                                {isSearching ? <CircularProgress size={24} color="inherit" /> : 'Rechercher/Ajouter'}
                            </Button>
                        </Stack>

                        {renderSearchResults()}
                    </Box>

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
                                    gap: 2,
                                }}
                            >
                                <img
                                    src={`https://img.youtube.com/vi/${id}/mqdefault.jpg`}
                                    alt="thumbnail"
                                    style={{ height: 40, borderRadius: 4 }}
                                />
                                <Typography sx={{ flex: 1 }}>ID: {id}</Typography>
                                <IconButton size="small" onClick={() => handleRemoveVideo(id)} color="error">
                                    <CloseIcon />
                                </IconButton>
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
            <Box
                sx={{
                    mb: 3,
                    display: 'flex',
                    flexDirection: { xs: 'column', md: 'row' },
                    justifyContent: 'space-between',
                    alignItems: { xs: 'flex-start', md: 'center' },
                    gap: 2,
                }}
            >
                <Typography variant="h4" sx={{ color: 'white', display: 'flex', alignItems: 'center', gap: 2 }}>
                    Live - Régisseur
                    {liveVideoId && (
                        <Box
                            sx={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 1,
                                bgcolor: '#ff0000',
                                px: 1.5,
                                py: 0.5,
                                borderRadius: 4,
                                fontSize: '1rem',
                                fontWeight: 'bold',
                            }}
                        >
                            <SensorsIcon fontSize="small" /> EN DIRECT
                        </Box>
                    )}
                </Typography>

                <Box sx={{ position: 'relative', width: { xs: '100%', md: '450px' }, zIndex: 10 }}>
                    <Stack direction="row" spacing={1}>
                        <TextField
                            size="small"
                            placeholder="Rechercher sur YouTube ou URL..."
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            disabled={playlist.length >= 10}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddOrSearch()}
                            sx={{
                                bgcolor: 'rgba(255,255,255,0.1)',
                                input: { color: 'white' },
                                borderRadius: 1,
                                flex: 1,
                            }}
                        />
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={handleAddOrSearch}
                            disabled={playlist.length >= 10 || !inputValue || isSearching}
                            sx={{ minWidth: '120px' }}
                        >
                            {isSearching ? (
                                <CircularProgress size={24} color="inherit" />
                            ) : (
                                `Rechercher/Ajouter (${playlist.length}/10)`
                            )}
                        </Button>
                    </Stack>
                    {renderSearchResults()}
                </Box>
            </Box>

            <Grid container spacing={2}>
                {playlist.map((videoId) => {
                    const isLive = liveVideoId === videoId;

                    return (
                        <Grid item xs={12} sm={6} md={4} key={videoId}>
                            <Box
                                sx={{
                                    bgcolor: 'black',
                                    borderRadius: 2,
                                    overflow: 'hidden',
                                    p: 1,
                                    position: 'relative',
                                    border: isLive ? '4px solid #ff0000' : '2px solid transparent',
                                    boxShadow: isLive
                                        ? '0 0 20px rgba(255, 0, 0, 0.7)'
                                        : '0 0 10px rgba(0,0,0,0.5)',
                                    transform: isLive ? 'scale(1.02)' : 'scale(1)',
                                    transition: 'all 0.3s ease-in-out',
                                }}
                            >
                                <IconButton
                                    size="small"
                                    onClick={() => handleRemoveVideo(videoId)}
                                    sx={{
                                        position: 'absolute',
                                        top: 12,
                                        right: 12,
                                        zIndex: 10,
                                        bgcolor: 'rgba(0,0,0,0.6)',
                                        color: 'white',
                                        '&:hover': { bgcolor: 'error.main' },
                                    }}
                                >
                                    <CloseIcon fontSize="small" />
                                </IconButton>

                                <VideoPlayerShell
                                    url={`https://www.youtube.com/watch?v=${videoId}`}
                                    playing={localPlaying[videoId] ?? false}
                                    seekToTimestamp={initialSeeks[videoId]}
                                    canControl={true}
                                    onPlay={() => handlePlay(videoId)}
                                    onPause={() => handlePause(videoId)}
                                    onProgress={(seconds) => handleProgress(videoId, seconds)}
                                />

                                <Button
                                    fullWidth
                                    variant={isLive ? 'outlined' : 'contained'}
                                    color="error"
                                    startIcon={isLive ? <SensorsIcon /> : <SendIcon />}
                                    onClick={() => handleBroadcast(videoId)}
                                    sx={{
                                        mt: 1,
                                        fontWeight: 'bold',
                                        bgcolor: isLive ? 'rgba(255, 0, 0, 0.1)' : 'error.main',
                                    }}
                                >
                                    {isLive ? 'ACTUALISER LE DIRECT (TIMER)' : 'Diffuser cet écran'}
                                </Button>
                            </Box>
                        </Grid>
                    );
                })}
            </Grid>
        </Box>
    );
}