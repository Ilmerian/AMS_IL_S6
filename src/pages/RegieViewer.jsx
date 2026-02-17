import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import VideoPlayerShell from '../components/VideoPlayerShell';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export default function RegieViewer() {
    const [state, setState] = useState({ videoId: null, seekTo: 0 });

    useEffect(() => {
        // 1. Récupérer l'état initial
        supabase.from('regie_state').select('*').eq('id', 1).single().then(({ data }) => {
            if (data && data.video_id) {
                // Calculer le temps écoulé depuis que le régisseur a envoyé la vidéo
                const elapsedSeconds = (Date.now() - new Date(data.updated_at).getTime()) / 1000;
                setState({ videoId: data.video_id, seekTo: data.video_cursor + elapsedSeconds });
            }
        });

        // 2. Écouter les changements en temps réel
        const channel = supabase.channel('regie_sync')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'regie_state', filter: 'id=eq.1' }, (payload) => {
                setState({ videoId: payload.new.video_id, seekTo: payload.new.video_cursor });
            }).subscribe();

        return () => supabase.removeChannel(channel);
    }, []);

    return (
        <Box sx={{ width: '100%', height: 'calc(100vh - 64px)', bgcolor: 'black', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {state.videoId ? (
                <VideoPlayerShell
                    url={`https://www.youtube.com/watch?v=${state.videoId}`}
                    playing={true}
                    seekToTimestamp={state.seekTo}
                    canControl={false} // Le spectateur ne contrôle rien
                />
            ) : (
                <Typography variant="h5" color="text.secondary">
                    En attente du régisseur...
                </Typography>
            )}
        </Box>
    );
}