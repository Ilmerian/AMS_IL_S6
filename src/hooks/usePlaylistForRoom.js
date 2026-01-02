// src/hooks/usePlaylistForRoom.js
import { useEffect, useState, useRef, useCallback } from 'react'
import { PlaylistService } from '../services/PlaylistService'
import { VideoService } from '../services/VideoService'
import { getYouTubeId, toWatchUrl, toEmbedUrl } from '../utils/youtube'
import { PlaybackRepository } from '../repositories/PlaybackRepository'
import { cacheService } from '../services/CacheService';
import { RoomService } from '../services/RoomService'
import { supabase } from '../lib/supabaseClient'

/**
 * Hook de gestion de la playlist et de la lecture vidéo d'une salle
 */

export function usePlaylistForRoom({ room, roomId, accessGranted, canControlVideo }) {
  const stableRoomId = room?.id || roomId
  const [playlistId, setPlaylistId] = useState(null)
  const [embedUrl, setEmbedUrl] = useState(null)
  const [currentVideoId, setCurrentVideoId] = useState(null)
  const [playlistItems, setPlaylistItems] = useState([])
  const retryCountRef = useRef(new Map())

  useEffect(() => {
    if (!stableRoomId || !accessGranted) return

    const loadData = async () => {
      const cacheKey = `playlist_room_${stableRoomId}`

      try {
        const cached = cacheService.getMemory(cacheKey)
        if (cached && Date.now() - cached.timestamp < 30000) {
          console.log(`[usePlaylistForRoom] Cache hit for room ${stableRoomId}`)
          setPlaylistId(cached.playlistId)
          setPlaylistItems(cached.videos)

          if (cached.currentVideoId) {
            setCurrentVideoId(cached.currentVideoId)
            setEmbedUrl(toEmbedUrl(cached.currentVideoId))
          }
          return
        }

        const list = await PlaylistService.listByRoom(stableRoomId)
        let pl = list[0]
        if (!pl) {
          try {
            pl = await PlaylistService.create({ roomId: stableRoomId, name: 'Default' })
          } catch (e) {
            console.warn('[usePlaylistForRoom] create playlist failed:', e?.message || e)
            setPlaylistId(null)
            setPlaylistItems([])
            return
          }
        }
        setPlaylistId(pl?.id || null)

        try {
          const { videos } = await PlaylistService.loadItems(pl.id)
          setPlaylistItems(videos)
        } catch (e) {
          console.warn('[usePlaylistForRoom] loadItems failed:', e?.message || e)
          setPlaylistItems([])
        }

        const playback = await PlaybackRepository.getCurrentPlayback(stableRoomId)
        if (playback?.video_id) {
          const currentVideo = videos.find(v => v.id === playback.video_id)
          if (currentVideo) {
            const yid = getYouTubeId(currentVideo.url)
            if (yid) {
              setCurrentVideoId(yid)
              setEmbedUrl(toEmbedUrl(yid))

              cacheService.setMemory(cacheKey, {
                timestamp: Date.now(),
                playlistId: pl?.id,
                videos,
                currentVideoId: yid
              }, 30000)
              return
            }
          }
        }

        setEmbedUrl(null)
        setCurrentVideoId(null)

        cacheService.setMemory(cacheKey, {
          timestamp: Date.now(),
          playlistId: pl?.id,
          videos,
          currentVideoId: null
        }, 30000)
      } catch (e) {
        console.warn('[usePlaylistForRoom] init failed:', e?.message || e)
      }
    }

    loadData()
  }, [stableRoomId, accessGranted])

  // ---------------------------------------------------------
  // C'EST ICI QUE LA MAGIE OPERE (Fonction Modifiée)
  // ---------------------------------------------------------
  const addVideoByRawUrl = async (inputValue) => {
    if (!playlistId) throw new Error('No playlist')

    let yid = getYouTubeId(inputValue) // Tente d'extraire un ID si c'est un lien
    let title = 'Vidéo YouTube'

    // CAS 1 : C'est une recherche (Pas d'ID trouvé dans l'input)
    if (!yid) {
      console.log("Pas d'URL détectée, tentative de recherche pour :", inputValue);
      try {
        // On utilise l'input comme mots-clés de recherche
        const results = await VideoService.searchYoutube(inputValue);

        if (results && results.length > 0) {
          const firstHit = results[0];

          // Gestion des formats différents selon l'API (id.videoId ou id tout court)
          yid = firstHit.id?.videoId || firstHit.id;

          // Récupération du titre
          title = firstHit.snippet?.title || firstHit.title || title;
        } else {
          throw new Error('Aucun résultat trouvé pour cette recherche.');
        }
      } catch (err) {
        console.error("Erreur recherche :", err);
        throw new Error('Echec de la recherche YouTube.');
      }
    }

    // CAS 2 : C'était déjà une URL (yid existe), on récupère juste le titre
    else {
      try {
        const results = await VideoService.searchYoutube(yid);
        if (results && results.length > 0) {
          title = results[0].snippet?.title || results[0].title || title;
        }
      } catch (err) {
        console.warn("Impossible de récupérer le titre metadata", err);
      }
    }

    // Vérification finale
    if (!yid) throw new Error('Impossible de trouver une vidéo valide.');

    const watchUrl = toWatchUrl(yid)

    // Ajout à la playlist
    await PlaylistService.addVideoByUrl({
      playlistId,
      url: watchUrl,
      title: title, // On envoie le bon titre trouvé
    })

    // Recharge la playlist pour disposer des IDs internes
    try {
      const { videos } = await PlaylistService.loadItems(playlistId)
      setPlaylistItems(videos)
    } catch (e) {
      console.warn('[usePlaylistForRoom] reload playlist failed after add:', e)
    }

    // Si rien ne joue, on lance la vidéo et met à jour l'état partagé
    if (!embedUrl) {
      setCurrentVideoId(yid)
      setEmbedUrl(toEmbedUrl(yid))
      try {
        await RoomService.updatePlaybackState(roomId, {
          currentVideoId: yid,
          isPlaying: true
        })
      } catch (e) {
        console.warn('[usePlaylistForRoom] updatePlaybackState after add failed:', e)
      }
    }
  }

  const playVideoById = useCallback(async (videoId) => {
    if (!playlistId) return;

    try {
      const video = playlistItems.find(v => v.id === videoId);
      if (!video) return;

      const yid = getYouTubeId(video.url);
      if (!yid) return;

      // Réinitialiser le compteur de rétroactions lors du changement de vidéo
      retryCountRef.current.delete(yid);

      setCurrentVideoId(yid);
      setEmbedUrl(toEmbedUrl(yid));

      // Save to playback state
      await PlaybackRepository.setCurrentPlayback(roomId, playlistId, videoId);
      if (canControlVideo) {
        try {
          await RoomService.updatePlaybackState(roomId, {
            currentVideoId: yid,
            isPlaying: true
          });
        } catch (e) {
          console.warn('[usePlaylistForRoom] updatePlaybackState failed:', e);
        }
      }
      if (canControlVideo) {
        try {
          const { data } = await supabase.auth.getUser()
          await RoomService.addVideoHistory({
            roomId,
            youtubeId: yid,
            videoUrl: video.url,
            videoTitle: video.title,
            userId: data?.user?.id || null
          })
        } catch (e) {
          console.warn('[usePlaylistForRoom] addVideoHistory failed:', e)
        }
      }
    } catch (error) {
      console.error('Failed to play video:', error);
    }
  }, [playlistId, playlistItems, roomId, canControlVideo])

  const getNextVideo = useCallback((targetVideoId) => {
    const activeId = targetVideoId || currentVideoId
    if (!playlistItems.length) return null
    const currentIndex = playlistItems.findIndex(v => getYouTubeId(v.url) === activeId)
    const nextIndex = (currentIndex + 1) % playlistItems.length
    return playlistItems[nextIndex]
  }, [playlistItems, currentVideoId])

  const getPrevVideo = (targetVideoId = currentVideoId) => {
    if (!playlistItems.length) return null
    const currentIndex = playlistItems.findIndex(v => getYouTubeId(v.url) === targetVideoId)
    const prevIndex = (currentIndex - 1 + playlistItems.length) % playlistItems.length
    return playlistItems[prevIndex]
  }

  const playNextVideo = useCallback(async (targetVideoId) => {
    const nextVideo = getNextVideo(targetVideoId)
    if (nextVideo) {
      await playVideoById(nextVideo.id)
    }
  }, [getNextVideo, playVideoById])

  const playPrevVideo = async () => {
    const prevVideo = getPrevVideo()
    if (prevVideo) {
      await playVideoById(prevVideo.id)
    }
  }

  const handleVideoError = useCallback((errorInfo) => {
    if (!errorInfo.videoId) return;

    const { videoId, isFatal, isTransient } = errorInfo;

    // Pour les erreurs fatales, passez immédiatement à la vidéo suivante
    if (isFatal) {
      playNextVideo();
      return;
    }

    // Pour les erreurs temporaires - une tentative automatique
    if (isTransient) {
      const currentRetryCount = retryCountRef.current.get(videoId) || 0;
      if (currentRetryCount < 1) {
        retryCountRef.current.set(videoId, currentRetryCount + 1);
        // Retray automatique en 2 secondes
        setTimeout(() => {
          if (currentVideoId === videoId) {
            setEmbedUrl(toEmbedUrl(videoId));
          }
        }, 2000);
      }
    }
  }, [currentVideoId, playNextVideo]);

  // Subscribe to playback changes
  useEffect(() => {
    if (!roomId || !playlistId) return

    const unsubscribe = PlaybackRepository.onPlaybackChange(roomId, async (payload) => {
      if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
        const newVideoId = payload.new.video_id
        if (newVideoId && newVideoId !== currentVideoId) {
          const video = playlistItems.find(v => v.id === newVideoId)
          if (video) {
            const yid = getYouTubeId(video.url)
            setCurrentVideoId(yid)
            setEmbedUrl(toEmbedUrl(yid))
          }
        }
      }
    })

    return unsubscribe
  }, [roomId, playlistId, currentVideoId, playlistItems])

  const playYouTubeId = (youtubeId) => {
    setEmbedUrl(youtubeId ? toEmbedUrl(youtubeId) : null)
  }

  return {
    playlistId,
    embedUrl,
    currentVideoId,
    playlistItems,
    addVideoByRawUrl,
    playYouTubeId,
    setEmbedUrl,
    playVideoById,
    playNextVideo,
    playPrevVideo,
    getNextVideo,
    getPrevVideo,
    handleVideoError
  }
}