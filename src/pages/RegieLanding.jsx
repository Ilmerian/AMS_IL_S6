import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TvIcon from '@mui/icons-material/Tv';
import SettingsInputComponentIcon from '@mui/icons-material/SettingsInputComponent';
import Section from '../ui/Section';

export default function RegieLanding() {
    const { t } = useTranslation();
    const navigate = useNavigate();

    return (
        <Section>
            <Box sx={{ textAlign: 'center', mt: 8 }}>
                <Typography variant="h3" fontWeight={800} gutterBottom>
                    Régie Studio
                </Typography>
                <Typography variant="h6" color="text.secondary" sx={{ mb: 6 }}>
                    Choisissez votre rôle pour cette session
                </Typography>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={4} justifyContent="center">
                    {/* Bouton Visionner */}
                    <Button 
                        variant="contained" 
                        size="large"
                        onClick={() => navigate('/regie/viewer')}
                        sx={{ py: 4, px: 6, display: 'flex', flexDirection: 'column', gap: 2, borderRadius: 4 }}
                    >
                        <TvIcon sx={{ fontSize: 60 }} />
                        <Typography variant="h5">Visionner</Typography>
                    </Button>

                    {/* Bouton Régisseur */}
                    <Button 
                        variant="contained" 
                        color="secondary"
                        size="large"
                        onClick={() => navigate('/regie/director')}
                        sx={{ py: 4, px: 6, display: 'flex', flexDirection: 'column', gap: 2, borderRadius: 4 }}
                    >
                        <SettingsInputComponentIcon sx={{ fontSize: 60 }} />
                        <Typography variant="h5">Régisseur</Typography>
                    </Button>
                </Stack>
            </Box>
        </Section>
    );
}