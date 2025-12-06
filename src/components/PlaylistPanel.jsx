// src/components/PlaylistPanel.jsx
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import ListItemSecondaryAction from '@mui/material/ListItemSecondaryAction'
import DeleteIcon from '@mui/icons-material/Delete'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd'
import Card from '../ui/Card'
import { PlaylistService } from '../services/PlaylistService'
import { getYouTubeId } from '../utils/youtube'
import { VideoService } from '../services/VideoService'
import PlaylistDnD from './PlaylistDnD';

export default function PlaylistPanel({ playlistId, onAdd, onPlay, canEdit, currentVideoId, onVideoSelect }) {
  const { t } = useTranslation()
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [items, setItems] = useState([])

  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])

  const load = async () => {
    if (!playlistId) return
    try {
      const { videos } = await PlaylistService.loadItems(playlistId)
      setItems(videos)
    } catch (e) {
      console.warn('[PlaylistPanel] load failed:', e?.message || e)
    }
  }

  useEffect(() => {
    load()
  }, [playlistId])

  const runSearch = async (e) => {
    e.preventDefault()
    setMsg('')
    const q = search.trim()
    if (!q || busy) return
    setBusy(true)
    try {
      console.log('[PlaylistPanel] Starting YouTube search for:', q)
      const results = await VideoService.searchYoutube(q)
      console.log('[PlaylistPanel] Search completed, results:', results.length)
      setSearchResults(results || [])
      
      if (results.length === 0) {
        setMsg('No videos found. Try different keywords.')
      }
    } catch (e2) {
      console.error('[PlaylistPanel] Search error:', e2)
      setMsg(e2?.message || 'Search failed. Please try again.')
      setSearchResults([])
    } finally {
      setBusy(false)
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    setMsg('')
    
    // VÉRIFICATION ACL
    if (!canEdit) {
        setMsg(t('playlist.permissionDenied'));
        return;
    }

    const u = url.trim()
    if (!u || busy) return
    setBusy(true)
    try {
      await onAdd?.(u)
      setUrl('')
      await load()
    } catch (e) {
      setMsg(e?.message || t('playlist.failedAdd'))
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async (videoId) => {
// VÉRIFICATION ACL
    if (!canEdit) {
        setMsg(t('playlist.permissionDenied'));
        return;
    }

    if (!playlistId) return
    setBusy(true)
    setMsg('')
    try {
      const video = items.find((v) => v.id === videoId)
      await PlaylistService.removeVideo({ playlistId, videoId })
      await load()

      const id = getYouTubeId(video?.url)
      if (id) onPlay?.(null)
    } catch (e) {
      setMsg(e?.message || t('playlist.failedRemove'))
    } finally {
      setBusy(false)
    }
  }

  const handleReorder = async (sourceIndex, destinationIndex) => {
    if (!playlistId || !canEdit) return;
    
    setBusy(true);
    setMsg('');
    
    try {
      // Mise à jour de l'interface utilisateur optimiste
      const newItems = [...items];
      const [movedItem] = newItems.splice(sourceIndex, 1);
      newItems.splice(destinationIndex, 0, movedItem);
      setItems(newItems);

      // Garder le nouvel ordre
      await PlaylistService.updateOrder({
        playlistId,
        videoIds: newItems.map(item => item.id)
      });
      
    } catch (error) {
      setMsg(error?.message || t('playlist.reorderFailed'));
      // Annuler les modifications en cas d'erreur
      await load();
    } finally {
      setBusy(false);
    }
  };

  const extractYoutubeId = (item) => item.videoId || item.id?.videoId || item.id

  const handleAddResult = async (item) => {
    if (!canEdit) {
      setMsg(t('playlist.permissionDenied'));
      return;
    }

    if (!playlistId) return;
    setBusy(true);
    setMsg('');
    try {
      const youtubeId = item.id?.videoId || item.videoId || item.id;
      if (!youtubeId) {
        throw new Error('Invalid YouTube search result');
      }
      
      const watchUrl = `https://www.youtube.com/watch?v=${youtubeId}`;
      const title = item.snippet?.title || item.title || 'YouTube video';
      await onAdd?.(watchUrl, title);
      await load();
    } catch (e) {
      setMsg(e?.message || t('playlist.failedAdd'));
    } finally {
      setBusy(false);
    }
  };

  const handlePlayResult = (item) => {
    const youtubeId = extractYoutubeId(item);
    
    if (youtubeId) {
      const watchUrl = `https://www.youtube.com/watch?v=${youtubeId}`;
      
      if (onVideoSelect) {
        onVideoSelect(watchUrl);
      }
    }
  };

  const handlePlay = (videoUrl) => {
    const id = getYouTubeId(videoUrl)
    if (id) onPlay?.(id)
  }

  return (
    <Card sx={{ p: 2 }}>
      <Stack spacing={2} component="form" onSubmit={submit}>
        <Stack spacing={1}>
          <Stack direction="row" spacing={1}>
            <TextField
              label="Search on YouTube"
              placeholder="lofi, trailer, tutorial..."
              variant="outlined"
              size="small"
              fullWidth
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button
              variant="outlined"
              onClick={runSearch}
              disabled={busy || !playlistId || !canEdit}
            >
              Search
            </Button>
          </Stack>

          {searchResults.length > 0 && (
            <List
              dense
              sx={{
                maxHeight: 260,
                overflowY: 'auto',
                borderRadius: 1,
                border: '1px solid rgba(255,255,255,0.08)',
                mt: 1,
              }}
            >
              {searchResults.map((item) => {
                const youtubeId = item.id?.videoId || item.videoId || item.id;
                const title = item.snippet?.title || item.title || 'YouTube video';
                const channelTitle = item.snippet?.channelTitle || '';
                const thumbnail = 
                  item.snippet?.thumbnails?.high?.url ||
                  item.snippet?.thumbnails?.medium?.url ||
                  item.snippet?.thumbnails?.default?.url ||
                  (youtubeId ? `https://i.ytimg.com/vi/${youtubeId}/mqdefault.jpg` : null);

                return (
                  <ListItem
                    key={youtubeId}
                    divider
                    sx={{
                      alignItems: 'flex-start',
                      py: 1,
                    }}
                  >
                    <Stack direction="row" spacing={1.5} sx={{ width: '100%' }}>
                      {thumbnail ? (
                        <Box
                          component="img"
                          src={thumbnail}
                          alt={title}
                          sx={{
                            width: 120,
                            height: 68,
                            borderRadius: 1,
                            objectFit: 'cover',
                            flexShrink: 0,
                          }}
                          onError={(e) => {
                            if (youtubeId) {
                              e.target.src = `https://i.ytimg.com/vi/${youtubeId}/mqdefault.jpg`;
                            } else {
                              e.target.style.display = 'none';
                            }
                          }}
                        />
                      ) : (
                        <Box
                          sx={{
                            width: 120,
                            height: 68,
                            borderRadius: 1,
                            bgcolor: 'rgba(255,255,255,0.08)',
                            display: 'grid',
                            placeItems: 'center',
                            flexShrink: 0,
                            fontSize: 12,
                            textTransform: 'uppercase',
                            letterSpacing: 0.5,
                            opacity: 0.7,
                          }}
                        >
                          {t('playlist.noPreview')}
                        </Box>
                      )}

                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 600, lineHeight: 1.4 }}
                        >
                          {title}
                        </Typography>
                        {channelTitle ? (
                          <Typography variant="caption" sx={{ opacity: 0.7 }}>
                            {channelTitle}
                          </Typography>
                        ) : null}
                      </Box>

                      <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
                        <IconButton
                          size="small"
                          aria-label={t('playlist.play')}
                          onClick={() => handlePlayResult(item)}
                        >
                          <PlayArrowIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          aria-label={t('playlist.add')}
                          onClick={() => handleAddResult(item)}
                          disabled={busy || !playlistId}
                        >
                          <PlaylistAddIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </Stack>
                  </ListItem>
                );
              })}
            </List>
          )}
        </Stack>

        <Stack direction="row" spacing={1}>
          <TextField
            label={t('playlist.urlLabel')}
            placeholder={t('playlist.urlPlaceholder')}
            variant="outlined"
            size="small"
            fullWidth
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={busy || !playlistId || !canEdit} // AJOUT DE !canEdit
          >
            {busy ? t('playlist.adding') : t('playlist.add')}
          </Button>
        </Stack>

        {msg ? (
          <Typography color="error" sx={{ opacity: 0.9 }}>
            {msg}
          </Typography>
        ) : null}

        {!playlistId ? (
          <Typography sx={{ opacity: 0.8 }}>
            {t('playlist.noPlaylist')}
          </Typography>
        ) : (
          <PlaylistDnD
            items={items}
            onDelete={handleDelete}
            onPlay={onVideoSelect || handlePlay}
            onReorder={handleReorder}
            busy={busy}
            canEdit={canEdit}
            currentVideoId={currentVideoId}
          />
        )}
      </Stack>
    </Card>
  )
}
