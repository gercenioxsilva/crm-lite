import { AppBar, Toolbar, Box, Typography } from '@mui/material'

export function Header() {
  return (
    <AppBar 
      position="sticky" 
      sx={{ 
        backgroundColor: 'rgba(15,15,16,.6)', 
        backdropFilter: 'saturate(140%) blur(10px)',
        borderBottom: '1px solid #2A2A2B',
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
              background: 'linear-gradient(135deg, #8A05BE, #b5179e)',
              boxShadow: '0 6px 24px rgba(138,5,190,.35)'
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