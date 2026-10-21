import {
  canContinueSurvey,
  clipComment,
  COMMENT_LIMIT,
  deletionFailureMessage,
  deletionOutcome,
  exitReasons,
  isRecentSignIn,
  localKeysForAccount,
  phraseMatches,
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
assertEqual(
  deletionFailureMessage('failed'),
  'Não foi possível excluir a conta. Nada foi apagado. Tente novamente.',
  'mensagem de falha',
);
assertEqual(deletionFailureMessage('failed').includes('@'), false, 'falha sem texto livre');

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
