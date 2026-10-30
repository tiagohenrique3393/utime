import { exactFriendLookup } from '@/lib/friend-lookup';

function assertEqual<T>(actual: T, expected: T, label: string) {
  const left = JSON.stringify(actual);
  const right = JSON.stringify(expected);
  if (left !== right) {
    throw new Error(`${label}: esperado ${right}, obtido ${left}`);
  }
}

assertEqual(exactFriendLookup('T'), { kind: 'invalid' }, 'letra isolada');
assertEqual(exactFriendLookup('Thiago'), { kind: 'invalid' }, 'nome sem arroba');
assertEqual(exactFriendLookup('tiago'), { kind: 'invalid' }, 'identificador sem arroba');
assertEqual(exactFriendLookup('@tiagohenrique'), { kind: 'handle', value: 'tiagohenrique' }, '@ completo');
assertEqual(exactFriendLookup('@TiagoHenrique'), { kind: 'handle', value: 'tiagohenrique' }, 'caixa do @');
assertEqual(exactFriendLookup('tiago@exemplo.com'), { kind: 'email', value: 'tiago@exemplo.com' }, 'e-mail completo');
assertEqual(exactFriendLookup('Tiago@Exemplo.com'), { kind: 'email', value: 'tiago@exemplo.com' }, 'caixa do e-mail');
assertEqual(exactFriendLookup('tiago@exemplo'), { kind: 'invalid' }, 'e-mail incompleto');
assertEqual(exactFriendLookup('tiago souza'), { kind: 'invalid' }, 'nome com espaço');

console.log('friend-lookup ok');
