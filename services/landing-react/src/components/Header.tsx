import { AppBar, Toolbar, Box, Typography } from '@mui/material'

export function Header() {
  return (
    <AppBar 
      position="sticky" 
      sx={{ 
        backgroundColor: 'rgba(7,17,19,.68)',
        backdropFilter: 'saturate(140%) blur(10px)',
        borderBottom: '1px solid rgba(148,163,184,.18)',
        boxShadow: 'none'
      }}
    >
      <Toolbar sx={{ maxWidth: 980, mx: 'auto', width: '100%' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box 
            sx={{ 
              width: 32, 
              height: 32, 
              borderRadius: 1, 
              background: 'linear-gradient(135deg, #14B8A6, #38BDF8)',
              boxShadow: '0 6px 24px rgba(20,184,166,.26)'
            }} 
          />
          <Typography variant="h6" sx={{ fontWeight: 600, letterSpacing: 0.5 }}>
            Quiz Fintech
          </Typography>
        </Box>
      </Toolbar>
    </AppBar>
  )
}
