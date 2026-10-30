export type HandleIssue = 'empty' | 'short' | 'long' | 'charset' | 'edge' | 'reserved';

const reservedHandles = new Set([
  'admin',
  'administrador',
  'ajuda',
  'api',
  'help',
  'moderador',
  'moderator',
  'null',
  'oficial',
  'official',
  'root',
  'sistema',
  'staff',
  'suporte',
  'support',
  'system',
  'undefined',
  'utime',
]);

const handlePattern = /^[a-z0-9](?:[a-z0-9._]{1,18}[a-z0-9])$/;

export function normalizeHandle(raw: string) {
  return raw.trim().replace(/^@+/, '').toLowerCase();
}

export function handleIssue(raw: string): HandleIssue | null {
  const value = normalizeHandle(raw);
  if (!value) {
    return 'empty';
  }
  if (value.length < 3) {
    return 'short';
  }
  if (value.length > 20) {
    return 'long';
  }
  if (!/^[a-z0-9._]+$/.test(value)) {
    return 'charset';
  }
  if (!handlePattern.test(value)) {
    return 'edge';
  }
  if (reservedHandles.has(value)) {
    return 'reserved';
  }
  return null;
}

export function handleIssueMessage(issue: HandleIssue | null) {
  if (issue === 'empty') {
    return 'Informe um nome de usuário.';
  }
  if (issue === 'short' || issue === 'long') {
    return 'Use entre 3 e 20 caracteres.';
  }
  if (issue === 'charset') {
    return 'Use apenas letras, números, ponto ou underline, sem espaços.';
  }
  if (issue === 'edge') {
    return 'Comece e termine com letra ou número.';
  }
  if (issue === 'reserved') {
    return 'Este nome de usuário não está disponível.';
  }
  return '';
}
