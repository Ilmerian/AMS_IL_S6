import { createContext, useMemo, useState, useEffect } from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";

export const ColorModeContext = createContext({
    toggleColorMode: () => { }
});

export function CustomThemeProvider({ children }) {
    const [mode, setMode] = useState("dark");

    useEffect(() => {
        const saved = localStorage.getItem("theme");
        if (saved) setMode(saved);
    }, []);

    const colorMode = useMemo(
        () => ({
            toggleColorMode: () => {
                setMode(prev => {
                    const newMode = prev === "dark" ? "light" : "dark";
                    localStorage.setItem("theme", newMode);
                    return newMode;
                });
            }
        }),
        []
    );

    const theme = useMemo(
        () =>
            createTheme({
                palette: {
                    mode,

                    primary: {
                        main: mode === "dark" ? "#646cff" : "#4a4eaa",
                        contrastText: "#ffffff"
                    },

                    background: {
                        default: mode === "dark" ? "#12091E" : "#b9c1ff",
                        paper: "#1e1e1e"   // cards et modals
                    },

                    text: {
                        primary: "#ffffff",
                        secondary: "rgba(255,255,255,0.7)"
                    }
                },

                shape: { borderRadius: 10 },
            }),
        [mode]
    );

    return (
        <ColorModeContext.Provider value={colorMode}>
            <ThemeProvider theme={theme}>
                {children}
            </ThemeProvider>
        </ColorModeContext.Provider>
    );
}
