// src/pages/PrivacyModal.jsx
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import { useTranslation } from 'react-i18next'

export default function PrivacyModal({ open, onClose }) {
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
            <DialogTitle>{t('privacy_modal.title')}</DialogTitle>

            <DialogContent dividers sx={{ fontSize: "0.95rem" }}>
                <p><strong>{t('privacy_modal.section_1_title')}</strong></p>
                <p>{t('privacy_modal.section_1_text')}</p>

                <p><strong>{t('privacy_modal.section_2_title')}</strong></p>
                <p>{t('privacy_modal.section_2_text')}</p>

                <p><strong>{t('privacy_modal.section_3_title')}</strong></p>
                <p>{t('privacy_modal.section_3_text')}</p>

                <p><strong>{t('privacy_modal.section_4_title')}</strong></p>
                <p>{t('privacy_modal.section_4_text')}</p>

                <p><strong>{t('privacy_modal.section_5_title')}</strong></p>
                <p>{t('privacy_modal.section_5_text')}</p>

                <p><strong>{t('privacy_modal.section_6_title')}</strong></p>
                <p>{t('privacy_modal.section_6_text')}</p>
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose} variant="contained">
                    {t('privacy_modal.close_button')}
                </Button>
            </DialogActions>
        </Dialog>
    )
}
