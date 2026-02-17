import { useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getYouTubeId } from '../utils/youtube';
import VideoPlayerShell from '../components/VideoPlayerShell'; // <-- ON UTILISE VOTRE COMPOSANT !
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Grid from '@mui/material/Grid';
import SendIcon from '@mui/icons-material/Send';
import Section from '../ui/Section';

export default function RegieDirector() {
    const [phase, setPhase] = useState('setup');
    const [playlist, setPlaylist] = useState([]);
    const [inputUrl, setInputUrl] = useState('');
    
    // On va stocker l'avancement en secondes de chaque vidéo ici grâce à onProgress
    const progressRefs = useRef({});

    const handleAddVideo = () => {
        const videoId = getYouTubeId(inputUrl);
        if (videoId && playlist.length < 10 && !playlist.includes(videoId)) {
            setPlaylist([...playlist, videoId]);
            setInputUrl('');
        }
    };

    const handleBroadcast = async (index, videoId) => {
        // On récupère le temps de la vidéo (0 si elle n'a pas encore été lancée)
        const currentTime = progressRefs.current[index] || 0;

        try {
            await supabase.from('regie_state').update({
                video_id: videoId,
                video_cursor: currentTime,
                updated_at: new Date().toISOString()
            }).eq('id', 1);
            
            console.log(`Vidéo ${videoId} envoyée à l'écran à ${currentTime}s`);
        } catch (e) {
            console.error("Erreur d'envoi", e);
        }
    };

    if (phase === 'setup') {
        return (
            <Section>
                <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
                    <Typography variant="h4" gutterBottom>Préparation de la Régie</Typography>
                    <Stack direction="row" spacing={2} sx={{ mb: 4 }}>
                        <TextField 
                            fullWidth 
                            label="URL YouTube" 
                            value={inputUrl} 
                            onChange={(e) => setInputUrl(e.target.value)} 
                            disabled={playlist.length >= 10}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddVideo()}
                        />
                        <Button variant="contained" onClick={handleAddVideo} disabled={playlist.length >= 10}>
                            Ajouter
                        </Button>
                    </Stack>
                    
                    <Typography variant="h6" gutterBottom>Vidéos ({playlist.length}/10)</Typography>
                    <Stack spacing={1} sx={{ mb: 4 }}>
                        {playlist.map((id, i) => (
                            <Box key={i} sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
                                <img src={`https://img.youtube.com/vi/${id}/mqdefault.jpg`} alt="thumbnail" style={{ height: 40, borderRadius: 4 }} />
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
            <Typography variant="h4" sx={{ mb: 3, color: 'white' }}>Live - Régisseur</Typography>
            <Grid container spacing={2}>
                {playlist.map((videoId, index) => (
                    <Grid item xs={12} sm={6} md={4} key={index}>
                        <Box sx={{ bgcolor: 'black', borderRadius: 2, overflow: 'hidden', p: 1, border: '1px solid #333' }}>
                            
                            {/* NOTRE COMPOSANT MAISON */}
                            <VideoPlayerShell
                                url={`https://www.youtube.com/watch?v=${videoId}`}
                                playing={false} // Pas d'autoplay pour ne pas faire crasher le navigateur
                                canControl={true} // Le régisseur peut cliquer sur play
                                onProgress={(seconds) => { progressRefs.current[index] = seconds; }} // On capture le timer !
                            />
                            
                            <Button 
                                fullWidth 
                                variant="contained" 
                                color="error" 
                                startIcon={<SendIcon />}
                                onClick={() => handleBroadcast(index, videoId)}
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