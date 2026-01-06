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
import Grid from '@mui/material/Grid';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

import { InvitationService } from '../services/InvitationService';

export default function InviteDialog({ open, onClose, roomId, roomName }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
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

  const handleShareNative = () => {
    if (navigator.share) {
      navigator.share({
        title: `Rejoins-moi sur ${roomName}`,
        text: `Rejoins-moi dans la salle "${roomName}" sur WatchWithMe !`,
        url: link,
      }).catch((err) => {
        console.log('Erreur lors du partage:', err);
        handleCopy();
      });
    } else {
      handleCopy();
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          backgroundColor: '#242424', 
          color: 'white',
          borderRadius: isMobile ? 0 : 2,
          maxHeight: isMobile ? '100%' : '90vh',
          margin: isMobile ? 0 : '32px',
          width: isMobile ? '100%' : 'auto'
        }
      }}
      scroll="paper"
    >
      <DialogTitle disableTypography sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        pb: 1,
        px: isMobile ? 2 : 3,
        pt: isMobile ? 3 : 2
      }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          {t('invite.title')}
        </Typography>
        <IconButton 
          onClick={onClose} 
          size="small" 
          sx={{ color: 'rgba(255,255,255,0.7)' }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Box sx={{ 
        borderBottom: 1, 
        borderColor: 'rgba(255,255,255,0.1)',
        px: isMobile ? 2 : 3
      }}>
        <Tabs 
          value={activeTab} 
          onChange={(e, v) => setActiveTab(v)} 
          textColor="secondary" 
          indicatorColor="secondary"
          variant="fullWidth"
          sx={{
            minHeight: isMobile ? 48 : 56,
            '& .MuiTab-root': {
              minHeight: isMobile ? 48 : 56,
              fontSize: isMobile ? '0.875rem' : '1rem',
              padding: isMobile ? '6px 8px' : '12px 16px'
            }
          }}
        >
          <Tab 
            icon={<LinkIcon />} 
            iconPosition="start" 
            label={isMobile ? t('invite.link') : t('invite.sendlink')}
            sx={{ fontSize: isMobile ? '0.8rem' : '0.875rem' }}
          />
          <Tab 
            icon={<EmailIcon />} 
            iconPosition="start" 
            label={isMobile ? t('invite.email') : t('invite.sendmail')}
            sx={{ fontSize: isMobile ? '0.8rem' : '0.875rem' }}
          />
        </Tabs>
      </Box>

      <DialogContent sx={{ 
        py: 3, 
        px: isMobile ? 2 : 3,
        '&.MuiDialogContent-root': {
          paddingTop: 3
        }
      }}>
        {/* ONGLET 1 : COPIER LE LIEN */}
        {activeTab === 0 && (
          <Box sx={{ mt: isMobile ? 1 : 0 }}>
            <Typography 
              variant="body2" 
              sx={{ 
                opacity: 0.7, 
                mb: 2,
                fontSize: isMobile ? '0.875rem' : '0.9rem'
              }}
            >
              {t('invite.linkdescription')}
            </Typography>

            {loadingLink ? (
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                py: 4,
                minHeight: 120
              }}>
                <CircularProgress size={isMobile ? 28 : 30} />
              </Box>
            ) : (
              <Stack spacing={2}>
                <Box sx={{ 
                  p: 1.5, 
                  borderRadius: 1, 
                  bgcolor: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  maxHeight: isMobile ? 80 : 100,
                  overflow: 'auto',
                  wordBreak: 'break-all'
                }}>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontFamily: 'monospace',
                      fontSize: isMobile ? '0.75rem' : '0.875rem',
                      lineHeight: 1.4
                    }}
                  >
                    {link}
                  </Typography>
                </Box>

                <Grid container spacing={1}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Button
                      fullWidth
                      variant="contained"
                      color={copied ? "success" : "primary"}
                      onClick={handleCopy}
                      startIcon={copied ? <CheckIcon /> : <ContentCopyIcon />}
                      size={isMobile ? "medium" : "large"}
                      sx={{
                        height: isMobile ? 44 : 48,
                        fontSize: isMobile ? '0.875rem' : '1rem'
                      }}
                    >
                      {copied 
                        ? t('invite.link.copied') 
                        : t('invite.link.copy')
                      }
                    </Button>
                  </Grid>
                  
                  {navigator.share && (
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Button
                        fullWidth
                        variant="outlined"
                        color="secondary"
                        onClick={handleShareNative}
                        size={isMobile ? "medium" : "large"}
                        sx={{
                          height: isMobile ? 44 : 48,
                          fontSize: isMobile ? '0.875rem' : '1rem'
                        }}
                      >
                        {t('invite.link.share')}
                      </Button>
                    </Grid>
                  )}
                </Grid>

                {isMobile && (
                  <Box sx={{ 
                    mt: 2, 
                    p: 1.5, 
                    borderRadius: 1, 
                    bgcolor: 'rgba(255,255,255,0.03)',
                    border: '1px dashed rgba(255,255,255,0.1)'
                  }}>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        opacity: 0.6,
                        display: 'block',
                        textAlign: 'center'
                      }}
                    >
                      {t('invite.link.tapToSelect')}
                    </Typography>
                  </Box>
                )}
              </Stack>
            )}
          </Box>
        )}

        {/* ONGLET 2 : ENVOYER PAR EMAIL */}
        {activeTab === 1 && (
          <Box component="form" onSubmit={handleSendEmail}>
            <Typography 
              variant="body2" 
              sx={{ 
                opacity: 0.7, 
                mb: 2,
                fontSize: isMobile ? '0.875rem' : '0.9rem'
              }}
            >
              {t('invite.email.description')}
            </Typography>

            <Stack spacing={2}>
              <TextField
                label={t('invite.email.recipient')}
                placeholder="ami@exemple.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth
                required
                variant="outlined"
                disabled={sendingEmail}
                size={isMobile ? "small" : "medium"}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon sx={{ color: 'rgba(255,255,255,0.5)' }} />
                    </InputAdornment>
                  ),
                  sx: {
                    fontSize: isMobile ? '0.875rem' : '1rem',
                    height: isMobile ? 48 : 56
                  }
                }}
                InputLabelProps={{
                  sx: {
                    fontSize: isMobile ? '0.875rem' : '1rem'
                  }
                }}
              />
              
              <Button 
                type="submit" 
                variant="contained" 
                color="secondary" 
                fullWidth
                size={isMobile ? "medium" : "large"}
                disabled={sendingEmail || !link || !email.trim()}
                startIcon={sendingEmail ? 
                  <CircularProgress size={isMobile ? 18 : 20} color="inherit"/> : 
                  <SendIcon />
                }
                sx={{
                  height: isMobile ? 48 : 56,
                  fontSize: isMobile ? '0.875rem' : '1rem',
                  fontWeight: 600
                }}
              >
                {sendingEmail 
                  ? t('invite.email.sending') 
                  : t('invite.email.send')
                }
              </Button>
            </Stack>

            {emailSuccess && (
              <Alert 
                severity="success" 
                sx={{ 
                  mt: 2,
                  '& .MuiAlert-message': {
                    fontSize: isMobile ? '0.875rem' : '1rem'
                  }
                }}
                onClose={() => setEmailSuccess(false)}
              >
                {t('invite.email.success')}
              </Alert>
            )}
          </Box>
        )}

        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              mt: 2,
              '& .MuiAlert-message': {
                fontSize: isMobile ? '0.875rem' : '1rem'
              }
            }}
            onClose={() => setError('')}
          >
            {error}
          </Alert>
        )}

        {/* Quick Actions for Mobile */}
        {isMobile && (
          <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <Typography 
              variant="caption" 
              sx={{ 
                opacity: 0.6,
                display: 'block',
                mb: 1,
                textAlign: 'center'
              }}
            >
              {t('invite.quickActions')}
            </Typography>
            <Grid container spacing={1}>
              <Grid size={6}>
                <Button
                  fullWidth
                  variant="text"
                  size="small"
                  onClick={() => setActiveTab(0)}
                  disabled={activeTab === 0}
                  sx={{
                    fontSize: '0.75rem',
                    py: 0.5
                  }}
                >
                  <LinkIcon sx={{ fontSize: 16, mr: 0.5 }} />
                  {t('invite.link')}
                </Button>
              </Grid>
              <Grid size={6}>
                <Button
                  fullWidth
                  variant="text"
                  size="small"
                  onClick={() => setActiveTab(1)}
                  disabled={activeTab === 1}
                  sx={{
                    fontSize: '0.75rem',
                    py: 0.5
                  }}
                >
                  <EmailIcon sx={{ fontSize: 16, mr: 0.5 }} />
                  {t('invite.email')}
                </Button>
              </Grid>
            </Grid>
          </Box>
        )}
      </DialogContent>

      {/* Mobile Footer Actions */}
      {isMobile && (
        <Box sx={{ 
          p: 2, 
          borderTop: '1px solid rgba(255,255,255,0.1)',
          backgroundColor: 'rgba(0,0,0,0.2)'
        }}>
          <Button
            fullWidth
            variant="outlined"
            onClick={onClose}
            size="medium"
            sx={{
              fontSize: '0.875rem'
            }}
          >
            {t('common.close')}
          </Button>
        </Box>
      )}
    </Dialog>
  );
}
