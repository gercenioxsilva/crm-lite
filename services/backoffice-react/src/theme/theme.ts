import { createTheme } from '@mui/material/styles'

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#8A05BE',
      light: '#b5179e',
      dark: '#6b0494',
    },
    secondary: {
      main: '#12CBC4',
      light: '#4dd8d2',
      dark: '#0e9a95',
    },
    background: {
      default: '#0F0F10',
      paper: '#171718',
    },
    text: {
      primary: '#F2F2F3',
      secondary: '#B0B0B5',
    },
    divider: '#2A2A2B',
  },
  typography: {
    fontFamily: 'Inter, system-ui, Segoe UI, Roboto, Arial, sans-serif',
  },
  components: {
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#171718',
          borderRight: '1px solid #2A2A2B',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: '1px solid #2A2A2B',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          textTransform: 'none',
        },
        contained: {
          background: 'linear-gradient(90deg, #8A05BE, #b5179e)',
          boxShadow: '0 8px 30px rgba(138,5,190,.25)',
          '&:hover': {
            boxShadow: '0 12px 40px rgba(138,5,190,.35)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            backgroundColor: '#101012',
          },
        },
      },
    },
  },
})