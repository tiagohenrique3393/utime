import { supabase } from '../../utils/supabase';
import { getSessionUserId } from '@/lib/accounts';
import {
  AVATAR_OUTPUT_MAX_BYTES,
  AVATAR_SIDE,
  avatarFailureMessage,
  avatarFileError,
  buildAvatarPath,
  centerCrop,
  getOwnAvatarPath,
  isAvatarPath,
  isOwnAvatarPath,
  ownAvatarGuard,
  setOwnAvatarPath,
  type AvatarFile,
} from '@/lib/avatar';

export function publicAvatarUrl(path: string | null | undefined) {
  if (!path || !isAvatarPath(path)) {
    return null;
  }
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return data.publicUrl || null;
}

export function ownAvatarUrl() {
  return publicAvatarUrl(getOwnAvatarPath());
}

export async function loadOwnAvatar(userId: string) {
  const { data, error } = await supabase.from('profiles').select('avatar_path').eq('user_id', userId).maybeSingle();
  if (error || getSessionUserId() !== userId) {
    return;
  }
  const path = typeof data?.avatar_path === 'string' ? data.avatar_path : null;
  setOwnAvatarPath(path && isOwnAvatarPath(userId, path) ? path : null);
}

function blobFrom(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

export async function prepareAvatarFile(file: File) {
  const problem = avatarFileError(file satisfies AvatarFile);
  if (problem) {
    throw new Error(problem);
  }
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('Escolha uma imagem JPEG, PNG ou WebP.');
  }
  try {
    const crop = centerCrop(bitmap.width, bitmap.height);
    if (crop.side <= 0) {
      throw new Error('Escolha uma imagem JPEG, PNG ou WebP.');
    }
    const canvas = document.createElement('canvas');
    canvas.width = AVATAR_SIDE;
    canvas.height = AVATAR_SIDE;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Não foi possível preparar a foto.');
    }
    context.drawImage(bitmap, crop.sx, crop.sy, crop.side, crop.side, 0, 0, AVATAR_SIDE, AVATAR_SIDE);
    const webp = await blobFrom(canvas, 'image/webp', 0.82);
    if (webp && webp.type === 'image/webp' && webp.size > 0 && webp.size <= AVATAR_OUTPUT_MAX_BYTES) {
      return { blob: webp, contentType: 'image/webp', extension: 'webp' as const };
    }
    const jpeg = await blobFrom(canvas, 'image/jpeg', 0.82);
    if (!jpeg || jpeg.size <= 0 || jpeg.size > AVATAR_OUTPUT_MAX_BYTES) {
      throw new Error('A foto ficou grande demais depois do preparo. Escolha outra imagem.');
    }
    return { blob: jpeg, contentType: 'image/jpeg', extension: 'jpeg' as const };
  } finally {
    bitmap.close();
  }
}

async function removeStored(userId: string, path: string | null) {
  if (!path || !isOwnAvatarPath(userId, path)) {
    return;
  }
  await supabase.storage.from('avatars').remove([path]);
}

export async function saveOwnAvatar(file: File) {
  const userId = getSessionUserId();
  const denied = ownAvatarGuard(userId ?? '', userId);
  if (denied || !userId) {
    return denied ?? 'Sua sessão expirou. Entre novamente para salvar a foto.';
  }
  const previous = getOwnAvatarPath();
  try {
    const prepared = await prepareAvatarFile(file);
    const path = buildAvatarPath(userId, prepared.extension, crypto.randomUUID());
    const uploaded = await supabase.storage.from('avatars').upload(path, prepared.blob, {
      contentType: prepared.contentType,
      cacheControl: '31536000',
      upsert: false,
    });
    if (uploaded.error) {
      return avatarFailureMessage(uploaded.error);
    }
    const saved = await supabase.from('profiles').update({ avatar_path: path }).eq('user_id', userId);
    if (saved.error || getSessionUserId() !== userId) {
      await removeStored(userId, path);
      return saved.error ? avatarFailureMessage(saved.error) : 'Sua sessão expirou. Entre novamente para salvar a foto.';
    }
    setOwnAvatarPath(path);
    await removeStored(userId, previous);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : 'Não foi possível salvar a foto.';
  }
}

export async function removeOwnAvatar() {
  const userId = getSessionUserId();
  const denied = ownAvatarGuard(userId ?? '', userId);
  if (denied || !userId) {
    return denied ?? 'Sua sessão expirou. Entre novamente para salvar a foto.';
  }
  const previous = getOwnAvatarPath();
  const saved = await supabase.from('profiles').update({ avatar_path: null }).eq('user_id', userId);
  if (saved.error) {
    return avatarFailureMessage(saved.error);
  }
  if (getSessionUserId() !== userId) {
    return 'Sua sessão expirou. Entre novamente para salvar a foto.';
  }
  setOwnAvatarPath(null);
  await removeStored(userId, previous);
  return null;
}
