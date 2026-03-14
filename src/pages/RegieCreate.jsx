import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { RoomService } from "../services/RoomService"

import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import TextField from "@mui/material/TextField"
import Button from "@mui/material/Button"
import Stack from "@mui/material/Stack"
import Container from "@mui/material/Container"
import Alert from "@mui/material/Alert"

export default function RegieCreate() {

    const navigate = useNavigate()

    const [name, setName] = useState("")
    const [loading, setLoading] = useState(false)
    const [msg, setMsg] = useState("")
    const [error, setError] = useState(false)

    const handleSubmit = async (e) => {

        e.preventDefault()

        if (!name.trim()) {
            setError(true)
            setMsg("Nom requis")
            return
        }

        setLoading(true)

        try {

            const room = await RoomService.create({
                name: name.trim(),
                password: null,
                is_regie: true
            })

            navigate(`/regie/${room.id}/director`)

        } catch (err) {

            console.error(err)
            setError(true)
            setMsg("Erreur création régie")

        } finally {
            setLoading(false)
        }
    }

    return (

        <Container maxWidth="sm" sx={{ mt: 8 }}>

            <Typography variant="h4" gutterBottom>
                Créer une régie
            </Typography>

            <Box component="form" onSubmit={handleSubmit}>

                <Stack spacing={3}>

                    <TextField
                        label="Nom de la régie"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        fullWidth
                    />

                    {msg && (
                        <Alert severity={error ? "error" : "info"}>
                            {msg}
                        </Alert>
                    )}

                    <Button
                        variant="contained"
                        type="submit"
                        disabled={loading}
                    >
                        {loading ? "Création..." : "Créer la régie"}
                    </Button>

                </Stack>

            </Box>

        </Container>
    )
}