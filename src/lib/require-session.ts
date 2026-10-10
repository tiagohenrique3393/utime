import { router } from 'expo-router';
import { useEffect } from 'react';

import { getSessionUserId } from '@/lib/accounts';

const privatePaths = new Set([
  '/inicio',
  '/jornada',
  '/trinta-dias',
  '/progresso',
  '/pilares',
  '/constancia',
  '/ranking',
  '/perfil',
  '/meu-dia',
  '/personalizar-habitos',
  '/boas-vindas',
]);

export function isPrivatePath(pathname: string) {
  const path = pathname.split('?')[0].split('#')[0];
  if (path.startsWith('/pilar/') || path === '/consulta-dia' || path === '/circulo-amigos') {
    return true;
  }
  return privatePaths.has(path);
}

export function useRequireSession() {
  const signedIn = getSessionUserId() !== null;

  useEffect(() => {
    if (!getSessionUserId()) {
      router.replace('/');
    }
  }, []);

  return signedIn;
}
