// src/pages/LegalModal.jsx
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'

export default function LegalModal({ open, onClose }) {
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
            <DialogTitle>Legal Notice</DialogTitle>

            <DialogContent dividers sx={{ fontSize: "0.95rem" }}>
                <p><strong>Website name:</strong> WatchWithMe</p>
                <p><strong>Project type:</strong> Academic, non-commercial project developed for the AMS course at the University of Avignon.</p>

                <p><strong>Project team:</strong></p>
                <ul>
                    <li>Deniz Ertekin</li>
                    <li>Maïssara Berrabah</li>
                    <li>Claude Pellissier</li>
                    <li>Alexandre Pontal</li>
                </ul>

                <p><strong>Supervisors:</strong>
                    Mr. Ludovic Bonnefoy &amp; Mr. Rémy Kessler
                </p>

                <p><strong>Hosting:</strong></p>
                <p>Backend and database: Supabase (PostgreSQL, Auth, Realtime)<br />
                    Frontend hosting: Vercel / Netlify (student deployment)</p>

                <p><strong>Contact:</strong> contact@watchwithme.com</p>

                <p>
                    WatchWithMe is an educational prototype.
                    It is not intended for commercial use and no data is monetized.
                </p>
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose} variant="contained">Close</Button>
            </DialogActions>
        </Dialog>
    )
}
