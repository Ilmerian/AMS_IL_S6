// src/components/VideoPlayerShell.jsx
import { useEffect, useRef, useState, useCallback } from 'react';
import { YOUTUBE_ERROR_CODES, isFatalError, isTransientError, getErrorMessage } from '../utils/youtubeErrors';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Card from '../ui/Card';
import { getYouTubeId, toEmbedUrl } from '../utils/youtube';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import CircularProgress from '@mui/material/CircularProgress';
import RefreshIcon from '@mui/icons-material/Refresh';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';

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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  
  const iframeRef = useRef(null);
  const [isIframeReady, setIsIframeReady] = useState(false);
  const [currentVideoId, setCurrentVideoId] = useState(null);
  const [pendingCommands, setPendingCommands] = useState([]);
  const commandTimeoutRef = useRef(null);
  const [errorState, setErrorState] = useState(null);
  const [touchMode, setTouchMode] = useState(false);

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

  // Touch controls handler
  const handleTouchControls = () => {
    if (!canControl) return;
    
    if (playing) {
      sendCommand('pauseVideo');
      if (onPause) onPause();
    } else {
      sendCommand('playVideo');
      if (onPlay) onPlay();
    }
  };

  // Responsive dimensions
  const getResponsiveHeight = () => {
    if (isMobile) return '40vh';
    if (isTablet) return '45vh';
    return '55vh';
  };

  const getMinHeight = () => {
    if (isMobile) return 240;
    if (isTablet) return 320;
    return 360;
  };

  const getLoadingFontSize = () => {
    if (isMobile) return '0.875rem';
    if (isTablet) return '1rem';
    return '1.125rem';
  };

  if (!embedUrl) {
    return (
      <Card sx={{ 
        p: 0, 
        overflow: 'hidden', 
        minHeight: getMinHeight(),
        borderRadius: isMobile ? 0 : 1
      }}>
        <Box sx={{ 
          position: 'relative', 
          width: '100%', 
          height: getResponsiveHeight(), 
          bgcolor: 'black', 
          display: 'grid', 
          placeItems: 'center',
          color: 'white'
        }}>
          <Typography sx={{ 
            fontSize: getLoadingFontSize(),
            opacity: 0.8,
            px: 2,
            textAlign: 'center'
          }}>
            Select a video to play
          </Typography>
        </Box>
      </Card>
    );
  }

  return (
    <Card sx={{ 
      p: 0, 
      overflow: 'hidden', 
      minHeight: getMinHeight(),
      borderRadius: isMobile ? 0 : 1,
      position: 'relative'
    }}>
      <Box sx={{ 
        position: 'relative', 
        width: '100%', 
        height: getResponsiveHeight(), 
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
            backgroundColor: 'rgba(0,0,0,0.95)',
            p: isMobile ? 2 : 3
          }}>
            <Box sx={{ 
              textAlign: 'center',
              maxWidth: isMobile ? '90%' : '80%'
            }}>
              <Typography 
                variant={isMobile ? "h6" : "h5"} 
                color="error" 
                gutterBottom
                sx={{ 
                  mb: 2,
                  fontSize: isMobile ? '1rem' : '1.25rem'
                }}
              >
                Playback Error
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  mb: 3,
                  opacity: 0.9,
                  fontSize: isMobile ? '0.875rem' : '1rem'
                }}
              >
                {errorState.message}
              </Typography>
              <Box sx={{ 
                display: 'flex', 
                gap: 2, 
                justifyContent: 'center',
                flexDirection: isMobile ? 'column' : 'row'
              }}>
                {errorState.isTransient && (
                  <Button 
                    variant="contained" 
                    size={isMobile ? "medium" : "large"}
                    onClick={() => {
                      setErrorState(null);
                      if (onPlay) onPlay();
                    }}
                    startIcon={<RefreshIcon />}
                    fullWidth={isMobile}
                    sx={{
                      bgcolor: '#9b5cff',
                      ':hover': { bgcolor: '#7c3aed' },
                      fontWeight: 600,
                      py: isMobile ? 1.5 : 2
                    }}
                  >
                    Retry
                  </Button>
                )}
                <Button 
                  variant="outlined" 
                  size={isMobile ? "medium" : "large"}
                  onClick={() => {
                    setErrorState(null);
                    if (onError && errorState.isFatal) {
                      onError({ ...errorState, action: 'skip' });
                    }
                  }}
                  startIcon={errorState.isFatal ? <SkipNextIcon /> : undefined}
                  fullWidth={isMobile}
                  sx={{
                    borderColor: 'rgba(255,255,255,0.3)',
                    color: 'white',
                    ':hover': {
                      borderColor: 'white',
                      bgcolor: 'rgba(255,255,255,0.1)'
                    },
                    py: isMobile ? 1.5 : 2
                  }}
                >
                  {errorState.isFatal ? 'Skip Video' : 'Close'}
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
            backgroundColor: 'rgba(0,0,0,0.9)'
          }}>
            <Box sx={{ textAlign: 'center' }}>
              <CircularProgress 
                size={isMobile ? 32 : 40} 
                sx={{ 
                  color: '#9b5cff',
                  mb: 2
                }} 
              />
              <Typography sx={{ 
                fontSize: getLoadingFontSize(),
                opacity: 0.9
              }}>
                Loading video...
              </Typography>
            </Box>
          </Box>
        )}
        
        {/* Touch overlay for mobile controls */}
        {isMobile && canControl && !errorState && (
          <Box
            onClick={handleTouchControls}
            onTouchStart={() => setTouchMode(true)}
            onTouchEnd={() => setTimeout(() => setTouchMode(false), 100)}
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: touchMode ? 0.7 : 0,
              transition: 'opacity 0.2s',
              '&:active': {
                opacity: 0.7
              }
            }}
          >
            <Box
              sx={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                bgcolor: 'rgba(0,0,0,0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
              }}
            >
              {playing ? (
                <PauseIcon sx={{ fontSize: 32 }} />
              ) : (
                <PlayArrowIcon sx={{ fontSize: 32 }} />
              )}
            </Box>
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
          style={{
            display: 'block',
            border: 'none',
            pointerEvents: isMobile && canControl ? 'auto' : 'auto'
          }}
          data-id="1"
          title="YouTube video player"
          // Mobile optimizations
          playsInline={isMobile}
          webkit-playsinline={isMobile ? "true" : undefined}
          // Better mobile performance
          loading="lazy"
        />
        
        {/* Mobile control indicator */}
        {isMobile && canControl && !errorState && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 8,
              right: 8,
              bgcolor: 'rgba(0,0,0,0.6)',
              color: 'white',
              borderRadius: 1,
              px: 1,
              py: 0.5,
              fontSize: '0.7rem',
              opacity: 0.8,
              zIndex: 1
            }}
          >
            Tap to {playing ? 'pause' : 'play'}
          </Box>
        )}
        
        {/* Loading overlay for poor connections */}
        {!isIframeReady && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              bgcolor: 'rgba(0,0,0,0.8)',
              color: 'white',
              p: 1,
              fontSize: '0.75rem',
              textAlign: 'center',
              zIndex: 1
            }}
          >
            Initializing YouTube Player...
          </Box>
        )}
      </Box>
      
      {/* Video info for mobile */}
      {isMobile && embedUrl && (
        <Box
          sx={{
            p: 1.5,
            borderTop: '1px solid rgba(255,255,255,0.1)',
            bgcolor: 'rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <Typography
            variant="caption"
            sx={{
              opacity: 0.7,
              fontSize: '0.75rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1
            }}
          >
            YouTube • {videoId}
          </Typography>
          
          {canControl && (
            <Typography
              variant="caption"
              sx={{
                opacity: 0.5,
                fontSize: '0.7rem',
                ml: 1
              }}
            >
              {playing ? '▶️ Playing' : '⏸️ Paused'}
            </Typography>
          )}
        </Box>
      )}
    </Card>
  );
}