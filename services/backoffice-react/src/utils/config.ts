export const getApiUrl = () => {
  return import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
}

export const getAuthUrl = () => {
  return import.meta.env.VITE_AUTH_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3050')
}