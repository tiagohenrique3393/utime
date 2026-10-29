import { zonedHour } from '@/lib/habit-day';

export function greetingParts(date: Date, name: string) {
  const hour = zonedHour(date);
  const hello = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const first = name.trim().split(/\s+/)[0] ?? '';
  return { hello, name: first };
}

export function homeDateParts(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  if (!year || !month || !day) {
    return { dayMonth: '', weekday: '' };
  }
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long', timeZone: 'UTC' }).format(date);
  const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', timeZone: 'UTC' }).format(date);
  return {
    dayMonth: `${day} DE ${monthName}`.toLocaleUpperCase('pt-BR'),
    weekday: weekday.toLocaleUpperCase('pt-BR'),
  };
}
