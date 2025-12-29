// src/pages/TermsModal.jsx
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import { useTranslation } from 'react-i18next'

export default function TermsModal({ open, onClose }) {
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
            <DialogTitle>{t('terms_modal.title')}</DialogTitle>

            <DialogContent dividers sx={{ fontSize: "0.95rem" }}>
                <p>{t('terms_modal.intro')}</p>

                <p>
                    <strong>{t('terms_modal.section_1_title')}</strong><br />
                    {t('terms_modal.section_1_text')}
                </p>

                <p>
                    <strong>{t('terms_modal.section_2_title')}</strong><br />
                    {t('terms_modal.section_2_text')}
                </p>

                <p>
                    <strong>{t('terms_modal.section_3_title')}</strong><br />
                    {t('terms_modal.section_3_text')}
                </p>

                <p>
                    <strong>{t('terms_modal.section_4_title')}</strong><br />
                    {t('terms_modal.section_4_text')}
                </p>

                <p>
                    <strong>{t('terms_modal.section_5_title')}</strong><br />
                    {t('terms_modal.section_5_text')}
                </p>
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose} variant="contained">
                    {t('terms_modal.close_button')}
                </Button>
            </DialogActions>
        </Dialog>
    )
}
