import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { RoomService } from "../services/RoomService"
import { useAuth } from "../context/auth"

import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import Button from "@mui/material/Button"
import TextField from "@mui/material/TextField"
import InputAdornment from "@mui/material/InputAdornment"
import IconButton from '@mui/material/IconButton'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'

import SearchIcon from "@mui/icons-material/Search"

export default function Regies() {

    const navigate = useNavigate()
    const { user } = useAuth()

    const [regies, setRegies] = useState([])
    const [searchQuery, setSearchQuery] = useState("")

    const [showArchived, setShowArchived] = useState(false)
    const [toDelete, setToDelete] = useState(null)
    const [toArchive, setToArchive] = useState(null)
    const [toRestore, setToRestore] = useState(null)
    const [busy, setBusy] = useState(false)
    const [err, setErr] = useState('')

    const load = async () => {
        try {
            if (showArchived) {
                const archivedRooms = await RoomService.listArchived()
                const archivedRegies = archivedRooms.filter(r => r.is_regie === true)
                setRegies(archivedRegies)
            } else {
                const activeRegies = await RoomService.listRegies()
                setRegies(activeRegies)
            }
        } catch (e) {
            console.error("Erreur chargement régies", e)
            setRegies([])
        }
    }

    useEffect(() => {
        load()
    }, [showArchived])

    const filtered = regies.filter(r =>
        searchQuery
            ? r.name.toLowerCase().includes(searchQuery.toLowerCase())
            : true
    )

    const confirmDelete = (r) => { setToDelete(r); setErr('') }
    const cancelDelete = () => { setToDelete(null); setErr('') }
    const doDelete = async () => {
        setBusy(true)
        try {
            await RoomService.remove(toDelete.id)
            setToDelete(null)
            await load()
        } catch (e) {
            setErr(e?.message || "Erreur lors de la suppression")
        } finally {
            setBusy(false)
        }
    }

    const confirmArchive = (r) => { setToArchive(r); setErr('') }
    const cancelArchive = () => { setToArchive(null); setErr('') }
    const doArchive = async () => {
        setBusy(true)
        try {
            await RoomService.archive(toArchive.id)
            setToArchive(null)
            await load()
        } catch (e) {
            setErr(e?.message || "Erreur lors de l'archivage")
        } finally {
            setBusy(false)
        }
    }

    const confirmRestore = (r) => { setToRestore(r); setErr('') }
    const cancelRestore = () => { setToRestore(null); setErr('') }
    const doRestore = async () => {
        setBusy(true)
        try {
            await RoomService.unarchive(toRestore.id)
            setToRestore(null)
            await load()
        } catch (e) {
            setErr(e?.message || "Erreur lors de la restauration")
        } finally {
            setBusy(false)
        }
    }


    return (
        <Box
            sx={{
                py: 6,
                maxWidth: 1400,
                mx: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 5
            }}
        >
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>

                <Typography
                    variant="h4"
                    sx={{ fontWeight: 900, color: "rgba(150,70,255,0.45)" }}
                >
                    Régies {showArchived ? "(Archivées)" : ""}
                </Typography>

                {user && (
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <Button
                            variant="outlined"
                            onClick={() => setShowArchived(!showArchived)}
                            sx={{ borderRadius: 2 }}
                        >
                            {showArchived ? "Voir les régies actives" : "Voir les archives"}
                        </Button>

                        <Button
                            variant="contained"
                            onClick={() => navigate("/regie/create")}
                            sx={{
                                background: "linear-gradient(90deg,#9147ff,#b07bff)",
                                borderRadius: 2,
                                fontWeight: 700
                            }}
                        >
                            + Nouvelle régie
                        </Button>
                    </Box>
                )}

            </Box>

            <Box sx={{ maxWidth: 400 }}>
                <TextField
                    fullWidth
                    placeholder="Rechercher une régie"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon />
                            </InputAdornment>
                        )
                    }}
                />
            </Box>

            {/* GRID */}
            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(320px,1fr))",
                    gap: 3
                }}
            >
                {filtered.map((r) => (
                    <Box
                        key={r.id}
                        onClick={async () => {
                            const isManager = await RoomService.isManager(r.id)
                            if (isManager) {
                                navigate(`/regie/${r.id}/director`)
                            } else {
                                navigate(`/regie/${r.id}/viewer`)
                            }
                        }}
                        sx={{
                            backgroundColor: "#1a1027",
                            borderRadius: "12px",
                            border: "1px solid rgba(160,120,255,0.25)",
                            p: 3,
                            cursor: "pointer",
                            transition: ".2s",
                            position: "relative", 
                            "&:hover": {
                                transform: "translateY(-5px)",
                                boxShadow: "0 12px 26px rgba(140,80,255,0.4)"
                            }
                        }}
                    >
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <Box>
                                <Typography variant="h6" sx={{ fontWeight: 800, color: "#e7d5ff" }}>
                                    {r.name}
                                </Typography>
                                <Typography variant="body2" sx={{ color: "#bca4ff", mt: 1 }}>
                                    Cliquez pour ouvrir la régie
                                </Typography>
                            </Box>

                            {user && user.id === r.ownerId && (
                                <Box sx={{ display: 'flex', gap: 0.5 }}>
                                    {showArchived ? (
                                        <IconButton
                                            onClick={(e) => { e.stopPropagation(); confirmRestore(r); }}
                                            sx={{
                                                width: 32, height: 32, borderRadius: "8px",
                                                "&:hover": { background: "rgba(120, 255, 170, 0.18)" }
                                            }}
                                        >
                                            ♻️
                                        </IconButton>
                                    ) : (
                                        <IconButton
                                            onClick={(e) => { e.stopPropagation(); confirmArchive(r); }}
                                            sx={{
                                                width: 32, height: 32, borderRadius: "8px",
                                                "&:hover": { background: "rgba(155, 92, 255, 0.22)" }
                                            }}
                                        >
                                            🗄️
                                        </IconButton>
                                    )}

                                    <IconButton
                                        onClick={(e) => { e.stopPropagation(); confirmDelete(r); }}
                                        sx={{
                                            width: 32, height: 32, borderRadius: "8px",
                                            "&:hover": { background: "rgba(255, 107, 138, 0.28)" }
                                        }}
                                    >
                                        ✖
                                    </IconButton>
                                </Box>
                            )}
                        </Box>
                    </Box>
                ))}
            </Box>


            <Dialog open={!!toDelete} onClose={cancelDelete}>
                <DialogTitle>Supprimer la régie</DialogTitle>
                <DialogContent>
                    <Typography>
                        Êtes-vous sûr de vouloir supprimer définitivement la régie "{toDelete?.name}" ?
                    </Typography>
                    {err && <Typography color="error">{err}</Typography>}
                </DialogContent>
                <DialogActions>
                    <Button onClick={cancelDelete}>Annuler</Button>
                    <Button color="error" variant="contained" onClick={doDelete} disabled={busy}>
                        {busy ? "Suppression..." : "Supprimer"}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={!!toArchive} onClose={cancelArchive}>
                <DialogTitle>Archiver la régie</DialogTitle>
                <DialogContent>
                    <Typography>
                        Voulez-vous archiver la régie "{toArchive?.name}" ?
                    </Typography>
                    {err && <Typography color="error">{err}</Typography>}
                </DialogContent>
                <DialogActions>
                    <Button onClick={cancelArchive} disabled={busy}>Annuler</Button>
                    <Button variant="contained" onClick={doArchive} disabled={busy}>
                        {busy ? "Archivage..." : "Archiver"}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={!!toRestore} onClose={cancelRestore}>
                <DialogTitle>Restaurer la régie</DialogTitle>
                <DialogContent>
                    <Typography>
                        Voulez-vous restaurer la régie "{toRestore?.name}" ?
                    </Typography>
                    {err && <Typography color="error">{err}</Typography>}
                </DialogContent>
                <DialogActions>
                    <Button onClick={cancelRestore} disabled={busy}>Annuler</Button>
                    <Button variant="contained" onClick={doRestore} disabled={busy}>
                        {busy ? "Restauration..." : "Restaurer"}
                    </Button>
                </DialogActions>
            </Dialog>

        </Box>
    )
}