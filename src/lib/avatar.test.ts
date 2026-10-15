import {
  AVATAR_MAX_BYTES,
  avatarFailureMessage,
  avatarFileError,
  buildAvatarPath,
  centerCrop,
  isOwnAvatarPath,
  ownAvatarGuard,
  withAvatars,
} from '@/lib/avatar';

function assertEqual<T>(actual: T, expected: T) {
  if (actual !== expected) {
    throw new Error(`Esperado ${String(expected)}, obtido ${String(actual)}`);
  }
}

const userId = '11111111-1111-4111-8111-111111111111';
const otherId = '22222222-2222-4222-8222-222222222222';
const fileId = '33333333-3333-4333-8333-333333333333';

assertEqual(avatarFileError({ size: 1200, type: 'image/jpeg' }), null);
assertEqual(avatarFileError({ size: 1200, type: 'image/png' }), null);
assertEqual(avatarFileError({ size: 1200, type: 'image/webp' }), null);
assertEqual(avatarFileError({ size: 1200, type: 'image/gif' }), 'Escolha uma imagem JPEG, PNG ou WebP.');
assertEqual(avatarFileError({ size: AVATAR_MAX_BYTES + 1, type: 'image/png' }), 'A imagem precisa ter até 5 MB.');
assertEqual(avatarFileError({ size: 0, type: 'image/jpeg' }), 'A imagem precisa ter até 5 MB.');

const wide = centerCrop(400, 200);
assertEqual(wide.side, 200);
assertEqual(wide.sx, 100);
assertEqual(wide.sy, 0);
const tall = centerCrop(100, 260);
assertEqual(tall.side, 100);
assertEqual(tall.sx, 0);
assertEqual(tall.sy, 80);

const path = buildAvatarPath(userId, 'webp', fileId);
assertEqual(path, `${userId}/${fileId}.webp`);
assertEqual(isOwnAvatarPath(userId, path), true);
assertEqual(isOwnAvatarPath(otherId, path), false);
assertEqual(isOwnAvatarPath(userId, `${userId}/foto.webp`), false);
assertEqual(isOwnAvatarPath(userId, '../segredo.webp'), false);

assertEqual(ownAvatarGuard(userId, null), 'Sua sessão expirou. Entre novamente para salvar a foto.');
assertEqual(ownAvatarGuard(userId, otherId), 'Você só pode alterar a sua foto.');
assertEqual(ownAvatarGuard(userId, userId), null);

const ranked = withAvatars(
  [
    { userId, name: 'Tiago', score: 95, position: 1 },
    { userId: otherId, name: 'Ana', score: 40, position: 2 },
  ],
  new Map([[userId, path]]),
);
assertEqual(ranked[0]?.score, 95);
assertEqual(ranked[0]?.position, 1);
assertEqual(ranked[0]?.avatarPath, path);
assertEqual(ranked[1]?.score, 40);
assertEqual(ranked[1]?.avatarPath, null);
const cleared = withAvatars([{ userId, score: 95, avatarPath: path }], new Map<string, string>());
assertEqual(cleared[0]?.score, 95);
assertEqual(cleared[0]?.avatarPath, null);

assertEqual(avatarFailureMessage({ status: 401, message: 'jwt expired' }).includes('sessão expirou'), true);
assertEqual(avatarFailureMessage({ message: "Could not find the 'avatar_path' column" }).includes('armazenamento está pendente'), true);

console.log('avatar-ok');
