import { useEffect } from 'react'

interface GoogleSignInProps {
  onSuccess: (credential: string) => void
  clientId: string
}

declare global {
  interface Window {
    google: any
    onGoogleCredential?: (response: { credential: string }) => void
  }
}

export function GoogleSignIn({ onSuccess, clientId }: GoogleSignInProps) {
  useEffect(() => {
    // Define callback global
    window.onGoogleCredential = (response: { credential: string }) => {
      onSuccess(response.credential)
    }

    // Inicializa Google Sign-In quando o script carregar
    const initializeGoogleSignIn = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: window.onGoogleCredential,
          context: 'signup',
          ux_mode: 'popup',
          auto_prompt: false
        })

        window.google.accounts.id.renderButton(
          document.getElementById('google-signin-button'),
          {
            type: 'standard',
            size: 'large',
            theme: 'outline',
            text: 'signup_with',
            shape: 'rect',
            logo_alignment: 'left'
          }
        )
      }
    }

    // Verifica se o script já foi carregado
    if (window.google) {
      initializeGoogleSignIn()
    } else {
      // Aguarda o script carregar
      const checkGoogle = setInterval(() => {
        if (window.google) {
          clearInterval(checkGoogle)
          initializeGoogleSignIn()
        }
      }, 100)

      return () => clearInterval(checkGoogle)
    }

    return () => {
      delete window.onGoogleCredential
    }
  }, [clientId, onSuccess])

  return <div id="google-signin-button" className="mb-4" />
}