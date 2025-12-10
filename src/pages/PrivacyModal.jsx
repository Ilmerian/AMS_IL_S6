// src/pages/PrivacyModal.jsx
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'

export default function PrivacyModal({ open, onClose }) {
    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: {
                    backgroundColor: "#1e1e1e",
                    color: "white",
                }
            }}
            BackdropProps={{
                sx: {
                    backgroundColor: "rgba(0,0,0,0.8)"
                }
            }}
        >
            <DialogTitle>Privacy Policy</DialogTitle>

            <DialogContent dividers sx={{ fontSize: "0.95rem" }}>
                <p><strong>1. Data collected</strong></p>
                <p>
                    WatchWithMe may collect the following data:
                    email, username, avatar, chat messages, playlists, and room activity.
                </p>

                <p><strong>2. Purpose of data</strong></p>
                <p>
                    Data is used only to enable:
                    authentication, room management, chat, video synchronization,
                    and general platform functionality.
                </p>

                <p><strong>3. Storage and security</strong></p>
                <p>
                    Data is stored in Supabase (PostgreSQL).
                    Passwords are hashed and Row Level Security (RLS) rules protect sensitive data.
                    All connections use HTTPS.
                </p>

                <p><strong>4. User rights</strong></p>
                <p>
                    Users may request account deletion or modification of their personal data at any time.
                </p>

                <p><strong>5. Cookies</strong></p>
                <p>
                    The platform may use technical cookies for session handling and language settings.
                </p>

                <p><strong>6. Academic project</strong></p>
                <p>
                    This platform is a student project developed for educational purposes.
                    It is not intended for commercial use.
                </p>
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose} variant="contained">Close</Button>
            </DialogActions>
        </Dialog>
    )
}
