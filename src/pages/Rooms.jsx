// src/pages/Rooms.jsx
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RoomService } from '../services/RoomService'
import { PlaylistRepository } from '../repositories/PlaylistRepository'
import { VideoRepository } from '../repositories/VideoRepository'
import { Link as RouterLink, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/auth'
import { RealtimeService } from '../services/RealtimeService'
import ChatBox from '../components/ChatBox'
import { UserRepository } from "../repositories/UserRepository";

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'

import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew'
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos'
import SearchIcon from '@mui/icons-material/Search'

// --- YOUTUBE HELPERS ---
function extractYoutubeId(url) {
  if (!url) return null
  const match = url.match(/v=([a-zA-Z0-9_-]+)/)
  return match ? match[1] : null
}

function buildEmbedUrl(url) {
  const id = extractYoutubeId(url)
  return id ? `https://www.youtube.com/embed/${id}` : null
}

export default function Rooms() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')

  const [rooms, setRooms] = useState([])
  const [playlistMap, setPlaylistMap] = useState({})
  const [videosMap, setVideosMap] = useState({})
  const [carouselIndex, setCarouselIndex] = useState(0)

  const [toDelete, setToDelete] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [onlineCounts, setOnlineCounts] = useState({});

  const load = async () => {
    try {
      if (!user) {
        const pub = await RoomService.listPublic()
        setRooms(pub)
      } else {
        const pub = await RoomService.listPublic()
        setRooms(pub)
      }
    } catch (e) {
      console.error('[Rooms.load]', e)
      setRooms([])
    }
  }

  useEffect(() => { load() }, [user])
  // eslint-disable-next-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!rooms || rooms.length === 0 || !user) return;

    let unsubList = [];

    async function setupPresence() {
      const profile = await UserRepository.getById(user.id);

      rooms.forEach((r) => {
        RealtimeService.joinPresence(r.id, {
          user_id: user.id,
          username: profile.username,
          avatar_url: profile.avatar_url
        });

        const unsub = RealtimeService.subscribePresence(r.id, ({ count }) => {
          setOnlineCounts(prev => ({ ...prev, [r.id]: count }));
        });

        unsubList.push(() => {
          RealtimeService.leavePresence(r.id);
          unsub();
        });
      });
    }

    setupPresence();

    return () => {
      unsubList.forEach(fn => fn());
    };
  }, [rooms, user]);

  useEffect(() => {
    const unsubs = [
      RealtimeService.onInsert({ table: 'rooms', cb: load }),
      RealtimeService.onUpdate({ table: 'rooms', cb: load }),
      RealtimeService.onDelete({ table: 'rooms', cb: load }),
    ]
    return () => unsubs.forEach(off => off?.())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // LOAD PLAYLISTS + VIDEOS
  useEffect(() => {
    async function loadAll() {
      if (rooms.length === 0) return

      const newPlaylistMap = {}
      const allVideoIds = []

      for (const r of rooms) {
        const pls = await PlaylistRepository.getByRoom(r.id)
        if (pls.length > 0) {
          newPlaylistMap[r.id] = pls[0]
          allVideoIds.push(...pls[0].videoIds)
        }
      }

      setPlaylistMap(newPlaylistMap)

      const unique = [...new Set(allVideoIds)]
      const vmap = {}

      for (const vid of unique) {
        try {
          const v = await VideoRepository.getById(vid)
          vmap[vid] = v.url
        } catch (e) {
          console.error('[Rooms] failed to load video', vid, e)
        }
      }

      setVideosMap(vmap)
    }

    loadAll()
  }, [rooms])

  // CAROUSEL
  const filteredRooms = rooms.filter(room => 
    searchQuery ? room.name.toLowerCase().includes(searchQuery.toLowerCase()) : true
  )
  
  const nextRoom = () => setCarouselIndex(i => (i + 1) % filteredRooms.length)
  const prevRoom = () => setCarouselIndex(i => (i - 1 + filteredRooms.length) % filteredRooms.length)
  
  const featured = filteredRooms[carouselIndex] || null

  // DELETE
  const confirmDelete = room => { setToDelete(room); setErr('') }
  const cancelDelete = () => { setToDelete(null); setErr('') }

  const doDelete = async () => {
    setBusy(true)
    try {
      await RoomService.remove(toDelete.id)
      setToDelete(null)
      await load()
    } catch (e) {
      setErr(e?.message || t('rooms.errors.deleteFailed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Box className="fullbleed"
      sx={{
        py: 6,
        maxWidth: 1400,
        mx: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 5
      }}>

      {/* HEADER */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 900, color: 'rgba(150,70,255,0.45)' }}>
          {user ? t('rooms.titleMy') : t('rooms.titlePublic')}
        </Typography>

        {user && (
          <Button component={RouterLink} to="/rooms/new" variant="contained"
            sx={{
              background: 'linear-gradient(90deg,#9147ff,#b07bff)',
              borderRadius: 2, px: 2.5, py: 1, fontWeight: 700
            }}>
            + {t('rooms.newRoom')}
          </Button>
        )}
      </Box>

      {/* SEARCH FIELD */}
      <Box sx={{ maxWidth: 400, mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Rechercher des salons..."
          value={searchQuery}
          onChange={(e) => {
            const value = e.target.value
            setSearchQuery(value)
            if (value.trim()) {
              searchParams.set('q', value)
            } else {
              searchParams.delete('q')
            }
            setSearchParams(searchParams)
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* CAROUSEL*/}
      {featured && (
        <Box
          sx={{
            position: "relative",
            backgroundColor: "#1b122b",
            borderRadius: "16px",
            overflow: "hidden",
            border: "1px solid rgba(180,140,255,0.3)",
            boxShadow: "0 8px 30px rgba(80,20,150,0.45)",
            display: "flex",
            height: 350,
          }}
        >
          {/* SI ROOM PRIVÉE */}
          {featured.hasPassword ? (
            <Box
              sx={{
                flex: 1,
                height: "100%",
                backgroundColor: "#12091e",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                flexDirection: "column",
                gap: 1,
                textAlign: "center",
              }}
            >
              <Typography sx={{ fontSize: 60 }}>🔒</Typography>
              <Typography sx={{ color: "#e9d8ff", fontWeight: 700, fontSize: 20 }}>
                Private room {featured.name}
              </Typography>
              <Button
                component={RouterLink}
                to={`/rooms/${featured.id}`}
                variant="contained"
                sx={{
                  background: "linear-gradient(90deg,#9147ff,#b07bff)",
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: 12,
                  px: 2,
                  py: 0.8,
                  borderRadius: "8px",
                  whiteSpace: "nowrap",
                }}
              >
                Open
              </Button>
            </Box>
          ) : (
            <>
              {/* ROOM PUBLIQUE = VIDEO + CHAT */}

              {/* GAUCHE : VIDEO */}
              <Box sx={{ flex: 2, height: "100%", overflow: "hidden" }}>
                {(() => {
                  const pl = playlistMap[featured.id];
                  const first = pl?.videoIds?.[0];
                  const url = videosMap[first];
                  const embed = buildEmbedUrl(url);

                  return embed ? (
                    <iframe
                      width="100%"
                      height="100%"
                      src={embed}
                      frameBorder="0"
                      allowFullScreen
                    />
                  ) : (
                    <Box sx={{ width: "100%", height: "100%", bgcolor: "black" }} />
                  );
                })()}
              </Box>

              {/* DROITE : VRAI CHAT */}
              <Box
                sx={{
                  flex: 1,
                  backgroundColor: "rgba(0,0,0,0.25)",
                  borderLeft: "1px solid rgba(255,255,255,0.1)",
                  display: "flex",
                  flexDirection: "column",
                  color: "white",
                }}
              >
                {/* Header chat */}
                <Box
                  sx={{
                    p: 1.5,
                    borderBottom: "1px solid rgba(255,255,255,0.15)",
                    fontWeight: 700,
                    color: "#e7d5ff",
                  }}
                >
                  {featured.name} Chat
                </Box>

                {/* ChatBox */}
                <Box
                  sx={{
                    flex: 1,
                    minHeight: 0,
                    overflow: "hidden",
                  }}
                >
                  <ChatBox roomId={featured.id} isBanned={false} />
                </Box>

                {/* Footer chat */}
                <Box
                  sx={{
                    borderTop: "1px solid rgba(255,255,255,0.15)",
                    p: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1.5,
                  }}
                >
                  {/* INFOS ROOM */}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {/* PUBLIC / PRIVATE */}
                    <Typography
                      sx={{
                        fontSize: 12,
                        color: featured.hasPassword ? "#ff7fa6" : "#9dffc9",
                        fontWeight: 600,
                      }}
                    >
                      {featured.hasPassword ? "Private" : "Public"}
                    </Typography>

                    {/* BADGE LIVE COMPACT */}
                    <Box
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 0.5,
                        background: "rgba(255,70,70,0.18)",
                        px: 1,
                        py: 0.2,
                        borderRadius: "6px",
                        border: "1px solid rgba(255,70,70,0.35)",
                        width: "fit-content",
                      }}
                    >
                      <span style={{ fontSize: 12, color: "#ff6b6b", fontWeight: 700 }}>
                        🔴 LIVE
                      </span>

                      <span
                        style={{
                          color: "#ff6b6b",
                          fontWeight: 700,
                          fontSize: 13,
                        }}
                      >
                        {onlineCounts[featured.id] || 0}
                      </span>
                    </Box>
                  </Box>

                  {/* BOUTON OUVRIR */}
                  <Button
                    component={RouterLink}
                    to={`/rooms/${featured.id}`}
                    variant="contained"
                    sx={{
                      background: "linear-gradient(90deg,#9147ff,#b07bff)",
                      textTransform: "none",
                      fontWeight: 700,
                      fontSize: 12,
                      px: 2,
                      py: 0.8,
                      borderRadius: "8px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Open
                  </Button>
                </Box>
              </Box>
            </>
          )}

          {/* FLECHES */}
          <IconButton
            onClick={prevRoom}
            sx={{ position: "absolute", top: "50%", left: 10 }}
          >
            <ArrowBackIosNewIcon sx={{ color: "white" }} />
          </IconButton>

          <IconButton
            onClick={nextRoom}
            sx={{ position: "absolute", top: "50%", right: 10 }}
          >
            <ArrowForwardIosIcon sx={{ color: "white" }} />
          </IconButton>
        </Box>
      )
      }


      {/* GRID */}
      <Box sx={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(320px,1fr))",
        gap: 3
      }}>
        {filteredRooms.length === 0 && rooms.length > 0 ? (
          <Box sx={{ textAlign: 'center', py: 4, gridColumn: '1 / -1' }}>
            <Typography variant="h6" sx={{ opacity: 0.8, mb: 1 }}>
              Aucun résultat pour « {searchQuery} »
            </Typography>
            <Button onClick={() => { 
              setSearchQuery(''); 
              searchParams.delete('q'); 
              setSearchParams(searchParams); 
            }}>
              Effacer la recherche
            </Button>
          </Box>
        ) : filteredRooms.length === 0 && rooms.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4, gridColumn: '1 / -1' }}>
            <Typography variant="h6" sx={{ opacity: 0.8 }}>
              {user ? t('rooms.emptyMy') : t('rooms.emptyPublic')}
            </Typography>
          </Box>
        ) : (
          filteredRooms.map(r => {
          const pl = playlistMap[r.id];
          const first = pl?.videoIds?.[0];
          const url = videosMap[first];
          const embed = buildEmbedUrl(url);

          return (
            <Box
              key={r.id}
              component={RouterLink}
              to={`/rooms/${r.id}`}
              sx={{
                backgroundColor: "#1a1027",
                borderRadius: "12px",
                overflow: "hidden",
                border: "1px solid rgba(160,120,255,0.25)",
                transition: ".2s",
                textDecoration: "none",
                color: "inherit",
                "&:hover": {
                  transform: "translateY(-5px)",
                  boxShadow: "0 12px 26px rgba(140,80,255,0.4)",
                },
              }}
            >

              {/* SI ROOM PRIVÉE */}
              {r.hasPassword ? (
                <Box
                  sx={{
                    width: "100%",
                    height: 180,
                    backgroundColor: "#12091e",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    flexDirection: "column",
                    gap: 1,
                    textAlign: "center",
                  }}
                >
                  <Typography sx={{ fontSize: 40 }}>🔒</Typography>
                  <Typography
                    sx={{
                      color: "#e9d8ff",
                      fontWeight: 700,
                      fontSize: 18,
                    }}
                  >
                    Private room
                  </Typography>
                </Box>
              ) : (
                /* ROOM PUBLIQUE = VIDEO */
                <Box sx={{ width: "100%", height: 180, overflow: "hidden" }}>
                  {embed ? (
                    <iframe
                      width="100%"
                      height="100%"
                      src={embed}
                      frameBorder="0"
                      allowFullScreen
                    />
                  ) : (
                    <Box sx={{ width: "100%", height: "100%", bgcolor: "black" }} />
                  )}
                </Box>
              )}

              {/* INFOS, INCHANGÉES */}
              <Box sx={{ p: 2, display: "flex", gap: 1.5, alignItems: "center" }}>
                {/* AVATAR */}
                <Box
                  component="img"
                  src={r.ownerAvatar || "/default-avatar.png"}
                  sx={{
                    width: 45,
                    height: 45,
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: "2px solid rgba(180,140,255,0.4)",
                    boxShadow: "0 0 8px rgba(150,70,255,0.35)",
                  }}
                />

                {/* INFOS */}
                <Box sx={{ flexGrow: 1 }}>
                  {/* NOM DE LA ROOM */}
                  <Typography
                    variant="subtitle1"
                    sx={{
                      fontWeight: 800,
                      color: "#e7d5ff",
                      letterSpacing: "0.5px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {r.name}
                  </Typography>

                  {/* OWNER */}
                  <Typography variant="body2" sx={{ color: "#bca4ff", fontSize: 13 }}>
                    {r.ownerName || "Creator unknown"}
                  </Typography>

                  {/* STATUT + BADGES */}
                  <Box sx={{ display: "flex", alignItems: "center", mt: 0.5, gap: 1 }}>
                    {/* Public / Private */}
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        color: r.hasPassword ? "#ff7fa6" : "#9dffc9",
                        fontSize: 12,
                      }}
                    >
                      {r.hasPassword ? "Private" : "Public"}
                    </Typography>

                    {/* BADGE LIVE */}
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "",
                        gap: 0.3,
                        background: "rgba(255,70,70,0.18)",
                        px: 1,
                        py: 0.3,
                        borderRadius: "6px",
                        border: "1px solid rgba(255,70,70,0.35)",
                      }}
                    >
                      <span style={{ fontSize: 12, color: "#ff6b6b", fontWeight: 700 }}>
                        🔴 LIVE
                      </span>

                      {/* COMPTEUR ONLINE */}
                      <span
                        style={{
                          color: "#ff6b6b",
                          fontWeight: 700,
                          fontSize: 13,
                        }}
                      >
                        {onlineCounts[r.id] || 0}
                      </span>
                    </Box>
                  </Box>
                </Box>

                {user && user.id === r.ownerId && (
                  <IconButton
                    onClick={(e) => { e.preventDefault(); confirmDelete(r); }}
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "0.25s",
                      "&:hover": {
                        background: "rgba(255, 107, 138, 0.28)",
                        transform: "scale(1.07)",
                        boxShadow: "0 0 12px rgba(255, 107, 138, 0.28)",
                      },
                    }}
                  >
                    ✖
                  </IconButton>
                )}
              </Box>

            </Box>
          )
          })
        )}
      </Box>

      {/* DELETE dialog */}
      <Dialog open={!!toDelete} onClose={cancelDelete}>
        <DialogTitle>{t('rooms.dialog.deleteTitle')}</DialogTitle>
        <DialogContent>
          <Typography>
            {t('rooms.dialog.deleteBody', { name: toDelete?.name })}
          </Typography>
          {err && <Typography color="error">{err}</Typography>}
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDelete}>{t('rooms.dialog.cancel')}</Button>
          <Button color="error" variant="contained" onClick={doDelete}>
            {busy ? t('rooms.dialog.deleting') : t('rooms.dialog.delete')}
          </Button>
        </DialogActions>
      </Dialog>

    </Box >
  )
}
