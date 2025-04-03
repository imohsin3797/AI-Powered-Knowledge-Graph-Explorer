import { createTheme } from "@mui/material/styles"

export const chatGPTDarkTheme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: "#343541", // main background
      paper: "#40414F",   // surfaces like cards, drawers
    },
    text: {
      primary: "#ECECF1", // near-white text
      secondary: "#D1D5DA",
    },
    primary: {
      main: "#10A37F", // ChatGPT's green accent
    },
    // You can override other components here if you wish:
    // components: { ... }
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    fontSize: 14,
  },
})
