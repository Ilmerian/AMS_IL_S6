// src/pages/LegalModal.jsx
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import { useTranslation } from 'react-i18next'

export default function LegalModal({ open, onClose }) {
    const { t } = useTranslation()

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
            <DialogTitle>{t('legal_modal.title')}</DialogTitle>

            <DialogContent dividers sx={{ fontSize: "0.95rem" }}>
                <p>
                    <strong>{t('legal_modal.website_name_label')}</strong>{' '}
                    {t('legal_modal.website_name_value')}
                </p>

                <p>
                    <strong>{t('legal_modal.project_type_label')}</strong>{' '}
                    {t('legal_modal.project_type_value')}
                </p>

                <p><strong>{t('legal_modal.project_team_label')}</strong></p>
                <ul>
                    <li>Deniz Ertekin</li>
                    <li>Maïssara Berrabah</li>
                    <li>Claude Pellissier</li>
                    <li>Alexandre Pontal</li>
                </ul>

                <p>
                    <strong>{t('legal_modal.supervisors_label')}</strong>{' '}
                    {t('legal_modal.supervisors_value')}
                </p>

                <p><strong>{t('legal_modal.hosting_label')}</strong></p>
                <p>
                    {t('legal_modal.hosting_backend_label')}{' '}
                    {t('legal_modal.hosting_backend_value')}
                    <br />
                    {t('legal_modal.hosting_frontend_label')}{' '}
                    {t('legal_modal.hosting_frontend_value')}
                </p>

                <p>
                    <strong>{t('legal_modal.contact_label')}</strong>{' '}
                    {t('legal_modal.contact_value')}
                </p>

                <p>{t('legal_modal.prototype_notice')}</p>
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose} variant="contained">
                    {t('legal_modal.close_button')}
                </Button>
            </DialogActions>
        </Dialog>
    )
}
