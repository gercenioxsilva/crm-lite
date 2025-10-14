import { Box, CircularProgress, Typography } from '@mui/material'

interface LoadingProps {
  message?: string
}

export function Loading({ message = 'Carregando...' }: LoadingProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        bgcolor: 'background.default',
        gap: 2
      }}
    >
      <CircularProgress size={40} />
      <Typography variant="body1" color="text.secondary">
        {message}
      </Typography>
    </Box>
  )
}