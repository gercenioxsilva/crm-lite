import { createTheme } from '@mui/material/styles'

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#14B8A6',
      light: '#5EEAD4',
      dark: '#0F766E',
    },
    secondary: {
      main: '#38BDF8',
      light: '#7DD3FC',
      dark: '#0284C7',
    },
    background: {
      default: '#0B0F14',
      paper: '#111827',
    },
    text: {
      primary: '#F8FAFC',
      secondary: '#CBD5E1',
    },
    error: {
      main: '#ff6b6b',
    },
  },
  typography: {
    fontFamily: 'Inter, system-ui, Segoe UI, Roboto, Arial, sans-serif',
    h1: {
      fontSize: '2.4rem',
      fontWeight: 750,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '1.25rem',
      fontWeight: 600,
    },
    body1: {
      fontSize: '0.875rem',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 700,
        },
        contained: {
          background: 'linear-gradient(90deg, #14B8A6, #38BDF8)',
          color: '#061013',
          boxShadow: '0 10px 30px rgba(20,184,166,.22)',
          '&:hover': {
            boxShadow: '0 14px 38px rgba(56,189,248,.26)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            backgroundColor: '#0B1220',
            '& fieldset': {
              borderColor: '#263244',
            },
            '&:hover fieldset': {
              borderColor: '#38BDF8',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#14B8A6',
            },
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          border: '1px solid rgba(148,163,184,.22)',
          background: 'linear-gradient(180deg, rgba(255,255,255,.04), transparent), #111827',
          boxShadow: '0 24px 80px rgba(0,0,0,.28)',
        },
      },
    },
  },
})
