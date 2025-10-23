export const getApiUrl = () => {
  return import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3000')
}

export const getAuthUrl = () => {
  return import.meta.env.VITE_AUTH_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3050')
}