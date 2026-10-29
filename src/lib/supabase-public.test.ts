import { resolveSupabaseKey, resolveSupabaseUrl } from '../../utils/supabase';

function assertEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: valores diferentes`);
  }
}

function token(role: string) {
  const payload = btoa(JSON.stringify({ role })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  return `eyJhbGciOiJub25lIn0.${payload}.x`;
}

const fallback = resolveSupabaseKey([undefined, 'https://example.supabase.co', '']);
assertEqual(fallback.startsWith('sb_publishable_'), true, 'reserva publishable');
assertEqual(fallback.startsWith('sb_secret_'), false, 'reserva não é secreta');
assertEqual(resolveSupabaseKey([token('anon')]).includes('service_role'), false, 'jwt anon');

let secretRejected = false;
try {
  resolveSupabaseKey(['sb_secret_example']);
} catch (error) {
  secretRejected = error instanceof Error && error.message.includes('chave secreta');
}
assertEqual(secretRejected, true, 'rejeita sb_secret');

let serviceRejected = false;
try {
  resolveSupabaseKey([token('service_role')]);
} catch (error) {
  serviceRejected = error instanceof Error && error.message.includes('chave secreta');
}
assertEqual(serviceRejected, true, 'rejeita service_role');

const project = resolveSupabaseUrl(undefined);
assertEqual(project.startsWith('https://'), true, 'url do projeto');
assertEqual(resolveSupabaseUrl('sb_publishable_not_a_url'), project, 'chave não vira url');
assertEqual(resolveSupabaseUrl('https://crqxzqilnhghhctwnvta.supabase.co'), project, 'host antigo ignorado');
assertEqual(resolveSupabaseUrl('https://example.supabase.co/'), 'https://example.supabase.co', 'url explícita');

console.log('supabase-public-ok');
