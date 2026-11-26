import { premiumPath, sanitizePremiumReturn } from '@/lib/premium-return';

function assertEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: esperado ${String(expected)}, obtido ${String(actual)}`);
  }
}

function assertMatch(value: string, pattern: RegExp, label: string) {
  if (!pattern.test(value)) {
    throw new Error(`${label}: "${value}" não casa com ${pattern}`);
  }
}

assertEqual(sanitizePremiumReturn('/ranking'), '/ranking', 'ranking');
assertEqual(sanitizePremiumReturn('/desafios'), '/desafios', 'desafios');
assertEqual(sanitizePremiumReturn('/progresso'), '/progresso', 'progresso');
assertEqual(sanitizePremiumReturn('/perfil'), '/perfil', 'perfil');
assertEqual(sanitizePremiumReturn('/evil'), '/perfil', 'rota inválida');
assertEqual(sanitizePremiumReturn('/ranking?x=1'), '/ranking', 'query');
assertEqual(sanitizePremiumReturn(['/desafios', '/outro']), '/desafios', 'array');
assertEqual(sanitizePremiumReturn(undefined), '/perfil', 'ausente');

const href = premiumPath('/ranking');
assertMatch(href, /\/premium\?voltar=/, 'href premium');
assertMatch(href, /ranking/, 'voltar ranking');

console.log('premium-nav ok');
