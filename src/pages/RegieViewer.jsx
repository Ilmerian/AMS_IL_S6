import { useState, useEffect } from 'react';
import { useParams } from "react-router-dom";
import { supabase } from '../lib/supabaseClient';
import VideoPlayerShell from '../components/VideoPlayerShell';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export default function RegieViewer() {
    const { roomId } = useParams();

    const [state, setState] = useState({
        videoId: null,
        seekTo: 0
    });

    useEffect(() => {
        const applyRegieState = (data) => {
            if (!data || !data.video_id) {
                setState({ videoId: null, seekTo: 0 });
                return;
            }

            // On prend le timer de la base de données
            const baseCursor = Number(data.video_cursor || 0);
            let computedSeek = baseCursor;

            // On ajoute systématiquement le temps écoulé depuis l'envoi
            if (data.updated_at) {
                const elapsedSeconds = (Date.now() - new Date(data.updated_at).getTime()) / 1000;
                computedSeek = baseCursor + Math.max(0, elapsedSeconds);
            }

            setState({
                videoId: data.video_id,
                seekTo: computedSeek
            });
        };

        const loadInitialState = async () => {
            try {
                const { data, error } = await supabase
                    .from('regie_state')
                    .select('*')
                    .eq('room_id', roomId)
                    .single();

                if (error && error.code !== 'PGRST116') throw error;
                applyRegieState(data);
            } catch (e) {
                console.error('[RegieViewer] erreur chargement état initial', e);
            }
        };

        loadInitialState();

        const channel = supabase
            .channel('regie_sync')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'regie_state',
                    filter: `room_id=eq.${roomId}`
                },
                (payload) => applyRegieState(payload.new)
            )
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [roomId]);

    return (
        <Box
            sx={{
                width: '100%',
                height: 'calc(100vh - 64px)', // Prend toute la hauteur sous le menu
                bgcolor: 'black',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                p: { xs: 0, md: 4 } // Ajoute un petit bord élégant sur PC
            }}
        >
            {state.videoId ? (
                // Ce conteneur définit la taille max de la vidéo
                <Box sx={{ width: '100%', height: '100%', maxWidth: '1600px' }}> 
                    <VideoPlayerShell
                        url={`https://www.youtube.com/watch?v=${state.videoId}`}
                        playing={true}
                        seekToTimestamp={state.seekTo}
                        canControl={false}
                        fullSize={true} /* <--- ON ACTIVE LE MODE GÉANT ICI */
                    />
                </Box>
            ) : (
                <Typography variant="h5" color="text.secondary">
                    En attente du régisseur...
                </Typography>
            )}
        </Box>
    );
}