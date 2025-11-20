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

    // Si rien ne joue, on lance la vidéo
    if (!embedUrl) {
      setEmbedUrl(toEmbedUrl(yid))
    }
  }

  const playYouTubeId = (youtubeId) => {
    setEmbedUrl(youtubeId ? toEmbedUrl(youtubeId) : null)
  }

  return { playlistId, embedUrl, addVideoByRawUrl, playYouTubeId, setEmbedUrl }
}