import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { RoomService } from "../services/RoomService"
import { useAuth } from "../context/auth"

import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import Button from "@mui/material/Button"
import TextField from "@mui/material/TextField"
import InputAdornment from "@mui/material/InputAdornment"

import SearchIcon from "@mui/icons-material/Search"

export default function Regies() {

    const navigate = useNavigate()
    const { user } = useAuth()

    const [regies, setRegies] = useState([])
    const [searchQuery, setSearchQuery] = useState("")

    const load = async () => {

        try {

            const rooms = await RoomService.listPublic()
            //
            const regies = await RoomService.listRegies()
            setRegies(regies)

        } catch (e) {

            console.error("Erreur chargement régies", e)
            setRegies([])

        }
    }

    useEffect(() => {

        load()

    }, [])

    const filtered = regies.filter(r =>
        searchQuery
            ? r.name.toLowerCase().includes(searchQuery.toLowerCase())
            : true
    )

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

            {/* HEADER */}

            <Box sx={{ display: "flex", justifyContent: "space-between" }}>

                <Typography
                    variant="h4"
                    sx={{ fontWeight: 900, color: "rgba(150,70,255,0.45)" }}
                >
                    Régies
                </Typography>

                {user && (

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

                )}

            </Box>

            {/* SEARCH */}

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
                        //
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

                            "&:hover": {
                                transform: "translateY(-5px)",
                                boxShadow: "0 12px 26px rgba(140,80,255,0.4)"
                            }
                        }}
                    >

                        <Typography
                            variant="h6"
                            sx={{
                                fontWeight: 800,
                                color: "#e7d5ff"
                            }}
                        >
                            {r.name}
                        </Typography>

                        <Typography
                            variant="body2"
                            sx={{
                                color: "#bca4ff",
                                mt: 1
                            }}
                        >
                            Cliquez pour ouvrir la régie
                        </Typography>

                    </Box>

                ))}

            </Box>

        </Box>

    )
}