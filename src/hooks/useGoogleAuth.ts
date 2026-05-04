import { GoogleSignin, statusCodes, isErrorWithCode } from '@react-native-google-signin/google-signin';

GoogleSignin.configure({
  webClientId: '437555637556-9a5m7mhaqqorfvp03r4eqbsdjvbspgqv.apps.googleusercontent.com',
});

export class GoogleAuthError extends Error {
  constructor(
    public readonly code: 'CANCELLED' | 'IN_PROGRESS' | 'NO_PLAY_SERVICES' | 'NO_TOKEN' | 'GIS_NOT_LOADED' | 'UNKNOWN',
    message: string,
  ) {
    super(message);
    this.name = 'GoogleAuthError';
  }
}

export function useGoogleAuth() {
  const signIn = async (): Promise<string> => {
    try {
      await GoogleSignin.hasPlayServices();
      await GoogleSignin.signOut();
      const response = await GoogleSignin.signIn();
      const idToken = response.data?.idToken;
      if (!idToken) throw new GoogleAuthError('NO_TOKEN', 'No se recibió token de Google.');
      return idToken;
    } catch (error: any) {
      if (error instanceof GoogleAuthError) throw error;
      if (isErrorWithCode(error)) {
        if (error.code === statusCodes.SIGN_IN_CANCELLED)
          throw new GoogleAuthError('CANCELLED', 'Cancelado.');
        if (error.code === statusCodes.IN_PROGRESS)
          throw new GoogleAuthError('IN_PROGRESS', 'En progreso.');
        if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE)
          throw new GoogleAuthError('NO_PLAY_SERVICES', 'Google Play Services no disponible.');
      }
      throw new GoogleAuthError('UNKNOWN', error?.message ?? 'Error desconocido.');
    }
  };

  return { signIn, pendingIdToken: null as string | null, clearPendingToken: () => {} };
}
