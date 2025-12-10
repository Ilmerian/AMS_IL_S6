// src/pages/TermsModal.jsx
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'

export default function TermsModal({ open, onClose }) {
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
            <DialogTitle>Terms of Use</DialogTitle>

            <DialogContent dividers sx={{ fontSize: "0.95rem" }}>
                <p>
                    By using WatchWithMe, users agree to the following Terms of Use.
                </p>

                <p><strong>1. Account creation</strong><br />
                    Users must provide a valid email address and password.
                    Passwords are automatically hashed by Supabase.
                </p>

                <p><strong>2. Use of rooms</strong><br />
                    Users can create public or private rooms, join rooms via a link, and watch synchronized videos.
                    The room creator becomes the moderator and may manage the playlist, roles, and remove users if necessary.
                </p>

                <p><strong>3. Chat behavior</strong><br />
                    Users must remain respectful. Illegal, offensive, or discriminatory messages are not allowed.
                    Moderators may delete messages or remove users from the room.
                </p>

                <p><strong>4. Responsibilities</strong><br />
                    WatchWithMe is an experimental academic project.
                    No guarantee is provided regarding uptime or service stability.
                    Users are responsible for the YouTube links they add.
                </p>

                <p><strong>5. Suspension</strong><br />
                    Administrators or supervisors may suspend accounts or rooms in case of misuse.
                </p>
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose} variant="contained">Close</Button>
            </DialogActions>
        </Dialog>
    )
}
