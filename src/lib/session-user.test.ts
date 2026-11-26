import { getSessionUserId, setSessionUserId, subscribeSessionUser } from '@/lib/session-user';

function assertEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: esperado ${String(expected)}, obtido ${String(actual)}`);
  }
}

setSessionUserId(null);
assertEqual(getSessionUserId(), null, 'inicia vazio');

let ticks = 0;
const stop = subscribeSessionUser(() => {
  ticks += 1;
});

setSessionUserId('user-a');
assertEqual(getSessionUserId(), 'user-a', 'define sessão');
assertEqual(ticks, 1, 'notifica entrada');

setSessionUserId('user-a');
assertEqual(ticks, 1, 'ignora repetição');

setSessionUserId('user-b');
assertEqual(getSessionUserId(), 'user-b', 'troca sessão');
assertEqual(ticks, 2, 'notifica troca');

setSessionUserId(null);
assertEqual(getSessionUserId(), null, 'sai da sessão');
assertEqual(ticks, 3, 'notifica saída');

stop();
setSessionUserId('user-c');
assertEqual(ticks, 3, 'inscrito removido');
setSessionUserId(null);

console.log('session-user ok');
