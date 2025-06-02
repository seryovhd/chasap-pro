import React, { useState, useEffect } from "react";

import "react-toastify/dist/ReactToastify.css";
import { QueryClient, QueryClientProvider } from "react-query";
import lightBackground from '../src/assets/wa-background-light.png';
import darkBackground from '../src/assets/wa-background-dark.jpg';
import { esES } from "@material-ui/core/locale";
import { createTheme, ThemeProvider } from "@material-ui/core/styles";
import { useMediaQuery } from "@material-ui/core";
import ColorModeContext from "./layout/themeContext";
import { SocketContext, SocketManager } from './context/Socket/SocketContext';

import Routes from "./routes";

const queryClient = new QueryClient();

const App = () => {
    const [locale, setLocale] = useState();

    const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");
    const preferredTheme = window.localStorage.getItem("preferredTheme");
    const [mode, setMode] = useState(preferredTheme ? preferredTheme : prefersDarkMode ? "dark" : "light");

    const colorMode = React.useMemo(
        () => ({
            toggleColorMode: () => {
                setMode((prevMode) => (prevMode === "light" ? "dark" : "light"));
            },
        }),
        []
    );

    const theme = createTheme(
        {
            overrides: {
                MuiButton: {
                    root: {
                        textTransform: "none", 
                        borderRadius: 20,
                        padding: "6px 16px",
                        
                    },
                    containedPrimary: {
                        fontWeight: "bold",
                    },
                    outlinedPrimary: {
                        fontWeight: "bold", 
                    },
                    textPrimary: {
                        fontWeight: "bold",
                    },
                },
            },

            scrollbarStyles: {
                "&::-webkit-scrollbar": {
                    width: '4px',
                    height: '4px',
                    borderRadius: "8px",
                },
                "&::-webkit-scrollbar-thumb": {
                    boxShadow: 'inset 0 0 6px rgba(0, 0, 0, 0.3)',
                    backgroundColor: 'rgba(0, 0, 0, 0.2) !important',
                    borderRadius: "8px",
                },
            },
            scrollbarStylesSoft: {
                "&::-webkit-scrollbar": {
                    width: "8px",
                    borderRadius: "8px",
                },
                "&::-webkit-scrollbar-thumb": {
                    backgroundColor: mode === "light" ? "#F3F3F3" : "#333333",
                    borderRadius: "8px",
                },
            },
            palette: {
                type: mode,
                primary: { main: mode === "light" ? "#0073B5" : "#FFFFFF" },
                sair: { main: mode === "light" ? "#0073B5" : "#333" },
                vcard: { main: mode === "light" ? "#0073B5" : "#666" },
                textPrimary: mode === "light" ? "#0073B5" : "#FFFFFF",
                borderPrimary: mode === "light" ? "#0073B5" : "#FFFFFF",
                dark: { main: mode === "light" ? "#333333" : "#F3F3F3" },
                light: { main: mode === "light" ? "#F3F3F3" : "#333333" },
                tabHeaderBackground: mode === "light" ? "#f0f2f5" : "#666",
                ticketlist: mode === "light" ? "#fafafa" : "#333",
                optionsBackground: mode === "light" ? "#fafafa" : "#333",
                options: mode === "light" ? "#fafafa" : "#666",
                fontecor: mode === "light" ? "#128c7e" : "#fff",
                fancyBackground: mode === "light" ? "#fafafa" : "#333",
                bordabox: mode === "light" ? "#f0f2f5" : "#333",
                newmessagebox: mode === "light" ? "#f0f2f5" : "#333",
                inputdigita: mode === "light" ? "#fff" : "#666",
                contactdrawer: mode === "light" ? "#fff" : "#666",
                announcements: mode === "light" ? "#ededed" : "#333",
                login: mode === "light" ? "#fff" : "#1C1C1C",
                announcementspopover: mode === "light" ? "#fff" : "#666",
                chatlist: mode === "light" ? "#f0f2f5" : "#666",
                boxlist: mode === "light" ? "#ededed" : "#666",
                boxchatlist: mode === "light" ? "#ededed" : "#333",
                total: mode === "light" ? "#fff" : "#222",
                messageIcons: mode === "light" ? "grey" : "#F3F3F3",
                inputBackground: mode === "light" ? "#FFFFFF" : "#333",
                barraSuperior: mode === "light" ? "linear-gradient(to right, #0073b5, #007aff)" : "#666",
                boxticket: mode === "light" ? "#f0f2f5" : "#666",
                campaigntab: mode === "light" ? "#ededed" : "#666",
                mediainput: mode === "light" ? "#ededed" : "#1c1c1c",
                contadordash: mode == "light" ? "#fff" : "#fff",
                ticketoptions: mode == "light" ? "#fff" : "#424242",
            },
            mode,
        },
        locale
    );

    useEffect(() => {
        const i18nlocale = localStorage.getItem("i18nextLng");
        const browserLocale =
            i18nlocale.substring(0, 2) + i18nlocale.substring(3, 5);

        if (browserLocale === "esES") {
            setLocale(esES);
        }
    }, []);

    useEffect(() => {
        window.localStorage.setItem("preferredTheme", mode);
    }, [mode]);



    return (
        <ColorModeContext.Provider value={{ colorMode }}>
            <ThemeProvider theme={theme}>
                <QueryClientProvider client={queryClient}>
                    <SocketContext.Provider value={SocketManager}>
                        <Routes />
                    </SocketContext.Provider>
                </QueryClientProvider>
            </ThemeProvider>
        </ColorModeContext.Provider>
    );
};

export default App;
