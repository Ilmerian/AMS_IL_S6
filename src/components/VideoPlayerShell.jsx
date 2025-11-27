// src/components/VideoPlayerShell.jsx
import { useEffect, useRef, useState, useCallback } from 'react';
import { YOUTUBE_ERROR_CODES, isFatalError, isTransientError, getErrorMessage } from '../utils/youtubeErrors';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '../ui/Card';
import { getYouTubeId, toEmbedUrl } from '../utils/youtube';

export default function VideoPlayerShell({ 
  url, 
  playing, 
  onPlay, 
  onPause,  
  onProgress,
  seekToTimestamp,
  canControl,
  onEnded,
  onError
}) {
  const iframeRef = useRef(null);
  const [isIframeReady, setIsIframeReady] = useState(false);
  const [currentVideoId, setCurrentVideoId] = useState(null);
  const [pendingCommands, setPendingCommands] = useState([]);
  const commandTimeoutRef = useRef(null);
  const [errorState, setErrorState] = useState(null);

  const videoId = getYouTubeId(url || '');
  const embedUrl = videoId ? toEmbedUrl(videoId) : null;

  const handlePlayerError = useCallback((errorCode) => {
    console.error(`🎬 YouTube Player Error: ${errorCode}`, getErrorMessage(errorCode));
    
    const errorInfo = {
      type: 'youtube_error',
      code: errorCode,
      message: getErrorMessage(errorCode),
      videoId: currentVideoId,
      isFatal: isFatalError(errorCode),
      isTransient: isTransientError(errorCode)
    };
    
    setErrorState(errorInfo);
    
    if (onError) {
      onError(errorInfo);
    }
    
    if (onPause) {
      onPause();
    }
  }, [currentVideoId, onError, onPause]);  

  const sendCommand = useCallback((command, value = null) => {
    if (!canControl && ['playVideo', 'pauseVideo', 'seekTo'].includes(command)) {
        console.warn(`[ACL] Command blocked: ${command}. User does not have control.`);
        return false;
    }

    if (!iframeRef.current?.contentWindow || !isIframeReady) {
      setPendingCommands(prev => [...prev, { command, value }]);
      return false;
    }

    try {
      const message = JSON.stringify({
        event: 'command',
        func: command,
        args: value !== null ? [value] : undefined
      });
      
      iframeRef.current.contentWindow.postMessage(message, 'https://www.youtube.com');
      return true;
    } catch (error) {
      console.warn('Failed to send command to YouTube iframe:', error);
      return false;
    }
  }, [isIframeReady, canControl]);

  useEffect(() => {
    if (isIframeReady && pendingCommands.length > 0) {
      const executeCommands = () => {
        pendingCommands.forEach(({ command, value }) => {
          sendCommand(command, value);
        });
        setPendingCommands([]);
      };
      
      const timeoutId = setTimeout(executeCommands, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [isIframeReady, pendingCommands, sendCommand]);

  useEffect(() => {
    if (videoId && videoId !== currentVideoId) {
      console.log("🎬 Video changed from", currentVideoId, "to", videoId);
      setCurrentVideoId(videoId);
      setIsIframeReady(false);
      setPendingCommands([]);
      setErrorState(null);
    }
  }, [videoId, currentVideoId]);

  useEffect(() => {
    if (!embedUrl) return;

    if (playing) {
      console.log("▶️ Sending play command");
      sendCommand('playVideo');
    } else {
      console.log("⏸️ Sending pause command");
      sendCommand('pauseVideo');
    }
  }, [playing, embedUrl, sendCommand]);

  useEffect(() => {
    if (seekToTimestamp === null || seekToTimestamp === undefined) return;
    if (!embedUrl) return;

    console.log("🎯 Sending seek command:", seekToTimestamp);
    sendCommand('seekTo', seekToTimestamp);
  }, [seekToTimestamp, embedUrl, sendCommand]);

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.origin !== 'https://www.youtube.com') return;
      
      try {
        const allowedOrigins = [
          'https://www.youtube.com',
          'https://www.youtube-nocookie.com',
          'https://youtube.com'
        ];
        
        if (!allowedOrigins.includes(event.origin)) return;        
        const data = JSON.parse(event.data);
        
        if (data.event === 'error' && data.info) {
          const errorCode = data.info;
          handlePlayerError(errorCode);
          return;
        }
        
        if (data.event === 'infoDelivery' && data.info) {
          if (data.info.currentTime !== undefined && onProgress) {
            onProgress(data.info.currentTime);
          }

          if (data.info.playerState !== undefined) {
            const playerState = data.info.playerState;
            if (playerState === 1 && !playing && onPlay) {
              console.log("👆 YouTube Player Started Playing");
              setErrorState(null);
              onPlay();
            } else if (playerState === 2 && playing && onPause) {
              console.log("👆 YouTube Player Paused");
              onPause();
            } else if (playerState === 0 && onEnded) {
              console.log("👆 YouTube Player Ended");
              onEnded();
            }
          }
        }
      } catch (error) {
        console.warn("Failed to parse message from YouTube iframe:", error);
      }
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [playing, onPlay, onPause, onProgress, onEnded, handlePlayerError]);

  const handleLoad = () => {
    console.log("✅ YouTube iframe loaded");
    setIsIframeReady(true);
    
    if (commandTimeoutRef.current) {
      clearTimeout(commandTimeoutRef.current);
    }
    
    commandTimeoutRef.current = setTimeout(() => {
      if (iframeRef.current?.contentWindow) {
        const message = JSON.stringify({
          event: 'listening',
          id: iframeRef.current.dataset.id
        });
        
        iframeRef.current.contentWindow.postMessage(message, 'https://www.youtube.com');
      }
    }, 1500);
  };

  useEffect(() => {
    return () => {
      if (commandTimeoutRef.current) {
        clearTimeout(commandTimeoutRef.current);
      }
    };
  }, []);

  if (!embedUrl) {
    return (
      <Card sx={{ p: 0, overflow: 'hidden', minHeight: { xs: 360, sm: 420, md: 480, lg: 540 } }}>
        <Box sx={{ 
          position: 'relative', 
          width: '100%', 
          height: { xs: 320, sm: 420, md: '55vh', lg: '65vh' }, 
          bgcolor: 'black', 
          display: 'grid', 
          placeItems: 'center',
          color: 'white'
        }}>
          <Typography>Select a video to play</Typography>
        </Box>
      </Card>
    );
  }

  return (
    <Card sx={{ p: 0, overflow: 'hidden', minHeight: { xs: 360, sm: 420, md: 480, lg: 540 } }}>
      <Box sx={{ 
        position: 'relative', 
        width: '100%', 
        height: { xs: 320, sm: 420, md: '55vh', lg: '65vh' }, 
        bgcolor: 'black'
      }}>
        {errorState && (
          <Box sx={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'grid', 
            placeItems: 'center',
            color: 'white',
            zIndex: 2,
            backgroundColor: 'rgba(0,0,0,0.9)',
            p: 2
          }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" color="error" gutterBottom>
                Playback error
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                {errorState.message}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                {errorState.isTransient && (
                  <Button 
                    variant="contained" 
                    size="small"
                    onClick={() => {
                      setErrorState(null);
                      if (onPlay) onPlay();
                    }}
                  >
                    Retry
                  </Button>
                )}
                <Button 
                  variant="outlined" 
                  size="small"
                  onClick={() => {
                    setErrorState(null);
                    if (onError && errorState.isFatal) {
                      onError({ ...errorState, action: 'skip' });
                    }
                  }}
                >
                  {errorState.isFatal ? 'Skip' : 'Cloese'}
                </Button>
              </Box>
            </Box>
          </Box>
        )}
        
        {!isIframeReady && (
          <Box sx={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'grid', 
            placeItems: 'center',
            color: 'white',
            zIndex: 1,
            backgroundColor: 'rgba(0,0,0,0.8)'
          }}>
            <Typography>Loading video...</Typography>
          </Box>
        )}
        
        <iframe
          ref={iframeRef}
          src={`${embedUrl}&enablejsapi=1&widgetid=1`}
          width="100%"
          height="100%"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          onLoad={handleLoad}
          onError={() => handlePlayerError(2)}
          style={{
            display: 'block'
          }}
          data-id="1"
          title="YouTube video player"
        />
      </Box>
    </Card>
  );
}