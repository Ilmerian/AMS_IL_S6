import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import VideoPlayerShell from '../components/VideoPlayerShell';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export default function RegieViewer() {
    const [state, setState] = useState({
        videoId: null,
        seekTo: 0,
        isPlaying: false
    });

    useEffect(() => {
        const applyRegieState = (data) => {
            if (!data || !data.video_id) {
                setState({
                    videoId: null,
                    seekTo: 0,
                    isPlaying: false
                });
                return;
            }

            const isPlaying = !!data.is_playing;
            const baseCursor = Number(data.video_cursor || 0);

            let computedSeek = baseCursor;

            if (isPlaying && data.updated_at) {
                const elapsedSeconds = (Date.now() - new Date(data.updated_at).getTime()) / 1000;
                computedSeek = baseCursor + Math.max(0, elapsedSeconds);
            }

            setState({
                videoId: data.video_id,
                seekTo: computedSeek,
                isPlaying
            });
        };

        const loadInitialState = async () => {
            try {
                const { data, error } = await supabase
                    .from('regie_state')
                    .select('*')
                    .eq('id', 1)
                    .single();

                if (error) throw error;
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
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'regie_state',
                    filter: 'id=eq.1'
                },
                (payload) => {
                    applyRegieState(payload.new);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    return (
        <Box
            sx={{
                width: '100%',
                height: 'calc(100vh - 64px)',
                bgcolor: 'black',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}
        >
            {state.videoId ? (
                <VideoPlayerShell
                    url={`https://www.youtube.com/watch?v=${state.videoId}`}
                    playing={state.isPlaying}
                    seekToTimestamp={state.seekTo}
                    canControl={false}
                />
            ) : (
                <Typography variant="h5" color="text.secondary">
                    En attente du régisseur...
                </Typography>
            )}
        </Box>
    );
}