import { useState, useEffect } from 'react';

const WEB_CLIENT_ID = '437555637556-9a5m7mhaqqorfvp03r4eqbsdjvbspgqv.apps.googleusercontent.com';

export class GoogleAuthError extends Error {
  constructor(
    public readonly code: 'CANCELLED' | 'IN_PROGRESS' | 'NO_PLAY_SERVICES' | 'NO_TOKEN' | 'GIS_NOT_LOADED' | 'UNKNOWN',
    message: string,
  ) {
    super(message);
    this.name = 'GoogleAuthError';
  }
}

function generateNonce(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function useGoogleAuth() {
  const [pendingIdToken, setPendingIdToken] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || hash.length < 2) return;
    const params = new URLSearchParams(hash.substring(1));
    const idToken = params.get('id_token');
    if (idToken) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      setPendingIdToken(idToken);
    }
  }, []);

  const signIn = (): Promise<string> => {
    const nonce = generateNonce();
    const params = new URLSearchParams({
      client_id: WEB_CLIENT_ID,
      redirect_uri: window.location.origin,
      response_type: 'id_token',
      scope: 'openid email profile',
      nonce,
      prompt: 'select_account',
    });
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    return new Promise(() => {});
  };

  const clearPendingToken = () => setPendingIdToken(null);

  return { signIn, pendingIdToken, clearPendingToken };
}
