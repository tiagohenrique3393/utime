import {
  avatarFolderAllowed,
  canContinueSurvey,
  clipComment,
  COMMENT_LIMIT,
  accessTokenIsFresh,
  deletionFailureMessage,
  deletionMessages,
  deletionOutcome,
  exitReasons,
  isRecentSignIn,
  localKeysForAccount,
  ownAvatarObjectPaths,
  phraseMatches,
  planOwnAvatarRemoval,
  reauthReturnIsFresh,
  sanitizeExitComment,
  surveyPayload,
} from '@/lib/account-deletion';

function assertEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: esperado ${String(expected)}, obtido ${String(actual)}`);
  }
}

assertEqual(exitReasons[0]?.id, 'prefer_not', 'primeiro motivo');
assertEqual(exitReasons.length, 7, 'quantidade de motivos');
assertEqual(exitReasons[6]?.id, 'other', 'ultimo motivo');
assertEqual(canContinueSurvey(null, ''), true, 'avanca sem resposta');
assertEqual(canContinueSurvey('prefer_not', ''), true, 'prefere nao informar');
assertEqual(canContinueSurvey('other', ''), true, 'outro vazio');

const long = 'á'.repeat(COMMENT_LIMIT + 40);
assertEqual(clipComment(long).length, COMMENT_LIMIT, 'limite de caracteres');
assertEqual(sanitizeExitComment('   '), null, 'comentario vazio');
assertEqual(sanitizeExitComment('Quero sair porque a rotina não encaixou.'), 'Quero sair porque a rotina não encaixou.', 'comentario livre');
assertEqual(sanitizeExitComment('Meu e-mail é pessoa@exemplo.com e meu fone é +55 11 98888-7777.'), 'Meu e-mail é [removido] e meu fone é [removido].', 'remove contato');

const skipped = surveyPayload(null, 'não deve ir');
assertEqual(skipped.reason, null, 'sem categoria');
assertEqual(skipped.note, null, 'sem comentario quando nao escolhe');
const other = surveyPayload('other', 'pessoa@exemplo.com');
assertEqual(other.reason, 'other', 'categoria outro');
assertEqual(other.note, '[removido]', 'comentario reduzido');
assertEqual(surveyPayload('technical', 'pessoa@exemplo.com').note, null, 'comentario so no outro');
assertEqual(other.survey_version, '1', 'versao da pesquisa');

assertEqual(phraseMatches(' excluir '), true, 'frase');
assertEqual(phraseMatches('EXCLUA'), false, 'frase diferente');
assertEqual(isRecentSignIn(new Date(1_000).toISOString(), 1_000 + 60_000), true, 'login recente');
assertEqual(isRecentSignIn(new Date(1_000).toISOString(), 1_000 + 6 * 60_000), false, 'login antigo');
assertEqual(reauthReturnIsFresh(null, 10), false, 'retorno ausente');
assertEqual(reauthReturnIsFresh('1000', 1000 + 60_000), true, 'retorno fresco');
assertEqual(reauthReturnIsFresh('1000', 1000 + 11 * 60_000), false, 'retorno expirado');

assertEqual(deletionOutcome(null), 'deleted', 'sem erro');
assertEqual(deletionOutcome({ code: 'P0002', message: 'account missing' }), 'deleted', 'ja excluida');
assertEqual(deletionOutcome({ code: 'PGRST202', message: 'Could not find the function public.delete_own_account' }), 'unavailable', 'funcao ausente');
assertEqual(deletionOutcome({ code: '28000', message: 'auth required' }), 'denied', 'sem sessao');
assertEqual(deletionOutcome({ code: 'P0001', message: 'account delete failed' }), 'failed', 'falha parcial');
assertEqual(deletionOutcome({ code: 'P0001', message: 'avatar files remain' }), 'failed', 'foto restante');
assertEqual(deletionOutcome({ code: 'P0001', message: 'account delete blocked' }), 'failed', 'vinculo restante');
assertEqual(deletionFailureMessage('failed'), deletionMessages.unknown, 'falha sem afirmar que nada mudou');
assertEqual(deletionFailureMessage('failed').includes('Nada foi apagado'), false, 'falha nao afirma que nada foi apagado');
assertEqual(deletionMessages.partialRemoval.includes('incompleta'), true, 'remocao parcial');
assertEqual(deletionMessages.afterRemoval.includes('fotos foram removidas'), true, 'falha depois das fotos');
assertEqual(deletionMessages.beforeRemoval.includes('Nenhum arquivo foi removido'), true, 'falha antes da remocao');

function tokenWithIat(iatSeconds: number) {
  const payload = btoa(JSON.stringify({ iat: iatSeconds })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  return `aaa.${payload}.bbb`;
}

const issuedAt = 1_700_000_000;
assertEqual(accessTokenIsFresh(tokenWithIat(issuedAt), issuedAt * 1000 + 60_000), true, 'jwt recente');
assertEqual(accessTokenIsFresh(tokenWithIat(issuedAt), issuedAt * 1000 + 11 * 60_000), false, 'jwt acima de 10 minutos');
assertEqual(accessTokenIsFresh('invalido', issuedAt * 1000), false, 'jwt ilegivel');

const mine = localKeysForAccount('user-1', [
  'youtime.profile.user-1',
  'youtime.tasks.user-1',
  'youtime.journey.user-1',
  'youtime.pillar-insights.user-1',
  'utime-day-celebration:user-1:2026-10-21',
  'youtime.profile.user-2',
  'utime-day-celebration:user-2:2026-10-21',
  'youtime.preview.journey',
]);
assertEqual(mine.length, 5, 'so as chaves da propria conta');
assertEqual(mine.includes('youtime.profile.user-2'), false, 'nao apaga outra conta');

const me = '11111111-1111-4111-8111-111111111111';
const otherUser = '22222222-2222-4222-8222-222222222222';
const file = '33333333-3333-4333-8333-333333333333.webp';
const mixed = [file, `../${otherUser}/${file}`, `${otherUser}/${file}`, '', 'nota.txt'];
const blocked = planOwnAvatarRemoval(me, mixed);
assertEqual(blocked.blocked, true, 'caminho inseguro bloqueia o plano');
assertEqual(blocked.paths.length, 0, 'plano inseguro nao remove parte da lista');
assertEqual(ownAvatarObjectPaths(me, mixed).length, 0, 'lista mista nao gera caminho');

const legacy = planOwnAvatarRemoval(me, [file, 'nota.txt', `antigo/${file}`]);
assertEqual(legacy.blocked, false, 'arquivo antigo entra no plano');
assertEqual(legacy.paths.length, 3, 'tres caminhos da propria pasta');
assertEqual(legacy.paths[0], `${me}/${file}`, 'foto padronizada');
assertEqual(legacy.paths[1], `${me}/nota.txt`, 'arquivo antigo');
assertEqual(legacy.paths[2], `${me}/antigo/${file}`, 'subpasta antiga');
const onlyImages = ownAvatarObjectPaths(me, [file, 'nota.txt']);
assertEqual(onlyImages.length, 1, 'filtro de imagem continua');
assertEqual(onlyImages[0], `${me}/${file}`, 'somente a imagem padronizada');
assertEqual(planOwnAvatarRemoval(otherUser, [file]).paths.includes(`${me}/${file}`), false, 'nao monta foto de outra conta');
assertEqual(planOwnAvatarRemoval('', [file]).blocked, true, 'sem usuario a lista fica bloqueada');
assertEqual(planOwnAvatarRemoval('', []).blocked, false, 'sem usuario e sem arquivo');
assertEqual(ownAvatarObjectPaths('', [file]).length, 0, 'sem usuario nao ha arquivo');
assertEqual(avatarFolderAllowed(me, me, 0), true, 'pasta raiz da propria conta');
assertEqual(avatarFolderAllowed(me, `${me}/antigo`, 1), true, 'subpasta da propria conta');
assertEqual(avatarFolderAllowed(me, otherUser, 0), false, 'nao lista outra conta');
assertEqual(avatarFolderAllowed(me, '', 0), false, 'prefixo vazio');
assertEqual(avatarFolderAllowed('', me, 0), false, 'usuario vazio');
assertEqual(avatarFolderAllowed(me, me, 5), false, 'profundidade acima do limite');
