import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import VideoPlayerShell from '../components/VideoPlayerShell';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

export default function RegieViewer() {
    const { roomId } = useParams();

    const [state, setState] = useState({
        videoId: null,
        seekTo: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!roomId) {
            setLoading(false);
            return;
        }

        const applyRegieState = (data) => {
            if (!data || !data.video_id) {
                setState({ videoId: null, seekTo: 0 });
                setLoading(false);
                return;
            }

            const baseCursor = Number(data.video_cursor || 0);
            let computedSeek = baseCursor;

            if (data.updated_at) {
                const elapsedSeconds = (Date.now() - new Date(data.updated_at).getTime()) / 1000;
                computedSeek = baseCursor + Math.max(0, elapsedSeconds);
            }

            setState({
                videoId: data.video_id,
                seekTo: computedSeek,
            });
            setLoading(false);
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
                setLoading(false);
            }
        };

        loadInitialState();

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
            }}
        >
            {state.videoId ? (
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
                <Typography variant="h5" color="text.secondary">
                    En attente du régisseur...
                </Typography>
            )}
        </Box>
    );
}