import { circleFailureMessage, circleUnavailable } from '@/lib/circle-errors';

function assertEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: esperado ${String(expected)}, obtido ${String(actual)}`);
  }
}

assertEqual(circleUnavailable({ message: 'Could not find the function public.circle_state' }), true, 'função ausente');
assertEqual(circleUnavailable({ message: 'permission denied for function circle_state' }), false, 'permissão não desliga o Círculo');
assertEqual(
  circleFailureMessage({ message: 'there is no unique or exclusion constraint matching the ON CONFLICT specification' }, 'friend'),
  'Não foi possível concluir a amizade. Execute o SQL complementar no Supabase.',
  'aceitar sem chave',
);
assertEqual(circleFailureMessage({ message: 'friend request missing' }, 'friend'), 'Essa solicitação não está mais disponível.', 'pedido ausente');
assertEqual(circleFailureMessage({ message: 'self lookup' }, 'friends'), 'Não é possível adicionar a própria conta.', 'busca da própria conta');
assertEqual(circleFailureMessage({ message: 'canceling statement due to statement timeout' }, 'board'), 'A conexão falhou. Tente de novo.', 'timeout do ranking');
assertEqual(circleFailureMessage({ message: 'invalid period' }, 'board'), 'Não foi possível abrir este período do ranking.', 'período');
assertEqual(circleFailureMessage({ message: 'permission denied for table circle_friends' }, 'friends'), 'Não foi possível carregar os amigos.', 'amigos isolados');
assertEqual(circleFailureMessage({ message: 'permission denied for table circle_results' }, 'board'), 'Não foi possível carregar o ranking.', 'ranking isolado');

console.log('circle-errors ok');
