import { useEffect, useRef, useState, useCallback } from 'react';
import { YOUTUBE_ERROR_CODES, isFatalError, isTransientError, getErrorMessage } from '../utils/youtubeErrors';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '../ui/Card';
import { getYouTubeId, toEmbedUrl } from '../utils/youtube';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import CircularProgress from '@mui/material/CircularProgress';

export default function VideoPlayerShell({ 
  url, 
  playing, 
  onPlay, 
  onPause,  
  onProgress,
  seekToTimestamp,
  canControl,
  onEnded,
  onError,
  fullSize = false
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  
  const iframeRef = useRef(null);
  
  const playerIdRef = useRef(`player-${Math.random().toString(36).substr(2, 9)}`);
  
  const [isIframeReady, setIsIframeReady] = useState(false);
  const [currentVideoId, setCurrentVideoId] = useState(null);
  const [pendingCommands, setPendingCommands] = useState([]);
  const commandTimeoutRef = useRef(null);
  const [errorState, setErrorState] = useState(null);
  const lastPlayerStateRef = useRef(null);
  const lastPauseAtRef = useRef(0);

  const videoId = getYouTubeId(url || '');
  const embedUrl = videoId ? toEmbedUrl(videoId) : null;

  const handlePlayerError = useCallback((errorCode) => {
    const errorInfo = {
      type: 'youtube_error', code: errorCode, message: getErrorMessage(errorCode),
      videoId: currentVideoId, isFatal: isFatalError(errorCode), isTransient: isTransientError(errorCode)
    };
    setErrorState(errorInfo);
    if (onError) onError(errorInfo);
    if (onPause) onPause();
  }, [currentVideoId, onError, onPause]);  

  const sendCommand = useCallback((command, value = null) => {
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
      return false;
    }
  }, [isIframeReady]);

  useEffect(() => {
    if (isIframeReady && pendingCommands.length > 0) {
      const executeCommands = () => {
        pendingCommands.forEach(({ command, value }) => sendCommand(command, value));
        setPendingCommands([]);
      };
      const timeoutId = setTimeout(executeCommands, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [isIframeReady, pendingCommands, sendCommand]);

  useEffect(() => {
    if (videoId && videoId !== currentVideoId) {
      setCurrentVideoId(videoId);
      setIsIframeReady(false);
      setPendingCommands([]);
      setErrorState(null);
    }
  }, [videoId, currentVideoId]);

  useEffect(() => {
    if (!embedUrl) return;
    if (playing) sendCommand('playVideo');
    else sendCommand('pauseVideo');
  }, [playing, embedUrl, sendCommand]);

  useEffect(() => {
    if (seekToTimestamp === null || seekToTimestamp === undefined || !embedUrl) return;
    sendCommand('seekTo', seekToTimestamp);
  }, [seekToTimestamp, embedUrl, sendCommand]);

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.origin !== 'https://www.youtube.com') return;
      
      if (iframeRef.current && event.source !== iframeRef.current.contentWindow) return;
      
      try {
        const data = JSON.parse(event.data);
        
        if (data.id && data.id !== playerIdRef.current) return;
        
        if (data.event === 'error' && data.info) {
          handlePlayerError(data.info);
          return;
        }
        
        if (data.event === 'infoDelivery' && data.info) {
          if (data.info.currentTime !== undefined && onProgress) {
            onProgress(data.info.currentTime);
          }

          if (data.info.playerState !== undefined) {
            const playerState = data.info.playerState;
            
            if (playerState === 1 && !playing && onPlay) {
              setErrorState(null);
              const sincePause = Date.now() - lastPauseAtRef.current;
              if (sincePause > 800) onPlay();
              
            } else if (playerState === 2) {
              if (!canControl) {
                sendCommand('playVideo'); 
              } else if (playing && onPause) {
                lastPauseAtRef.current = Date.now();
                onPause();
              }
            } else if (playerState === 0 && onEnded) {
              onEnded();
            }
            lastPlayerStateRef.current = playerState;
          }
        }
      } catch (error) {
      }
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [playing, onPlay, onPause, onProgress, onEnded, handlePlayerError, canControl, sendCommand]);

  const handleLoad = () => {
    setIsIframeReady(true);
    if (commandTimeoutRef.current) clearTimeout(commandTimeoutRef.current);
    
    commandTimeoutRef.current = setTimeout(() => {
      if (iframeRef.current?.contentWindow) {
        // On envoie l'ID unique à YouTube pour qu'il nous le renvoie dans ses messages
        const message = JSON.stringify({ 
            event: 'listening', 
            id: playerIdRef.current 
        });
        iframeRef.current.contentWindow.postMessage(message, 'https://www.youtube.com');
      }
    }, 1500);
  };

  useEffect(() => {
    return () => {
      if (commandTimeoutRef.current) clearTimeout(commandTimeoutRef.current);
    };
  }, []);

  const getResponsiveHeight = () => {
    if (fullSize) return '100%';
    return isMobile ? '40vh' : (isTablet ? '45vh' : '55vh');
  };

  const getMinHeight = () => {
    if (fullSize) return '100%';
    return isMobile ? 240 : (isTablet ? 320 : 360);
  };

  if (!embedUrl) {
    return (
      <Card sx={{ p: 0, overflow: 'hidden', minHeight: getMinHeight(), height: fullSize ? '100%' : 'auto', width: '100%', borderRadius: isMobile || fullSize ? 0 : 1 }}>
        <Box sx={{ position: 'relative', width: '100%', height: getResponsiveHeight(), bgcolor: 'black', display: 'grid', placeItems: 'center', color: 'white' }}>
          <Typography sx={{ opacity: 0.8, px: 2 }}>Select a video</Typography>
        </Box>
      </Card>
    );
  }

  return (
    <Card sx={{ p: 0, overflow: 'hidden', minHeight: getMinHeight(), height: fullSize ? '100%' : 'auto', width: '100%', borderRadius: isMobile || fullSize ? 0 : 1, position: 'relative' }}>
      <Box sx={{ position: 'relative', width: '100%', height: getResponsiveHeight(), bgcolor: 'black' }}>
        
        {!isIframeReady && (
          <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'grid', placeItems: 'center', color: 'white', zIndex: 1, backgroundColor: 'rgba(0,0,0,0.9)' }}>
            <CircularProgress size={isMobile ? 32 : 40} sx={{ color: '#9b5cff' }} />
          </Box>
        )}

        <iframe
          ref={iframeRef}
          src={`${embedUrl}&enablejsapi=1&widgetid=1${isMobile ? '&playsinline=1' : ''}`}
          width="100%"
          height="100%"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          onLoad={handleLoad}
          onError={() => handlePlayerError(2)}
          style={{ display: 'block', border: 'none', pointerEvents: 'auto' }}
          data-id={playerIdRef.current}
          title="YouTube video player"
          playsInline={isMobile}
          loading="lazy"
        />
      </Box>
    </Card>
  );
}