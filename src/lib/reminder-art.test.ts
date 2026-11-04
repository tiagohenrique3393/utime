import { reminderArt } from '@/lib/reminder-art';

function assertEqual(actual: string, expected: string, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: esperado ${expected}, obtido ${actual}`);
  }
}

assertEqual(String(reminderArt('corpo', 'metime')), 'mantime', 'corpo man time');
assertEqual(String(reminderArt('corpo', 'womantime')), 'womantime', 'corpo woman time');
assertEqual(String(reminderArt('corpo', null)), 'null', 'corpo sem modalidade');
assertEqual(String(reminderArt('corpo', 'email@utime.app.br')), 'null', 'nao deduz pelo texto');
assertEqual(String(reminderArt('mente', 'womantime')), 'mente', 'mente ignora a modalidade');
assertEqual(String(reminderArt('espirito', null)), 'espirito', 'espirito sem modalidade');
assertEqual(String(reminderArt('saude', 'metime')), 'null', 'pilar desconhecido');
assertEqual(String(reminderArt(null, 'metime')), 'null', 'pilar ausente');
assertEqual(String(reminderArt('mente', 'metime')), 'mente', 'mente man time');

console.log('reminder-art-ok');
