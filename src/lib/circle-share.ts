import { Platform } from 'react-native';

type ShareRow = { position: number; name: string; score: string; podiums?: number; firsts?: number };

const planetModule = require('@/assets/hoje-planet.png');

function imageUri(mod: unknown) {
  if (typeof mod === 'string') {
    return mod;
  }
  if (mod && typeof mod === 'object') {
    const record = mod as { uri?: unknown; default?: unknown };
    if (typeof record.uri === 'string') {
      return record.uri;
    }
    if (typeof record.default === 'string') {
      return record.default;
    }
  }
  return '';
}

function trophy(context: CanvasRenderingContext2D, x: number, y: number, s: number) {
  const color = context.fillStyle;
  context.save();
  context.strokeStyle = color;
  context.lineWidth = Math.max(2, s * 0.12);
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.beginPath();
  context.moveTo(x - s * 0.32, y - s * 0.46);
  context.lineTo(x + s * 0.32, y - s * 0.46);
  context.lineTo(x + s * 0.22, y);
  context.quadraticCurveTo(x, y + s * 0.2, x - s * 0.22, y);
  context.closePath();
  context.stroke();
  context.beginPath();
  context.arc(x - s * 0.36, y - s * 0.26, s * 0.14, -Math.PI / 2, Math.PI / 2, true);
  context.stroke();
  context.beginPath();
  context.arc(x + s * 0.36, y - s * 0.26, s * 0.14, Math.PI / 2, -Math.PI / 2, true);
  context.stroke();
  context.beginPath();
  context.moveTo(x, y + s * 0.14);
  context.lineTo(x, y + s * 0.36);
  context.moveTo(x - s * 0.24, y + s * 0.4);
  context.lineTo(x + s * 0.24, y + s * 0.4);
  context.stroke();
  context.restore();
}

function paint(context: CanvasRenderingContext2D, width: number, height: number, title: string, rows: ShareRow[], planet: CanvasImageSource | null) {
  context.fillStyle = '#050505';
  context.fillRect(0, 0, width, height);
  if (planet) {
    context.save();
    context.beginPath();
    context.rect(0, 0, width, 560);
    context.clip();
    context.drawImage(planet, 280, -40, 920, 560);
    context.restore();
  }
  const veil = context.createLinearGradient(0, 0, 0, 560);
  veil.addColorStop(0, 'rgba(5,5,5,0.12)');
  veil.addColorStop(0.42, 'rgba(5,5,5,0.38)');
  veil.addColorStop(1, '#050505');
  context.fillStyle = veil;
  context.fillRect(0, 0, width, 560);
  const glow = context.createRadialGradient(900, 80, 10, 860, 160, 420);
  glow.addColorStop(0, 'rgba(232, 200, 142, 0.42)');
  glow.addColorStop(1, 'rgba(5, 5, 5, 0)');
  context.fillStyle = glow;
  context.fillRect(0, 0, width, 420);
  context.strokeStyle = 'rgba(214, 181, 122, 0.4)';
  context.lineWidth = 2;
  context.strokeRect(48, 48, width - 96, height - 96);
  context.fillStyle = '#F5F2ED';
  context.font = '600 28px Barlow Semi Condensed, sans-serif';
  context.fillText('UTIME', 96, 150);
  context.font = '600 84px Barlow Semi Condensed, sans-serif';
  context.fillText('RANKING', 96, 248);
  context.fillStyle = '#E8C88E';
  context.font = '500 26px Barlow Semi Condensed, sans-serif';
  context.fillText('DISCIPLINA CONECTA PESSOAS', 96, 298);
  context.fillStyle = '#F5F2ED';
  context.font = '500 28px Manrope, sans-serif';
  context.fillText(title, 96, 368);

  const byPlace = (place: number) => rows.find((row) => row.position === place);
  const second = byPlace(2);
  const first = byPlace(1);
  const third = byPlace(3);
  const podium = [second, first, third].filter((row): row is ShareRow => Boolean(row));
  let listTop = 430;
  if (podium.length > 0) {
    const slots = [
      { row: second, x: 96, w: 270, h: 280 },
      { row: first, x: 390, w: 300, h: 340 },
      { row: third, x: 714, w: 270, h: 280 },
    ];
    slots.forEach((slot) => {
      if (!slot.row) {
        return;
      }
      const top = 760 - slot.h;
      context.strokeStyle = slot.row.position === 1 ? 'rgba(232, 200, 142, 0.9)' : 'rgba(214, 181, 122, 0.35)';
      context.lineWidth = slot.row.position === 1 ? 3 : 2;
      context.strokeRect(slot.x, top, slot.w, slot.h);
      context.fillStyle = '#E8C88E';
      context.font = '600 36px Barlow Semi Condensed, sans-serif';
      context.fillText(`${slot.row.position}º`, slot.x + 24, top + 56);
      context.fillStyle = '#F5F2ED';
      context.font = '600 28px Barlow Semi Condensed, sans-serif';
      context.fillText(slot.row.name.slice(0, 16).toUpperCase(), slot.x + 24, top + 150);
      context.fillStyle = '#E8C88E';
      context.font = '600 32px Manrope, sans-serif';
      context.fillText(`${slot.row.score} PTS`, slot.x + 24, top + 200);
      if ((slot.row.podiums ?? 0) > 0) {
        context.fillStyle = '#E8C88E';
        trophy(context, slot.x + 36, top + 246, 22);
        context.font = '500 22px Manrope, sans-serif';
        context.fillText(String(slot.row.podiums), slot.x + 64, top + 254);
      }
    });
    listTop = 820;
  }

  const listed = rows.filter((row) => podium.length === 0 || row.position > 3);
  const available = 1760 - listTop;
  const rowHeight = Math.max(48, Math.min(72, listed.length === 0 ? 72 : Math.floor(available / listed.length)));
  listed.forEach((row, index) => {
    const top = listTop + index * rowHeight;
    if (top > 1760) {
      return;
    }
    context.fillStyle = '#E8C88E';
    context.font = '600 26px Manrope, sans-serif';
    context.fillText(`${row.position}º`, 110, top);
    context.fillStyle = '#F5F2ED';
    context.font = '500 26px Manrope, sans-serif';
    context.fillText(row.name, 200, top);
    context.fillStyle = '#E8C88E';
    context.fillText(`${row.score}`, 700, top);
    if ((row.podiums ?? 0) > 0) {
      context.fillStyle = '#E8C88E';
      trophy(context, 900, top - 8, 18);
      context.fillStyle = '#F5F2ED';
      context.font = '500 22px Manrope, sans-serif';
      context.fillText(String(row.podiums), 922, top);
    }
  });
}

export function shareRankingImage(title: string, rows: ShareRow[]) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return false;
  }
  const width = 1080;
  const height = 1920;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    return false;
  }
  const finish = (planet: CanvasImageSource | null) => {
    paint(context, width, height, title, rows, planet);
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ranking-utime.png';
    link.click();
  };
  const uri = imageUri(planetModule);
  if (!uri) {
    finish(null);
    return true;
  }
  const image = new Image();
  image.onload = () => finish(image);
  image.onerror = () => finish(null);
  image.src = uri;
  return true;
}
