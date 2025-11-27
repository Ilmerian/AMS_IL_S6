// src/pages/Home.jsx
//import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import Avatar from "@mui/material/Avatar";
import Card from "@mui/material/Card";
import CardMedia from "@mui/material/CardMedia";
import CardContent from "@mui/material/CardContent";
import { FiPlus, FiVideo, FiUsers, FiLock, FiMessageCircle } from "react-icons/fi";

export default function Home() {
  //const { t } = useTranslation();

  return (
    <Box sx={{ minHeight: "100vh", color: "white" }}>

      {/* HERO SECTION */}
      <Grid
        container
        spacing={5}
        sx={{ px: 5, py: 10, color: "#A36BFF" }}
        alignItems="center"
      >
        {/* LEFT */}
        <Grid item xs={12} md={6}>
          <Typography fontSize="3rem" fontWeight={900} lineHeight={1.2}>
            Come Watch With Me !
          </Typography>

          <Typography sx={{ mt: 2, opacity: 0.8 }}>
            Create a private or public room and share moments.
          </Typography>

          <Stack direction="row" spacing={3} sx={{ mt: 5 }}>
            <Button
              variant="contained"
              component={RouterLink}
              to="/rooms/new"
              sx={{ bgcolor: "#8b5cf6", ":hover": { bgcolor: "#7c3aed" } }}
            >
              Create a room
            </Button>

            <Button
              variant="outlined"
              sx={{ color: "white", borderColor: "white" }}
            >
              Join with code
            </Button>
          </Stack>
        </Grid>
      </Grid>

      {/* HOW IT WORKS */}
      <Box sx={{ px: 5, mt: 5 }}>
        <Typography variant="h4" fontWeight={700}>
          How does it work?
        </Typography>

        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Box
            sx={{
              bgcolor: "rgba(255,255,255,0.05)",
              p: 3,
              borderRadius: 3,
              boxShadow: "0 0 30px rgba(120,0,255,0.3)",
            }}
          >
            <InfoCard
              icon={<FiPlus />}
              title="Create a room"
              subtitle="public or private"
            />
          </Box>

          <Box
            sx={{
              bgcolor: "rgba(255,255,255,0.05)",
              p: 3,
              borderRadius: 3,
              boxShadow: "0 0 30px rgba(120,0,255,0.3)",
            }}
          >
            <InfoCard
              icon={<FiVideo />}
              title="Add videos"
              subtitle="YouTube to the playlist"
            />
          </Box>

          <Box
            sx={{
              bgcolor: "rgba(255,255,255,0.05)",
              p: 3,
              borderRadius: 3,
              boxShadow: "0 0 30px rgba(120,0,255,0.3)",
            }}
          >
            <InfoCard
              icon={<FiUsers />}
              title="Watch together"
              subtitle="and chat live"
            />
          </Box>
        </Grid>
      </Box>

      {/* CONTACT SECTION */}
      <Box sx={{ px: 5, mt: 5, mb: 10 }}>
        <Typography variant="h4" fontWeight={700}>
          Contact us
        </Typography>

        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Box
            sx={{
              bgcolor: "rgba(255,255,255,0.05)",
              p: 3,
              borderRadius: 3,
              boxShadow: "0 0 30px rgba(120,0,255,0.3)",
            }}
          >
            <InfoCard
              icon={<FiMessageCircle size={32} />}
              title="Email"
              subtitle="contact@watchwithme.com"
            />
          </Box>
          <Box
            sx={{
              bgcolor: "rgba(255,255,255,0.05)",
              p: 3,
              borderRadius: 3,
              boxShadow: "0 0 30px rgba(120,0,255,0.3)",
            }}
          >
            <InfoCard
              icon={<FiUsers size={32} />}
              title="Instagram"
              subtitle="@watchwithme"
            />
          </Box>
          <Box
            sx={{
              bgcolor: "rgba(255,255,255,0.05)",
              p: 3,
              borderRadius: 3,
              boxShadow: "0 0 30px rgba(120,0,255,0.3)",
            }}
          >
            <InfoCard
              icon={<FiVideo size={32} />}
              title="TikTok"
              subtitle="@watchwithme"
            />
          </Box>

        </Grid>
      </Box>
    </Box>
  );
}

/* --- COMPONENTS --- */

function InfoCard({ icon, title, subtitle }) {
  return (
    <Grid item xs={12} md={4}>
      <Box
        sx={{
          p: 4,
          bgcolor: "rgba(255,255,255,0.05)",
          borderRadius: 3,
          transition: "0.2s",
          ":hover": { bgcolor: "rgba(255,255,255,0.1)" },
        }}
      >
        <Box fontSize="2rem" color="#B17EFF">
          {icon}
        </Box>

        <Typography fontWeight={600} mt={1} fontSize="1.2rem">
          {title}
        </Typography>

        {subtitle && (
          <Typography mt={0.5} fontSize="0.9rem" opacity={0.7}>
            {subtitle}
          </Typography>
        )}
      </Box>
    </Grid>
  );
}