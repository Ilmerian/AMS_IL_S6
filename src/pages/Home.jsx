import { Link as RouterLink } from "react-router-dom";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import { FiPlus, FiVideo, FiUsers, FiMessageCircle } from "react-icons/fi";

export default function Home() {
  return (
    <Box >

      {/* HERO BANNIÈRE */}
      <Box
        sx={{
          width: "100vw",
          marginLeft: "calc(-50vw + 50%)",
          height: { xs: "420px", md: "650px" },
          position: "relative",
          backgroundImage: "url('/public/Home.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          mt: -12,
          zIndex: 0,
        }}
      >
        {/* GRADIENT POUR FUSION AVEC LA NAVBAR */}
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "120px",
            background:
              "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)",
            pointerEvents: "none",
          }}
        />

        {/* GRADIENT BAS POUR FUSION AVEC LE BAS DE LA PAGE */}
        <Box
          sx={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "100%",
            height: "180px",
            background: `
              linear-gradient(
                to bottom,
                rgba(0, 0, 0, 0) 0%,
                rgba(18, 9, 30, 0.4) 45%,
                rgba(18, 9, 30, 0.8) 70%,
                #12091E 100%
              )
            `,
            pointerEvents: "none",
            zIndex: 1,
          }}
        />

        {/* CONTENU DE LA BANNIÈRE */}
        <Box
          sx={{
            position: "absolute",
            bottom: 30,
            left: { xs: 20, md: 60 },
            color: "white",
            zIndex: 2,
          }}
        >
          <Typography
            fontSize={{ xs: "1.9rem", md: "2.8rem" }}
            fontWeight={900}
            sx={{
              textShadow: `
                0px 0px 12px rgba(0,0,0,0.9),
                0px 0px 20px rgba(0,0,0,0.7)
              `,
            }}
          >
            Come Watch With Me !
          </Typography>

          <Typography sx={{
            opacity: 0.9, mt: 1,
            textShadow: `
                0px 0px 12px rgba(0,0,0,0.9),
                0px 0px 20px rgba(0,0,0,0.7)
              `,
            WebkitTextStroke: "0.5px rgba(255,255,255,0.7)"
          }}>
            Create a private or public room and share moments together.
          </Typography>

          <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
            <Button
              variant="contained"
              component={RouterLink}
              to="/rooms/new"
              sx={{
                bgcolor: "#9b5cff",
                ":hover": { bgcolor: "#7c3aed" },
              }}
            >
              Create a room
            </Button>

            <Button
              variant="outlined"
              sx={{
                color: "white",
                borderColor: "white",
                background: "rgba(0,0,0,0.25)", // transparence foncée
                backdropFilter: "blur(2px)",    // léger flou pour lisibilité
                textShadow: "0px 0px 4px rgba(0,0,0,0.8)",
                ":hover": {
                  background: "rgba(0,0,0,0.35)", // un peu plus foncé au hover
                  borderColor: "white",
                },
              }}
            >
              Join with code
            </Button>
          </Stack>
        </Box>
      </Box>

      {/* SECTION UNDER BANNER */}
      <Box sx={{ px: { xs: 3, md: 10 }, py: 10, color: "white" }}>

        {/* HOW DOES IT WORK */}
        <Typography
          variant="h4"
          fontWeight={700}
          sx={{ mb: 4, textAlign: "center" }}
        >
          How does it work?
        </Typography>

        <Grid container spacing={8} justifyContent="center">
          <Grid item xs={12} md={4}>
            <Box
              sx={{
                bgcolor: "rgba(255,255,255,0.05)",
                p: 3,
                borderRadius: 3,
                boxShadow: "0 0 15px rgba(120,0,255,0.3)",
              }}
            >
              <InfoCard
                icon={<FiPlus />}
                title="Create a room"
                subtitle="public or private"
              />
            </Box>
          </Grid>

          <Grid item xs={12} md={4}>
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
          </Grid>

          <Grid item xs={12} md={4}>
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

          <Grid item xs={12} md={4}>
            <Box
              sx={{
                bgcolor: "rgba(255,255,255,0.05)",
                p: 3,
                borderRadius: 3,
                boxShadow: "0 0 15px rgba(120,0,255,0.3)",
              }}
            >
              <InfoCard
                icon={<FiVideo />}
                title="Collaborative playlist"
                subtitle="edit videos together"
              />
            </Box>
          </Grid>
        </Grid>

        <Typography
          variant="h4"
          fontWeight={700}
          sx={{ mt: 10, mb: 4, textAlign: "center" }}
        >
          You can join with code !
        </Typography>

        <Grid container spacing={8} justifyContent="center">

          {/* CARD 1 */}
          <Grid item xs={12} md={4}>
            <Box
              sx={{
                bgcolor: "rgba(255,255,255,0.05)",
                p: 3,
                borderRadius: 3,
                boxShadow: "0 0 15px rgba(120,0,255,0.3)",
              }}
            >
              <InfoCard
                icon={<FiMessageCircle />}
                title="Enter a room code"
                subtitle="Type the code shared with you to join."
              />
            </Box>
          </Grid>

          {/* CARD 2 */}
          <Grid item xs={12} md={4}>
            <Box
              sx={{
                bgcolor: "rgba(255,255,255,0.05)",
                p: 3,
                borderRadius: 3,
                boxShadow: "0 0 15px rgba(120,0,255,0.3)",
              }}
            >
              <InfoCard
                icon={<FiPlus />}
                title="Instant access"
                subtitle="Join immediately if the code is valid."
              />
            </Box>
          </Grid>

          {/* CARD 3 */}
          <Grid item xs={12} md={4}>
            <Box
              sx={{
                bgcolor: "rgba(255,255,255,0.05)",
                p: 3,
                borderRadius: 3,
                boxShadow: "0 0 15px rgba(120,0,255,0.3)",
              }}
            >
              <InfoCard
                icon={<FiUsers />}
                title="Guest or user mode"
                subtitle="Guests watch, users can fully interact."
              />
            </Box>
          </Grid>
        </Grid>

        {/* CONTACT SECTION */}
        <Box sx={{ px: 5, mt: 10, mb: 10 }}>
          <Typography variant="h4" fontWeight={700} sx={{ textAlign: "center", mb: 4 }}>
            Contact us
          </Typography>

          <Grid container spacing={8} justifyContent="center">

            {/* EMAIL */}
            <Grid item xs={12} md={4}>
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
            </Grid>

            {/* INSTAGRAM */}
            <Grid item xs={12} md={4}>
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
                  title="X"
                  subtitle="@watchwithme"
                />
              </Box>
            </Grid>

            {/* TIKTOK */}
            <Grid item xs={12} md={4}>
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

          </Grid>
        </Box>

      </Box>
    </Box>
  );
}

/* --- COMPONENTS --- */

function InfoCard({ icon, title, subtitle }) {
  return (
    <Box
      sx={{
        p: 4,
        borderRadius: 3,
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
  );
}
