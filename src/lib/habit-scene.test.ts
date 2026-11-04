import { habitSceneId } from '@/lib/habit-scene';

function assertEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: esperado ${String(expected)}, obtido ${String(actual)}`);
  }
}

assertEqual(habitSceneId('Jiu-Jitsu'), 'kimono', 'jiu-jitsu');
assertEqual(habitSceneId('Treino de BJJ'), 'kimono', 'bjj antes de academia');
assertEqual(habitSceneId('Almoçar'), 'meal', 'almoço');
assertEqual(habitSceneId('Ler um livro'), 'book', 'leitura');
assertEqual(habitSceneId('Academia'), 'dumbbell', 'academia');
assertEqual(habitSceneId('Correr no parque'), 'run', 'corrida');
assertEqual(habitSceneId('Meditar'), 'meditate', 'meditação');
assertEqual(habitSceneId('Estudar inglês'), 'study', 'estudo');
assertEqual(habitSceneId('Dormir'), 'bed', 'sono');
assertEqual(habitSceneId('Beber água'), 'water', 'água');
assertEqual(habitSceneId('Escovar os dentes'), 'teeth', 'escova');
assertEqual(habitSceneId('Tomar um café'), 'coffee', 'café');
assertEqual(habitSceneId('Tomar um banho'), 'shower', 'banho');
assertEqual(habitSceneId('Inventar um código'), 'fallback', 'hábito desconhecido');
assertEqual(habitSceneId(''), 'fallback', 'nome vazio');

console.log('habit-scene-ok');
