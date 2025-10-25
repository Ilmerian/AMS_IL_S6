// src/hooks/usePlaylistForRoom.js
import { useEffect, useState } from 'react'
import { PlaylistService } from '../services/PlaylistService'
import { VideoService } from '../services/VideoService'
import { getYouTubeId, toWatchUrl, toEmbedUrl } from '../utils/youtube'

function extractIdFromStoredValue(val) {
  if (!val) return null
  if (/^https?:\/\//.test(String(val))) return getYouTubeId(val)
  return val
}

export function usePlaylistForRoom({ room, roomId, accessGranted }) {
  const [playlistId, setPlaylistId] = useState(null)
  const [embedUrl, setEmbedUrl] = useState(null)

  useEffect(() => {
    if (!room || !accessGranted) return
    ;(async () => {
      try {
        const list = await PlaylistService.listByRoom(roomId)
        let pl = list[0]
        if (!pl) {
          pl = await PlaylistService.create({ roomId, name: 'Default' })
        }
        setPlaylistId(pl?.id || null)

        const last = pl?.videoIds?.slice(-1)[0]
        if (last) {
          const stored = extractIdFromStoredValue(last)
          if (stored && !/^https?:\/\//.test(String(stored)) && !/^[\w-]{6,}$/.test(String(stored))) {
            const video = await VideoService.getById(stored)
            const yid = getYouTubeId(video?.url)
            if (yid) setEmbedUrl(toEmbedUrl(yid))
          } else {
            const yid = getYouTubeId(stored) || stored
            if (yid) setEmbedUrl(toEmbedUrl(yid))
          }
        } else {
          setEmbedUrl(null)
        }
      } catch (e) {
        console.warn('[usePlaylistForRoom] init failed:', e?.message || e)
      }
    })()
  }, [room, accessGranted, roomId])

  const addVideoByRawUrl = async (rawUrl) => {
    if (!playlistId) throw new Error('No playlist')
    const yid = getYouTubeId(rawUrl)
    if (!yid) throw new Error('Unsupported YouTube URL')
    const watchUrl = toWatchUrl(yid)
    await PlaylistService.addVideoByUrl({
      playlistId,
      url: watchUrl,
      title: null,
    })
    setEmbedUrl(toEmbedUrl(yid))
  }

  const playYouTubeId = (youtubeId) => {
    setEmbedUrl(youtubeId ? toEmbedUrl(youtubeId) : null)
  }

  return { playlistId, embedUrl, addVideoByRawUrl, playYouTubeId, setEmbedUrl }
}
