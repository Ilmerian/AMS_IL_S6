// src/components/VideoPlayerShell.jsx
import { useEffect, useRef, useState, useCallback } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '../ui/Card'
import { getYouTubeId, toEmbedUrl } from '../utils/youtube'

export default function VideoPlayerShell({ 
  url, 
  playing, 
  onPlay, 
  onPause, 
  onSeek, 
  onProgress,
  seekToTimestamp 
}) {
  const iframeRef = useRef(null)
  const intervalRef = useRef(null)
  const [isIframeReady, setIsIframeReady] = useState(false)
  const [currentVideoId, setCurrentVideoId] = useState(null)
  const [pendingCommands, setPendingCommands] = useState([])

  const videoId = getYouTubeId(url || '')
  const embedUrl = videoId ? toEmbedUrl(videoId) : null

  const sendCommand = useCallback((command, value = null) => {
    if (!iframeRef.current?.contentWindow || !isIframeReady) {
      setPendingCommands(prev => [...prev, { command, value }])
      return false
    }

    try {
      const message = JSON.stringify({
        event: 'command',
        func: command,
        args: value !== null ? [value] : undefined
      })
      
      iframeRef.current.contentWindow.postMessage(message, 'https://www.youtube.com')
      return true
    } catch (error) {
      console.error('Failed to send command to YouTube iframe:', error)
      return false
    }
  }, [isIframeReady])

  useEffect(() => {
    if (isIframeReady && pendingCommands.length > 0) {
      pendingCommands.forEach(({ command, value }) => {
        sendCommand(command, value)
      })
      setPendingCommands([])
    }
  }, [isIframeReady, pendingCommands, sendCommand])

  useEffect(() => {
    if (videoId && videoId !== currentVideoId) {
      console.log("🎬 Video changed from", currentVideoId, "to", videoId)
      setCurrentVideoId(videoId)
      setIsIframeReady(false)
      setPendingCommands([])
    }
  }, [videoId, currentVideoId])

  useEffect(() => {
    if (!embedUrl) return

    if (playing) {
      console.log("▶️ Sending play command")
      sendCommand('playVideo')
    } else {
      console.log("⏸️ Sending pause command")
      sendCommand('pauseVideo')
    }
  }, [playing, embedUrl, sendCommand])

  useEffect(() => {
    if (seekToTimestamp === null || seekToTimestamp === undefined) return
    if (!embedUrl) return

    console.log("🎯 Sending seek command:", seekToTimestamp)
    sendCommand('seekTo', seekToTimestamp)
  }, [seekToTimestamp, embedUrl, sendCommand])

  useEffect(() => {
    if (!embedUrl || !isIframeReady) return

    const checkProgress = () => {
      const iframe = iframeRef.current
      if (!iframe?.contentWindow) return

      const message = JSON.stringify({
        event: 'listening',
        id: iframe.dataset.id
      })
      
      iframe.contentWindow.postMessage(message, 'https://www.youtube.com')
    }

    intervalRef.current = setInterval(checkProgress, 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [embedUrl, isIframeReady])

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.origin !== 'https://www.youtube.com') return
      
      try {
        const data = JSON.parse(event.data)
        
        if (data.event === 'infoDelivery' && data.info) {
          if (data.info.currentTime !== undefined && onProgress) {
            onProgress(data.info.currentTime)
          }

          if (data.info.playerState !== undefined) {
            const playerState = data.info.playerState
            if (playerState === 1 && !playing && onPlay) {
              console.log("👆 YouTube Player Started Playing")
              onPlay()
            } else if (playerState === 2 && playing && onPause) {
              console.log("👆 YouTube Player Paused")
              onPause()
            }
          }
        }
      } catch (error) {
        console.error('Failed to parse message from YouTube iframe:', error)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [playing, onPlay, onPause, onProgress])

  const handleLoad = () => {
    console.log("✅ YouTube iframe loaded")
    setIsIframeReady(true)
    
    if (iframeRef.current?.contentWindow) {
      const message = JSON.stringify({
        event: 'listening',
        id: iframeRef.current.dataset.id
      })
      
      iframeRef.current.contentWindow.postMessage(message, 'https://www.youtube.com')
    }
  }

  const handleError = () => {
    console.error("❌ YouTube iframe failed to load")
    setIsIframeReady(false)
  }

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
    )
  }

  return (
    <Card sx={{ p: 0, overflow: 'hidden', minHeight: { xs: 360, sm: 420, md: 480, lg: 540 } }}>
      <Box sx={{ 
        position: 'relative', 
        width: '100%', 
        height: { xs: 320, sm: 420, md: '55vh', lg: '65vh' }, 
        bgcolor: 'black'
      }}>
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
          onError={handleError}
          style={{
            display: 'block'
          }}
          data-id="1"
        />
      </Box>
    </Card>
  )
}