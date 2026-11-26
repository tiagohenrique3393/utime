const SAFE_RETURNS = new Set([
  '/ranking',
  '/desafios',
  '/progresso',
  '/perfil',
  '/circulo-amigos',
  '/circulo-conquistas',
  '/assinatura',
  '/inicio',
]);

export function sanitizePremiumReturn(raw: string | string[] | undefined) {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) {
    return '/perfil';
  }
  const path = value.split('?')[0].split('#')[0];
  if (SAFE_RETURNS.has(path)) {
    return path;
  }
  return '/perfil';
}

export function premiumPath(returnTo: string) {
  const safe = sanitizePremiumReturn(returnTo);
  return `/premium?voltar=${encodeURIComponent(safe)}`;
}
