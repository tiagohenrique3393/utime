import { handleIssue, normalizeHandle } from '@/lib/username';

function assertEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: esperado ${String(expected)}, obtido ${String(actual)}`);
  }
}

assertEqual(normalizeHandle('  @TiagoSouza  '), 'tiagosouza', 'normaliza arroba e caixa');
assertEqual(handleIssue('tiagosouza'), null, 'nome simples');
assertEqual(handleIssue('Tiago.Souza'), null, 'ponto e caixa');
assertEqual(handleIssue('a_b'), null, 'underline');
assertEqual(handleIssue('ab'), 'short', 'curto');
assertEqual(handleIssue('a'.repeat(21)), 'long', 'longo');
assertEqual(handleIssue('tiago souza'), 'charset', 'espaço');
assertEqual(handleIssue('tiago-souza'), 'charset', 'hífen');
assertEqual(handleIssue('.tiago'), 'edge', 'ponto no início');
assertEqual(handleIssue('tiago.'), 'edge', 'ponto no fim');
assertEqual(handleIssue('_tiago'), 'edge', 'underline no início');
assertEqual(handleIssue(''), 'empty', 'vazio');
assertEqual(handleIssue('@'), 'empty', 'só arroba');
assertEqual(handleIssue('tiago@souza'), 'charset', 'arroba no meio');

console.log('username ok');
