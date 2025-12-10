import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import SendIcon from '@mui/icons-material/Send';
import EmailIcon from '@mui/icons-material/Email';
import LinkIcon from '@mui/icons-material/Link';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import CircularProgress from '@mui/material/CircularProgress';
import InputAdornment from '@mui/material/InputAdornment';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';

import { InvitationService } from '../services/InvitationService';

export default function InviteDialog({ open, onClose, roomId, roomName }) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState(0);
  
  // États pour le lien
  const [link, setLink] = useState('');
  const [loadingLink, setLoadingLink] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // États pour l'email
  const [email, setEmail] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && roomId) {
      // Reset des états à l'ouverture
      setLoadingLink(true);
      setError('');
      setCopied(false);
      setEmailSuccess(false);
      setEmail('');
      setActiveTab(0);
      
      InvitationService.getOrCreateInviteLink(roomId)
        .then(url => setLink(url))
        .catch(err => setError(err.message || 'Erreur génération lien'))
        .finally(() => setLoadingLink(false));
    }
  }, [open, roomId]);

  const handleCopy = () => {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setSendingEmail(true);
    setError('');
    setEmailSuccess(false);

    try {
      await InvitationService.sendInviteByEmail(roomId, roomName, email);
      setEmailSuccess(true);
      setEmail(''); // On vide le champ après succès
    } catch (err) {
      console.error(err);
      setError("Échec de l'envoi. Vérifiez l'adresse email.");
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: '#242424', 
          color: 'white',
          borderRadius: 2
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        Inviter des amis
        <IconButton onClick={onClose} size="small" sx={{ color: 'rgba(255,255,255,0.7)' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
        <Tabs 
            value={activeTab} 
            onChange={(e, v) => setActiveTab(v)} 
            textColor="secondary" 
            indicatorColor="secondary"
            variant="fullWidth"
        >
            <Tab icon={<LinkIcon />} iconPosition="start" label="Lien" />
            <Tab icon={<EmailIcon />} iconPosition="start" label="Par Email" />
        </Tabs>
      </Box>

      <DialogContent sx={{ py: 4 }}>
        {/* ONGLET 1 : COPIER LE LIEN */}
        {activeTab === 0 && (
            <Box>
                <Typography variant="body2" sx={{ opacity: 0.7, mb: 2 }}>
                  Partagez ce lien directement avec vos amis pour qu'ils rejoignent le salon.
                </Typography>

                {loadingLink ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                    <CircularProgress size={30} />
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                      value={link}
                      fullWidth
                      variant="outlined"
                      size="small"
                      InputProps={{
                        readOnly: true,
                        sx: { color: 'white', bgcolor: 'rgba(255,255,255,0.05)', fontFamily: 'monospace' }
                      }}
                      onFocus={(e) => e.target.select()}
                    />
                    <Button
                      variant="contained"
                      color={copied ? "success" : "primary"}
                      onClick={handleCopy}
                      startIcon={copied ? <CheckIcon /> : <ContentCopyIcon />}
                      sx={{ minWidth: 110 }}
                    >
                      {copied ? "Copié" : "Copier"}
                    </Button>
                  </Box>
                )}
            </Box>
        )}

        {/* ONGLET 2 : ENVOYER PAR EMAIL (Via Resend) */}
        {activeTab === 1 && (
            <Box component="form" onSubmit={handleSendEmail}>
                <Typography variant="body2" sx={{ opacity: 0.7, mb: 2 }}>
                  Entrez l'email de votre ami. Il recevra une belle invitation dans sa boîte mail.
                </Typography>

                <Stack spacing={2}>
                    <TextField
                      label="Email du destinataire"
                      placeholder="ami@exemple.com"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      fullWidth
                      required
                      variant="outlined"
                      disabled={sendingEmail}
                      InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <EmailIcon sx={{ color: 'rgba(255,255,255,0.5)' }} />
                            </InputAdornment>
                        )
                      }}
                    />
                    
                    <Button 
                        type="submit" 
                        variant="contained" 
                        color="secondary" 
                        size="large"
                        disabled={sendingEmail || !link}
                        startIcon={sendingEmail ? <CircularProgress size={20} color="inherit"/> : <SendIcon />}
                    >
                        {sendingEmail ? "Envoi en cours..." : "Envoyer l'invitation"}
                    </Button>
                </Stack>

                {emailSuccess && (
                    <Alert severity="success" sx={{ mt: 2 }}>
                        Invitation envoyée avec succès !
                    </Alert>
                )}
            </Box>
        )}

        {error && (
            <Typography color="error" sx={{ mt: 2, fontSize: '0.9rem' }}>
                {error}
            </Typography>
        )}

      </DialogContent>
    </Dialog>
  );
}