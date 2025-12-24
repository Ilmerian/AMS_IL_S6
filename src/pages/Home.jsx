import { Link as RouterLink } from "react-router-dom";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import { useTranslation } from 'react-i18next'
import Grid from "@mui/material/Grid";
import Container from "@mui/material/Container";
import { FiPlus, FiVideo, FiUsers, FiMessageCircle, FiMail, FiTwitter, FiVideo as FiTiktok } from "react-icons/fi";
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

export default function Home() {
  const theme = useTheme();
  const { t } = useTranslation();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));

  return (
    <Box sx={{ overflowX: "hidden" }}>

      {/* HERO SECTION */}
      <Box
        sx={{
          width: "100vw",
          marginLeft: "calc(-50vw + 50%)",
          height: {
            xs: "70vh",
            sm: "75vh",
            md: "650px"
          },
          minHeight: { xs: 500, sm: 600 },
          position: "relative",
          backgroundImage: "url('/Home.jpg')",
          backgroundSize: "cover",
          backgroundPosition: isMobile ? "center 30%" : "center",
          backgroundRepeat: "no-repeat",
          backgroundAttachment: isMobile ? "scroll" : "fixed",
          mt: isMobile ? 0 : -12,
          zIndex: 0,
        }}
      >
        {/* Top Gradient */}
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: { xs: "80px", sm: "120px" },
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0) 100%)",
            pointerEvents: "none",
          }}
        />

        {/* Bottom Gradient */}
        <Box
          sx={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "100%",
            height: { xs: "40%", sm: "180px" },
            background: `
              linear-gradient(
                to bottom,
                rgba(0, 0, 0, 0) 0%,
                rgba(18, 9, 30, 0.4) 25%,
                rgba(18, 9, 30, 0.8) 50%,
                #12091E 100%
              )
            `,
            pointerEvents: "none",
            zIndex: 1,
          }}
        />

        {/* Hero Content */}
        <Container maxWidth="lg" sx={{ height: "100%", position: "relative", zIndex: 2 }}>
          <Box
            sx={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              pb: { xs: 4, sm: 6, md: 8 },
              px: { xs: 2, sm: 3 },
            }}
          >
            <Box>
              <Typography
                fontSize={{
                  xs: "2rem",
                  sm: "2.4rem",
                  md: "2.8rem",
                  lg: "3.2rem"
                }}
                fontWeight={900}
                lineHeight={1.1}
                sx={{
                  textShadow: `
                    0px 0px 12px rgba(0,0,0,0.9),
                    0px 0px 20px rgba(0,0,0,0.7)
                  `,
                  mb: 2
                }}
              >
                {t('homepage.homepage')},
              </Typography>

              <Typography
                fontSize={{ xs: "1rem", sm: "1.1rem", md: "1.2rem" }}
                sx={{
                  opacity: 0.9,
                  textShadow: `
                    0px 0px 12px rgba(0,0,0,0.9),
                    0px 0px 20px rgba(0,0,0,0.7)
                  `,
                  mb: { xs: 3, sm: 4 },
                  maxWidth: "600px"
                }}
              >
                {t('homepage.description')}
              </Typography>

              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                sx={{
                  width: "100%",
                  maxWidth: { xs: "100%", sm: "400px" }
                }}
              >
                <Button
                  variant="contained"
                  component={RouterLink}
                  to="/rooms/new"
                  size={isMobile ? "medium" : "large"}
                  sx={{
                    bgcolor: "#9b5cff",
                    ":hover": { bgcolor: "#7c3aed" },
                    flex: 1,
                    py: { xs: 1.5, sm: 1.75 },
                    fontSize: { xs: "0.9rem", sm: "1rem" }
                  }}
                >
                  {t('homepage.create_room')}
                </Button>

                <Button
                  variant="outlined"
                  component={RouterLink}
                  to="/rooms"
                  size={isMobile ? "medium" : "large"}
                  sx={{
                    color: "white",
                    borderColor: "rgba(255,255,255,0.5)",
                    background: "rgba(0,0,0,0.25)",
                    backdropFilter: "blur(2px)",
                    flex: 1,
                    py: { xs: 1.5, sm: 1.75 },
                    fontSize: { xs: "0.9rem", sm: "1rem" },
                    ":hover": {
                      background: "rgba(0,0,0,0.35)",
                      borderColor: "white",
                    },
                  }}
                >
                  {t('homepage.join_room')}
                </Button>
              </Stack>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* MAIN CONTENT */}
      <Container maxWidth="lg">
        <Box sx={{ px: { xs: 2, sm: 3 }, py: { xs: 6, sm: 8, md: 10 }, color: "white" }}>

          {/* HOW IT WORKS SECTION */}
          <Box sx={{ mb: { xs: 8, md: 12 } }}>
            <Typography
              variant="h4"
              fontWeight={700}
              sx={{
                mb: { xs: 3, sm: 4 },
                textAlign: "center",
                fontSize: { xs: "1.5rem", sm: "1.75rem", md: "2rem" }
              }}
            >
              {t('homepage.quation')}
            </Typography>

            <Grid container spacing={{ xs: 3, sm: 4, md: 6 }} justifyContent="center">
              {[
                { icon: <FiPlus />, title: t('homepage.step1_title'), subtitle: t('homepage.step1_desc') },
                { icon: <FiVideo />, title: t('homepage.step2_title'), subtitle: t('homepage.step2_desc') },
                { icon: <FiUsers />, title: t('homepage.step3_title'), subtitle: t('homepage.step3_desc') },
                { icon: <FiVideo />, title: t('homepage.step4_title'), subtitle: t('homepage.step4_desc') }
              ].map((item, index) => (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <InfoCard
                    icon={item.icon}
                    title={item.title}
                    subtitle={item.subtitle}
                    isMobile={isMobile}
                    isTablet={isTablet}
                  />
                </Grid>
              ))}
            </Grid>
          </Box>

          {/* JOIN WITH CODE SECTION */}
          <Box sx={{ mb: { xs: 8, md: 12 } }}>
            <Typography
              variant="h4"
              fontWeight={700}
              sx={{
                mb: { xs: 3, sm: 4 },
                textAlign: "center",
                fontSize: { xs: "1.5rem", sm: "1.75rem", md: "2rem" }
              }}
            >
              {t('homepage.join_code')}
            </Typography>

            <Grid container spacing={{ xs: 3, sm: 4, md: 6 }} justifyContent="center">
              {[
                { icon: <FiMessageCircle />, title: t('homepage.enter_code'), subtitle: t('homepage.enter_code_desc') },
                { icon: <FiPlus />, title: t('homepage.access_desc'), subtitle: t('homepage.access_desc') },
                { icon: <FiUsers />, title: t('homepage.mode'), subtitle: t('homepage.mode_desc') }
              ].map((item, index) => (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <InfoCard
                    icon={item.icon}
                    title={item.title}
                    subtitle={item.subtitle}
                    isMobile={isMobile}
                    isTablet={isTablet}
                  />
                </Grid>
              ))}
            </Grid>
          </Box>

          {/* CONTACT SECTION */}
          <Box>
            <Typography
              variant="h4"
              fontWeight={700}
              sx={{
                mb: { xs: 3, sm: 4 },
                textAlign: "center",
                fontSize: { xs: "1.5rem", sm: "1.75rem", md: "2rem" }
              }}
            >
              {t('homepage.contact_us')}
            </Typography>

            <Grid container spacing={{ xs: 3, sm: 4, md: 6 }} justifyContent="center">
              {[
                { icon: <FiMail />, title: "Email", subtitle: "contact@watchwithme.com" },
                { icon: <FiTwitter />, title: "X", subtitle: "@watchwithme" },
                { icon: <FiTiktok />, title: "TikTok", subtitle: "@watchwithme" }
              ].map((item, index) => (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <InfoCard
                    icon={item.icon}
                    title={item.title}
                    subtitle={item.subtitle}
                    isMobile={isMobile}
                    isTablet={isTablet}
                    contact={true}
                  />
                </Grid>
              ))}
            </Grid>
          </Box>

          {/* MOBILE APP PROMO */}
          {isMobile && (
            <Box sx={{
              mt: 8,
              p: 3,
              borderRadius: 3,
              bgcolor: "rgba(155, 92, 255, 0.1)",
              border: "1px solid rgba(155, 92, 255, 0.3)",
              textAlign: "center"
            }}>
              <Typography
                variant="h6"
                fontWeight={600}
                sx={{ mb: 2, color: "#B17EFF" }}
              >
                📱 {t('mobile_friendly')}
              </Typography>
              <Typography
                variant="body2"
                sx={{ opacity: 0.9, mb: 2 }}
              >
                {t('mobile_friendly_desc')}
              </Typography>
            </Box>
          )}

          {/* CTA SECTION */}
          <Box sx={{
            mt: { xs: 8, md: 12 },
            textAlign: "center"
          }}>
            <Typography
              variant="h5"
              fontWeight={700}
              sx={{
                mb: 3,
                fontSize: { xs: "1.3rem", sm: "1.5rem", md: "1.75rem" }
              }}
            >
              {t('homepage.new_question')}
            </Typography>
            <Button
              variant="contained"
              component={RouterLink}
              to="/rooms/new"
              size={isMobile ? "medium" : "large"}
              sx={{
                bgcolor: "#9b5cff",
                ":hover": { bgcolor: "#7c3aed" },
                px: { xs: 4, sm: 5 },
                py: { xs: 1.5, sm: 2 },
                fontSize: { xs: "1rem", sm: "1.1rem" },
                fontWeight: 600
              }}
            >
              {t('homepage.get_started')}
            </Button>
          </Box>

        </Box>
      </Container>
    </Box>
  );
}

/* --- COMPONENTS --- */

function InfoCard({ icon, title, subtitle, isMobile, contact = false }) {
  return (
    <Box
      sx={{
        height: "100%",
        p: { xs: 2.5, sm: 3 },
        borderRadius: 3,
        bgcolor: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.1)",
        boxShadow: "0 4px 20px rgba(120,0,255,0.2)",
        transition: "all 0.3s ease",
        ":hover": {
          transform: isMobile ? "none" : "translateY(-4px)",
          boxShadow: "0 8px 30px rgba(120,0,255,0.3)",
          bgcolor: "rgba(255,255,255,0.08)",
        },
        display: "flex",
        flexDirection: "column",
        alignItems: isMobile ? "center" : "flex-start",
        textAlign: isMobile ? "center" : "left"
      }}
    >
      <Box
        sx={{
          fontSize: contact ? { xs: "1.8rem", sm: "2rem" } : { xs: "1.6rem", sm: "1.8rem", md: "2rem" },
          color: "#B17EFF",
          mb: { xs: 1.5, sm: 2 }
        }}
      >
        {icon}
      </Box>

      <Typography
        fontWeight={600}
        sx={{
          mb: 1,
          fontSize: {
            xs: contact ? "1.1rem" : "1rem",
            sm: contact ? "1.2rem" : "1.1rem",
            md: contact ? "1.3rem" : "1.2rem"
          }
        }}
      >
        {title}
      </Typography>

      {subtitle && (
        <Typography
          sx={{
            opacity: 0.7,
            fontSize: {
              xs: "0.85rem",
              sm: "0.9rem",
              md: "0.95rem"
            },
            lineHeight: 1.4,
            flex: 1
          }}
        >
          {subtitle}
        </Typography>
      )}
    </Box>
  );
}