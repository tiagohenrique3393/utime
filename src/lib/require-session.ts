import { router } from 'expo-router';
import { useEffect } from 'react';

import { getSessionUserId } from '@/lib/accounts';
import { useSessionUserId } from '@/lib/session-user';

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
  '/desafios',
  '/boas-vindas',
]);

export function isPrivatePath(pathname: string) {
  const path = pathname.split('?')[0].split('#')[0];
  if (path.startsWith('/pilar/') || path === '/consulta-dia' || path === '/circulo-amigos' || path === '/nome-usuario' || path === '/configuracoes' || path === '/perfil-publico') {
    return true;
  }
  return privatePaths.has(path);
}

export function useRequireSession() {
  const userId = useSessionUserId();
  const signedIn = userId !== null;

  useEffect(() => {
    if (!getSessionUserId()) {
      router.replace('/');
    }
  }, [userId]);

  return signedIn;
}
