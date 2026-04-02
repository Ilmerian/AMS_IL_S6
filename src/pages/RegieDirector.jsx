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
import ListItemText from '@mui/material/ListItemText';
import Chip from '@mui/material/Chip';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Section from '../ui/Section';
import { useParams, useNavigate } from 'react-router-dom';
import { RoomService } from '../services/RoomService';
import { RealtimeService } from '../services/RealtimeService';
import { RoleService } from '../services/RoleService';


export default function RegieDirector() {
    const { roomId } = useParams();
    const navigate = useNavigate();

    const [phase, setPhase] = useState('setup');
    const [playlist, setPlaylist] = useState([]);
    const [videoDetails, setVideoDetails] = useState({});
    
    const [inputValue, setInputValue] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    const [liveVideoId, setLiveVideoId] = useState(null);
    const [localPlaying, setLocalPlaying] = useState({});
    const [initialSeeks, setInitialSeeks] = useState({});

    const [permissionLoading, setPermissionLoading] = useState(true);
    const [canAccessDirector, setCanAccessDirector] = useState(false);

    // ÉTATS POUR LE TRANSFERT DE RÉGIE
    const [spectatorsModalOpen, setSpectatorsModalOpen] = useState(false);
    const [transferTarget, setTransferTarget] = useState(null);

    const progressRefs = useRef({});
    const playingRefs = useRef({});

    const [onlineUsers, setOnlineUsers] = useState([]);
    const [members, setMembers] = useState([]);
    const spectateurs = onlineUsers.filter((u) => {
        const member = members.find(m => m.userId === u.user_id);
        if (!member) return true;
        return !member.is_manager && !member.isOwner;
    });

    useEffect(() => {
        if (!roomId) return;
        const loadMembers = async () => {
            const data = await RoleService.listMembers(roomId);
            setMembers(data || []);
        };
        loadMembers();
    }, [roomId]);

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
        const detailsKey = `regie_director_details_${roomId}`; 
        
        try {
            const savedDetails = localStorage.getItem(detailsKey);
            if (savedDetails) setVideoDetails(JSON.parse(savedDetails));

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
        try {
            localStorage.setItem(`regie_director_playlist_${roomId}`, JSON.stringify(playlist));
            localStorage.setItem(`regie_director_details_${roomId}`, JSON.stringify(videoDetails));
        } catch (e) {}
    }, [playlist, videoDetails, roomId, canAccessDirector]);

    // Retour automatique en phase setup si la playlist devient vide en phase live
    useEffect(() => {
        if (phase === 'live' && playlist.length === 0) {
            setPhase('setup');
        }
    }, [playlist, phase]);

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

            setPlaylist((prev) => {
                if (prev.includes(videoId)) return prev;
                setVideoDetails(details => {
                    if (details[videoId]) return details;
                    return { ...details, [videoId]: { title: `Chargement de la vidéo...`, thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` } };
                });
                return [videoId, ...prev];
            });
        };

        const loadInitialRegieState = async () => {
            try {
                const { data, error } = await supabase.from('regie_state').select('*').eq('room_id', roomId).single();
                if (error && error.code !== 'PGRST116') throw error;
                applyRegieState(data);
            } catch (e) {}
        };

        loadInitialRegieState();

        const channel = supabase.channel(`regie_director_sync_${roomId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'regie_state', filter: `room_id=eq.${roomId}` },
                (payload) => applyRegieState(payload.new)
            ).subscribe();

        return () => supabase.removeChannel(channel);
    }, [roomId, canAccessDirector]);

    useEffect(() => {
        if (!roomId) return;
        const setup = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            const unsubscribe = RealtimeService.subscribeToRoomPresence(roomId, user, setOnlineUsers);
            return unsubscribe;
        };
        setup();
    }, [roomId]);

    const executeTransfer = async () => {
        if (!transferTarget || !roomId) return;
        try {
            await RoomService.transferOwnership(roomId, transferTarget.user_id);
            navigate(`/regie/${roomId}/viewer`, { replace: true });
        } catch (error) {
            console.error("Erreur lors du transfert de propriété", error);
            alert("Erreur lors du transfert de la régie.");
        } finally {
            setTransferTarget(null);
        }
    };

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
                setIsSearching(true);
                try {
                    const results = await VideoService.searchYoutube(videoId);
                    const item = results?.[0]; 
                    if (item) {
                        const title = item.snippet?.title || item.title || `Vidéo ${videoId}`;
                        const thumbnail = item.snippet?.thumbnails?.medium?.url || `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
                        setVideoDetails(prev => ({...prev, [videoId]: { title, thumbnail }}));
                    } else {
                        setVideoDetails(prev => ({...prev, [videoId]: { title: `Lien YouTube (${videoId})`, thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` }}));
                    }
                } catch(e) {
                    setVideoDetails(prev => ({...prev, [videoId]: { title: `Lien YouTube (${videoId})`, thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` }}));
                } finally {
                    setIsSearching(false);
                }

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

    const handleAddSearchResult = (item) => {
        if (!canAccessDirector) return;
        const youtubeId = item.id?.videoId || item.videoId || item.id;
        if (playlist.length < 10 && !playlist.includes(youtubeId)) {
            const title = item.snippet?.title || item.title || `Vidéo ${youtubeId}`;
            const thumbnail = item.snippet?.thumbnails?.medium?.url || `https://i.ytimg.com/vi/${youtubeId}/mqdefault.jpg`;
            
            setVideoDetails(prev => ({...prev, [youtubeId]: { title, thumbnail }}));
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

    const pushRegieState = useCallback(
        async (videoId, overrides = {}) => {
            if (!videoId || !roomId || !canAccessDirector) return;
            const isManager = await RoomService.isManager(roomId);
            if (!isManager) return;

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
            <Box sx={{ position: phase === 'live' ? 'absolute' : 'relative', top: phase === 'live' ? '100%' : 'auto', left: 0, right: 0, zIndex: 100, bgcolor: '#1a1525', mt: 1, borderRadius: 2, border: '1px solid rgba(145, 71, 255, 0.3)', boxShadow: '0 10px 40px rgba(0,0,0,0.9)', overflow: 'hidden' }}>
                <Box sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'rgba(0,0,0,0.4)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <Typography variant="caption" sx={{ color: '#b07bff', ml: 1, fontWeight: 700, letterSpacing: 1 }}>RÉSULTATS YOUTUBE</Typography>
                    <IconButton size="small" onClick={closeSearch} sx={{ color: 'text.secondary', '&:hover': { color: 'white' } }}><CloseIcon fontSize="small" /></IconButton>
                </Box>
                <List sx={{ maxHeight: 350, overflowY: 'auto', p: 0 }}>
                    {searchResults.map((item) => {
                        const youtubeId = item.id?.videoId || item.videoId || item.id;
                        const title = item.snippet?.title || item.title || 'Vidéo YouTube';
                        const thumbnail = item.snippet?.thumbnails?.medium?.url || `https://i.ytimg.com/vi/${youtubeId}/mqdefault.jpg`;
                        const isAlreadyAdded = playlist.includes(youtubeId);

                        return (
                            <ListItem key={youtubeId} divider sx={{ alignItems: 'flex-start', py: 1.5, borderColor: 'rgba(255,255,255,0.05)', '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' } }}>
                                <Stack direction="row" spacing={2} sx={{ width: '100%', alignItems: 'center' }}>
                                    <Box component="img" src={thumbnail} sx={{ width: 90, height: 50, borderRadius: 1, objectFit: 'cover', boxShadow: '0 4px 10px rgba(0,0,0,0.5)' }} />
                                    <Typography variant="body2" sx={{ flexGrow: 1, fontWeight: 500, lineHeight: 1.3, color: '#e7d5ff' }}>{title}</Typography>
                                    <IconButton
                                        size="small"
                                        onClick={() => handleAddSearchResult(item)} 
                                        disabled={playlist.length >= 10 || isAlreadyAdded}
                                        sx={{ bgcolor: isAlreadyAdded ? 'success.dark' : 'rgba(145, 71, 255, 0.2)', color: 'white', '&:hover': { bgcolor: isAlreadyAdded ? 'success.main' : 'rgba(145, 71, 255, 0.5)' }, '&.Mui-disabled': { bgcolor: isAlreadyAdded ? 'success.dark' : 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)' } }}
                                    >
                                        {isAlreadyAdded ? <CloseIcon fontSize="small" /> : <PlaylistAddIcon fontSize="small" />}
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
            <Box sx={{ height: 'calc(100vh - 64px)', display: 'grid', placeItems: 'center', bgcolor: '#0b0914' }}>
                <Stack alignItems="center" spacing={3}>
                    <CircularProgress sx={{ color: '#9147ff' }} />
                    <Typography sx={{ color: '#b07bff', fontWeight: 600, letterSpacing: 1 }}>SÉCURISATION DE LA RÉGIE...</Typography>
                </Stack>
            </Box>
        );
    }

    if (!canAccessDirector) return null;

    if (phase === 'setup') {
        return (
            <Box sx={{ minHeight: 'calc(100vh - 64px)', bgcolor: '#0b0914', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
                <Box sx={{ maxWidth: 700, width: '100%', bgcolor: 'rgba(20, 15, 35, 0.6)', backdropFilter: 'blur(12px)', border: '1px solid rgba(145, 71, 255, 0.2)', borderRadius: 4, p: { xs: 3, md: 5 }, boxShadow: '0 25px 50px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.05)' }}>
                    <Box sx={{ textAlign: 'center', mb: 5 }}>
                        <SensorsIcon sx={{ fontSize: 48, color: '#9147ff', mb: 1 }} />
                        <Typography variant="h4" sx={{ fontWeight: 800, color: 'white', letterSpacing: '-0.5px' }}>Initialisation de la régie</Typography>
                        <Typography sx={{ color: '#a085ff', mt: 1 }}>Préparez votre playlist avant de prendre l'antenne.</Typography>
                    </Box>

                    <Box sx={{ mb: 5 }}>
                        <Stack direction="row" spacing={2}>
                            <TextField
                                fullWidth placeholder="Rechercher (ex: lofi) ou coller une URL..." value={inputValue} onChange={(e) => setInputValue(e.target.value)} disabled={playlist.length >= 10} onKeyDown={(e) => e.key === 'Enter' && handleAddOrSearch()}
                                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: '#9147ff' }}/></InputAdornment> }}
                                sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'rgba(0,0,0,0.4)', borderRadius: 2, color: 'white', '& fieldset': { borderColor: 'rgba(145, 71, 255, 0.3)' }, '&:hover fieldset': { borderColor: '#9147ff' } } }}
                            />
                            <Button
                                variant="contained" onClick={handleAddOrSearch} disabled={playlist.length >= 10 || isSearching || !inputValue}
                                sx={{ borderRadius: 2, px: 4, fontWeight: 700, background: 'linear-gradient(45deg, #9147ff, #b07bff)', '&:hover': { background: 'linear-gradient(45deg, #7b2cff, #9a5cff)' } }}
                            >
                                {isSearching ? <CircularProgress size={24} color="inherit" /> : 'Rechercher'}
                            </Button>
                        </Stack>
                        {renderSearchResults()}
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ color: '#b07bff', fontWeight: 700, letterSpacing: 1 }}>VIDEOS EN ATTENTE</Typography>
                        <Chip label={`${playlist.length}/10`} size="small" sx={{ bgcolor: 'rgba(145, 71, 255, 0.2)', color: '#e7d5ff', fontWeight: 800 }} />
                    </Box>

                    <Stack spacing={1.5} sx={{ mb: 5, minHeight: 100 }}>
                        {playlist.map((id) => {
                            const details = videoDetails[id] || {};
                            const title = details.title || `Vidéo en attente...`;
                            const thumb = details.thumbnail || `https://img.youtube.com/vi/${id}/mqdefault.jpg`;

                            return (
                                <Box key={id} sx={{ p: 1.5, bgcolor: 'rgba(0,0,0,0.4)', borderRadius: 2, display: 'flex', alignItems: 'center', gap: 2, border: '1px solid rgba(255,255,255,0.05)', transition: '0.2s', '&:hover': { bgcolor: 'rgba(145, 71, 255, 0.1)' } }}>
                                    <Box component="img" src={thumb} sx={{ width: 64, height: 36, borderRadius: 1, objectFit: 'cover' }} />
                                    <Typography sx={{ flex: 1, color: '#e7d5ff', fontWeight: 500, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {title}
                                    </Typography>
                                    <IconButton size="small" onClick={() => handleRemoveVideo(id)} sx={{ color: 'rgba(255,107,138,0.7)', '&:hover': { bgcolor: 'rgba(255,107,138,0.1)', color: '#ff6b6b' } }}>
                                        <CloseIcon fontSize="small"/>
                                    </IconButton>
                                </Box>
                            );
                        })}
                        {playlist.length === 0 && (
                            <Box sx={{ p: 4, textAlign: 'center', border: '1px dashed rgba(145, 71, 255, 0.3)', borderRadius: 2 }}>
                                <Typography variant="body2" sx={{ color: 'rgba(160,133,255,0.6)' }}>Aucune source vidéo configurée.</Typography>
                            </Box>
                        )}
                    </Stack>

                    <Button variant="contained" fullWidth size="large" disabled={playlist.length === 0} onClick={() => setPhase('live')} startIcon={<SensorsIcon />} sx={{ py: 2, borderRadius: 2, fontSize: '1.1rem', fontWeight: 800, letterSpacing: 1, bgcolor: '#ff3366', color: 'white', '&:hover': { bgcolor: '#ff003c' }, '&.Mui-disabled': { bgcolor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.2)' } }}>
                        OUVRIR LA RÉGIE
                    </Button>
                </Box>
            </Box>
        );
    }

    return (
        <Box sx={{ height: 'calc(100vh - 64px)', bgcolor: '#07050a', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: 'rgba(11, 9, 20, 0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(145, 71, 255, 0.15)', display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', md: 'center' }, gap: 2, zIndex: 40 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Box>
                        <Typography variant="h5" sx={{ color: 'white', fontWeight: 900, letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: 1 }}>
                            RÉGIE <Typography component="span" sx={{ color: '#9147ff', fontWeight: 900 }}>DIRECTOR</Typography>
                        </Typography>
                    </Box>

                    {/* BADGE SPECTATEUR CLIQUABLE */}
                    <Box 
                        onClick={() => setSpectatorsModalOpen(true)}
                        sx={{ 
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 1, 
                            bgcolor: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)', 
                            borderRadius: 2, px: 2, py: 0.75,
                            transition: '0.2s',
                            '&:hover': { bgcolor: 'rgba(145, 71, 255, 0.1)', borderColor: 'rgba(145, 71, 255, 0.3)' }
                        }}
                    >
                        <VisibilityIcon sx={{ color: '#a085ff', fontSize: 18 }} />
                        <Typography sx={{ color: '#e7d5ff', fontWeight: 600, fontSize: '0.875rem' }}>Spectateurs</Typography>
                        <Chip label={spectateurs.length} size="small" sx={{ cursor: 'pointer', bgcolor: spectateurs.length > 0 ? 'rgba(0, 230, 118, 0.15)' : 'rgba(255,255,255,0.1)', color: spectateurs.length > 0 ? '#00e676' : '#fff', fontWeight: 800, height: 20 }} />
                    </Box>
                </Box>

                <Box sx={{ position: 'relative', width: { xs: '100%', md: '400px' } }}>
                    <TextField
                        size="small" fullWidth placeholder={`Ajouter une source (${playlist.length}/10)...`} value={inputValue} onChange={(e) => setInputValue(e.target.value)} disabled={playlist.length >= 10} onKeyDown={(e) => e.key === 'Enter' && handleAddOrSearch()}
                        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{color: '#9147ff', fontSize: 18}}/></InputAdornment>, endAdornment: isSearching ? <CircularProgress size={16} sx={{color: '#9147ff'}}/> : null }}
                        sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'rgba(0,0,0,0.5)', borderRadius: 2, color: 'white', fontSize: '0.875rem', '& fieldset': { borderColor: 'rgba(145, 71, 255, 0.3)' }, '&:hover fieldset': { borderColor: '#9147ff' }, '&.Mui-focused fieldset': { borderColor: '#b07bff', borderWidth: '1px' } } }}
                    />
                    {renderSearchResults()}
                </Box>
            </Box>

            <Box sx={{ flexGrow: 1, p: { xs: 2, md: 3 }, overflowY: 'auto' }}>
                <Grid container spacing={3}>
                    {playlist.map((videoId) => {
                        const isLive = liveVideoId === videoId;

                        return (
                            <Grid item xs={12} sm={6} lg={4} xl={3} key={videoId}>
                                <Box sx={{
                                    height: '100%',
                                    bgcolor: '#120f1a', borderRadius: 3, overflow: 'hidden', position: 'relative', border: isLive ? '2px solid #ff3366' : '1px solid rgba(145, 71, 255, 0.2)', boxShadow: isLive ? '0 0 30px rgba(255, 51, 102, 0.3)' : '0 10px 20px rgba(0,0,0,0.5)', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', display: 'flex', flexDirection: 'column',
                                    '@keyframes pulseRed': { '0%': { boxShadow: '0 0 0 0 rgba(255, 51, 102, 0.4)' }, '70%': { boxShadow: '0 0 0 15px rgba(255, 51, 102, 0)' }, '100%': { boxShadow: '0 0 0 0 rgba(255, 51, 102, 0)' } },
                                    animation: isLive ? 'pulseRed 2s infinite' : 'none',
                                }}>
                                    
                                    <Box sx={{ px: 1.5, py: 1, display: 'flex', flexDirection: 'column', gap: 1, bgcolor: isLive ? 'rgba(255, 51, 102, 0.1)' : 'rgba(0,0,0,0.3)', borderBottom: '1px solid', borderColor: isLive ? 'rgba(255, 51, 102, 0.2)' : 'rgba(255,255,255,0.05)' }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            {isLive ? (
                                                <Chip icon={<SensorsIcon sx={{ color: 'white !important' }}/>} label="PROGRAMME" size="small" sx={{ bgcolor: '#ff3366', color: 'white', fontWeight: 800, borderRadius: 1, height: 24, '& .MuiChip-label': { px: 1 } }} />
                                            ) : (
                                                <Chip label="PREVIEW" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: '#a085ff', fontWeight: 700, borderRadius: 1, height: 24 }} />
                                            )}

                                            <IconButton size="small" onClick={() => handleRemoveVideo(videoId)} sx={{ color: 'rgba(255,255,255,0.3)', p: 0.5, '&:hover': { color: '#ff6b6b', bgcolor: 'rgba(255,107,138,0.1)' } }}>
                                                <CloseIcon fontSize="small" />
                                            </IconButton>
                                        </Box>
                                        
                                        <Typography noWrap sx={{ color: 'white', fontSize: '0.85rem', fontWeight: 600, opacity: 0.9 }}>
                                            {videoDetails[videoId]?.title || `ID: ${videoId}`}
                                        </Typography>
                                    </Box>

                                    <Box sx={{ p: 1, bgcolor: '#000' }}>
                                        <VideoPlayerShell 
                                            url={`https://www.youtube.com/watch?v=${videoId}`} 
                                            playing={localPlaying[videoId] ?? false} 
                                            seekToTimestamp={initialSeeks[videoId]} 
                                            canControl={true} 
                                            gridMode={true}
                                            onPlay={() => handlePlay(videoId)} 
                                            onPause={() => handlePause(videoId)} 
                                            onProgress={(seconds) => handleProgress(videoId, seconds)} 
                                        />
                                    </Box>

                                    <Box sx={{ p: 1.5, bgcolor: isLive ? 'rgba(255, 51, 102, 0.05)' : 'transparent', marginTop: 'auto' }}>
                                        {isLive ? (
                                            <Button fullWidth variant="outlined" startIcon={<SensorsIcon />} onClick={() => handleBroadcast(videoId)} sx={{ fontWeight: 800, color: '#ff3366', borderColor: 'rgba(255, 51, 102, 0.5)', '&:hover': { borderColor: '#ff3366', bgcolor: 'rgba(255, 51, 102, 0.1)' } }}>
                                                ACTUALISER LE TIMER
                                            </Button>
                                        ) : (
                                            <Button fullWidth variant="contained" startIcon={<SendIcon />} onClick={() => handleBroadcast(videoId)} sx={{ fontWeight: 700, color: 'white', bgcolor: 'rgba(145, 71, 255, 0.2)', boxShadow: 'none', '&:hover': { bgcolor: '#9147ff', boxShadow: '0 4px 15px rgba(145, 71, 255, 0.4)' } }}>
                                                ENVOYER AU DIRECT
                                            </Button>
                                        )}
                                    </Box>
                                </Box>
                            </Grid>
                        );
                    })}
                </Grid>
            </Box>

            {/* MODAL LISTE DES SPECTATEURS */}
            <Dialog 
                open={spectatorsModalOpen} 
                onClose={() => setSpectatorsModalOpen(false)} 
                PaperProps={{ sx: { bgcolor: '#120f1a', color: 'white', minWidth: { xs: 300, sm: 400 }, border: '1px solid rgba(145, 71, 255, 0.3)' } }}
            >
                <DialogTitle sx={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Gérer les spectateurs</DialogTitle>
                <DialogContent sx={{ p: 0 }}>
                    <List>
                        {spectateurs.length === 0 ? (
                            <ListItem><Typography sx={{ color: 'text.secondary', p: 2 }}>Aucun spectateur pour le moment.</Typography></ListItem>
                        ) : (
                            spectateurs.map(spec => (
                                <ListItem key={spec.user_id} divider sx={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                                    <ListItemText 
                                        primary={spec.username || "Utilisateur anonyme"} 
                                        sx={{ '& .MuiListItemText-primary': { color: '#e7d5ff', fontWeight: 600 } }} 
                                    />
                                    <Button 
                                        size="small" 
                                        variant="outlined" 
                                        color="warning"
                                        onClick={() => { setTransferTarget(spec); setSpectatorsModalOpen(false); }}
                                    >
                                        Nommer Régisseur
                                    </Button>
                                </ListItem>
                            ))
                        )}
                    </List>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setSpectatorsModalOpen(false)} sx={{ color: '#b07bff' }}>Fermer</Button>
                </DialogActions>
            </Dialog>

            {/* MODAL CONFIRMATION TRANSFERT */}
            <Dialog 
                open={!!transferTarget} 
                onClose={() => setTransferTarget(null)} 
                PaperProps={{ sx: { bgcolor: '#120f1a', color: 'white', border: '1px solid rgba(255, 51, 102, 0.5)' } }}
            >
                <DialogTitle sx={{ color: '#ff3366', fontWeight: 800 }}>Transférer les commandes ?</DialogTitle>
                <DialogContent>
                    <Typography sx={{ color: '#e7d5ff' }}>
                        Êtes-vous sûr de vouloir transférer la régie à <b>{transferTarget?.username || 'cet utilisateur'}</b> ?
                    </Typography>
                    <Typography sx={{ mt: 2, color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem' }}>
                        Vous perdrez immédiatement vos droits de régisseur et serez redirigé vers la vue spectateur. Cette action est irréversible.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setTransferTarget(null)} sx={{ color: 'white' }}>Annuler</Button>
                    <Button onClick={executeTransfer} variant="contained" color="error" sx={{ fontWeight: 700 }}>
                        Confirmer le transfert
                    </Button>
                </DialogActions>
            </Dialog>

        </Box>
    );
}