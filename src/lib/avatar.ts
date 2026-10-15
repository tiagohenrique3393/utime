const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const pathPattern = new RegExp(`^${uuid}/${uuid}\\.(webp|jpeg|png)$`);

export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
export const AVATAR_OUTPUT_MAX_BYTES = 512 * 1024;
export const AVATAR_SIDE = 256;

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

export type AvatarFile = {
  size: number;
  type: string;
};

let ownPath: string | null = null;
let ownReady = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function subscribeOwnAvatar(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getOwnAvatarPath() {
  return ownPath;
}

export function isOwnAvatarReady() {
  return ownReady;
}

export function setOwnAvatarPath(path: string | null) {
  ownPath = path;
  ownReady = true;
  emit();
}

export function clearOwnAvatar() {
  ownPath = null;
  ownReady = false;
  emit();
}

export function isAvatarPath(path: string) {
  return pathPattern.test(path);
}

export function isOwnAvatarPath(userId: string, path: string) {
  return isAvatarPath(path) && path.startsWith(`${userId}/`);
}

export function avatarFileError(file: AvatarFile) {
  if (!allowedTypes.has(file.type)) {
    return 'Escolha uma imagem JPEG, PNG ou WebP.';
  }
  if (file.size <= 0 || file.size > AVATAR_MAX_BYTES) {
    return 'A imagem precisa ter até 5 MB.';
  }
  return null;
}

export function centerCrop(width: number, height: number) {
  const side = Math.max(0, Math.min(width, height));
  return {
    sx: Math.max(0, Math.floor((width - side) / 2)),
    sy: Math.max(0, Math.floor((height - side) / 2)),
    side,
  };
}

export function buildAvatarPath(userId: string, extension: 'webp' | 'jpeg' | 'png', fileId: string) {
  const path = `${userId}/${fileId}.${extension}`;
  if (!isOwnAvatarPath(userId, path)) {
    throw new Error('invalid avatar path');
  }
  return path;
}

export function ownAvatarGuard(userId: string, sessionUserId: string | null) {
  if (!sessionUserId) {
    return 'Sua sessão expirou. Entre novamente para salvar a foto.';
  }
  if (userId !== sessionUserId) {
    return 'Você só pode alterar a sua foto.';
  }
  return null;
}

export function withAvatars<T extends { userId: string; score?: number; avatarPath?: string | null }>(
  rows: readonly T[],
  paths: ReadonlyMap<string, string>,
) {
  return rows.map((row) => ({
    ...row,
    avatarPath: paths.get(row.userId) ?? null,
  }));
}

export function avatarObjectUrl(baseUrl: string, path: string | null | undefined) {
  if (!path || !isAvatarPath(path)) {
    return null;
  }
  return `${baseUrl.replace(/\/$/, '')}/storage/v1/object/public/avatars/${path}`;
}

export function avatarFailureMessage(error: { message?: string; status?: number; statusCode?: string } | null) {
  const text = `${error?.status ?? ''} ${error?.statusCode ?? ''} ${error?.message ?? ''}`.toLowerCase();
  if (text.includes('jwt') || text.includes('401') || text.includes('session') || text.includes('not authenticated')) {
    return 'Sua sessão expirou. Entre novamente para salvar a foto.';
  }
  if (
    text.includes('avatar_path') ||
    text.includes('column') ||
    text.includes('bucket') ||
    text.includes('not found') ||
    text.includes('schema cache') ||
    text.includes('pgrst')
  ) {
    return 'Ainda não foi possível guardar a foto. A configuração do armazenamento está pendente.';
  }
  if (text.includes('413') || text.includes('too large') || text.includes('payload')) {
    return 'A foto ficou grande demais depois do preparo. Escolha outra imagem.';
  }
  if (text.includes('invalid avatar')) {
    return 'Não foi possível usar essa foto.';
  }
  return 'Não foi possível salvar a foto.';
}
