import { Platform } from 'react-native';

export function shareRankingImage(title: string, rows: { position: number; name: string; score: number }[]) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return false;
  }
  const width = 900;
  const height = 180 + rows.length * 54;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = Math.max(height, 320);
  const context = canvas.getContext('2d');
  if (!context) {
    return false;
  }
  context.fillStyle = '#050505';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = 'rgba(232, 201, 155, 0.45)';
  context.strokeRect(24, 24, canvas.width - 48, canvas.height - 48);
  context.fillStyle = '#F3EFE8';
  context.font = '600 42px Barlow Semi Condensed, sans-serif';
  context.fillText(title, 56, 92);
  context.fillStyle = '#E8C99B';
  context.font = '400 16px Manrope, sans-serif';
  context.fillText('DISCIPLINA CONECTA PESSOAS', 56, 122);
  rows.forEach((row, index) => {
    const top = 180 + index * 54;
    context.fillStyle = '#F3EFE8';
    context.font = '500 22px Manrope, sans-serif';
    context.fillText(`${row.position}º  ${row.name}`, 56, top);
    context.fillStyle = '#E8C99B';
    context.fillText(`${row.score} PTS`, 700, top);
  });
  const url = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.href = url;
  link.download = 'ranking-utime.png';
  link.click();
  return true;
}
