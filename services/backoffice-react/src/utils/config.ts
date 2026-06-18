const defaultApiUrl = import.meta.env.PROD ? '/api' : 'http://localhost:3000/api'

export const getApiUrl = () => {
  return import.meta.env.VITE_API_URL || defaultApiUrl
}

export const getAuthUrl = () => {
  return import.meta.env.VITE_AUTH_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3050')
}