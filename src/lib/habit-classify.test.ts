import { classifyHabit } from '@/lib/habit-classify';

function assertEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: esperado ${String(expected)}, obtido ${String(actual)}`);
  }
}

assertEqual(classifyHabit('Escovar os dentes').pillar, 'corpo', 'dentes');
assertEqual(classifyHabit('Tomar banho').pillar, 'corpo', 'banho');
assertEqual(classifyHabit('Musculação').pillar, 'corpo', 'musculacao');
assertEqual(classifyHabit('Caminhada').pillar, 'corpo', 'caminhada');
assertEqual(classifyHabit('Alimentação saudável').pillar, 'corpo', 'alimentacao');
assertEqual(classifyHabit('Estudar inglês').pillar, 'mente', 'ingles');
assertEqual(classifyHabit('Estudar matemática').pillar, 'mente', 'matematica');
assertEqual(classifyHabit('Ler um livro técnico').pillar, 'mente', 'tecnico');
assertEqual(classifyHabit('Planejar o dia').pillar, 'mente', 'planejar');
assertEqual(classifyHabit('Resolver exercícios de raciocínio').pillar, 'mente', 'raciocinio');
assertEqual(classifyHabit('Orar').pillar, 'espirito', 'orar');
assertEqual(classifyHabit('Meditar').pillar, 'espirito', 'meditar');
assertEqual(classifyHabit('Praticar gratidão').pillar, 'espirito', 'gratidao');
assertEqual(classifyHabit('Fazer reflexão espiritual').pillar, 'espirito', 'reflexao');
assertEqual(classifyHabit('Ler a Bíblia').pillar, 'espirito', 'biblia');
assertEqual(classifyHabit('Leitura').pillar, 'mente', 'leitura');
assertEqual(classifyHabit('Leitura').confident, false, 'leitura incerta');
assertEqual(classifyHabit('Leitura espiritual').pillar, 'espirito', 'leitura espiritual');
assertEqual(classifyHabit('Leitura espiritual').confident, true, 'leitura espiritual certa');
assertEqual(classifyHabit('Caminhar com o cachorro').pillar, 'corpo', 'cachorro');
const unknown = classifyHabit('Inventar um ritmo novo');
assertEqual(unknown.confident, false, 'desconhecido');
assertEqual(unknown.pillar, 'mente', 'desconhecido pilar');

console.log('habit-classify-ok');
