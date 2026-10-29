export function formatHydrationAmount(ml: number) {
  const liters = Math.max(0, ml) / 1000;
  const text = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format(liters);
  return `${text} L`;
}
