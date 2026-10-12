import { Image } from 'expo-image';
import { createElement, type ReactNode } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { circlePalette as ink } from '@/components/circle-palette';
import { isPercent, pointOnAxis, shownPercent, type PillarId } from '@/lib/pillar-balance';
import { fonts } from '@/constants/theme';

const corpoMale = require('@/assets/pillars/corpo-mantime.png');
const corpoFemale = require('@/assets/pillars/corpo-womantime.png');
const menteFigure = require('@/assets/pillars/mente.png');
const espiritoFigure = require('@/assets/pillars/espirito.png');

function node(type: string, props: Record<string, unknown> | null, ...children: ReactNode[]) {
  return createElement(type, props, ...children);
}

function figureFor(id: PillarId, feminine: boolean) {
  if (id === 'corpo') {
    return feminine ? corpoFemale : corpoMale;
  }
  if (id === 'mente') {
    return menteFigure;
  }
  return espiritoFigure;
}

function Ring({ percent, size }: { percent: number | null; size: number }) {
  const active = isPercent(percent) && percent > 0;
  const clamped = active ? Math.min(100, percent) : 0;
  const stroke = Math.max(1.6, size * 0.028);
  const radius = size / 2 - stroke * 1.6;
  const center = size / 2;
  const turn = 2 * Math.PI * radius;
  const offset = turn * (1 - clamped / 100);
  const angle = -Math.PI / 2 + (clamped / 100) * Math.PI * 2;
  const tipX = center + radius * Math.cos(angle);
  const tipY = center + radius * Math.sin(angle);

  if (Platform.OS !== 'web') {
    return (
      <View
        style={[
          styles.ringFallback,
          {
            borderRadius: size / 2,
            borderColor: active ? ink.champagne : 'rgba(255,255,255,0.16)',
          },
        ]}
      />
    );
  }

  const arc = {
    cx: center,
    cy: center,
    r: radius,
    fill: 'none',
    strokeLinecap: 'round',
    strokeDasharray: `${turn} ${turn}`,
    strokeDashoffset: offset,
    transform: `rotate(-90 ${center} ${center})`,
  };

  return node(
    'svg',
    {
      width: size,
      height: size,
      viewBox: `0 0 ${size} ${size}`,
      'aria-hidden': true,
      style: { position: 'absolute', top: 0, left: 0 },
    },
    node('circle', { cx: center, cy: center, r: radius, fill: 'none', stroke: 'rgba(255,255,255,0.14)', strokeWidth: stroke * 0.7 }),
    active
      ? node('circle', { ...arc, stroke: ink.champagne, strokeWidth: stroke * 2.4, opacity: 0.28 })
      : null,
    active ? node('circle', { ...arc, stroke: ink.champagne, strokeWidth: stroke }) : null,
    active ? node('circle', { cx: tipX, cy: tipY, r: Math.max(3.2, stroke * 1.7), fill: ink.champagne }) : null,
    active ? node('circle', { cx: tipX, cy: tipY, r: Math.max(1.5, stroke * 0.7), fill: '#F7F1E6' }) : null,
  );
}

function insetPoint(from: { x: number; y: number }, to: { x: number; y: number }, inset: number) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const scale = Math.max(0, length - inset) / length;
  return { x: from.x + dx * scale, y: from.y + dy * scale };
}

function AxisLine({ x1, y1, x2, y2, color, width }: { x1: number; y1: number; x2: number; y2: number; color: string; width: number }) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: x1,
        top: y1,
        width: length,
        height: width,
        backgroundColor: color,
        transformOrigin: '0% 50%',
        transform: [{ rotate: `${angle}deg` }],
      }}
    />
  );
}

export function PillarMap({
  width,
  corpo,
  mente,
  espirito,
  feminine,
}: {
  width: number;
  corpo: number | null;
  mente: number | null;
  espirito: number | null;
  feminine: boolean;
}) {
  const values: { id: PillarId; percent: number | null }[] = [
    { id: 'corpo', percent: corpo },
    { id: 'mente', percent: mente },
    { id: 'espirito', percent: espirito },
  ];
  const ring = Math.max(74, Math.min(92, width * 0.23));
  const plotHeight = Math.round(ring * 2.85);
  const figures = [
    { x: width / 2, y: ring * 0.58 },
    { x: ring * 0.64, y: plotHeight - ring * 0.58 },
    { x: width - ring * 0.64, y: plotHeight - ring * 0.58 },
  ];
  const center = {
    x: (figures[0].x + figures[1].x + figures[2].x) / 3,
    y: (figures[0].y + figures[1].y + figures[2].y) / 3,
  };
  const vertices = figures.map((figure) => insetPoint(center, figure, ring / 2));
  const points = values.map((item, index) => pointOnAxis(center, vertices[index], item.percent));
  const moving = points.some((point, index) => {
    const vertex = vertices[index];
    return Math.hypot(point.x - vertex.x, point.y - vertex.y) > 1 && Math.hypot(point.x - center.x, point.y - center.y) > 1;
  });
  const hasArea = points.some((point) => Math.hypot(point.x - center.x, point.y - center.y) > 1.5);
  const summary = values.map((item) => `${item.id} ${shownPercent(item.percent)}`).join(', ');

  return (
    <View accessibilityLabel={`Mapa dos pilares. ${summary}`}>
      <View style={styles.topLabel}>
        <Text style={styles.name}>Corpo</Text>
        <Text style={styles.percent}>{shownPercent(corpo)}</Text>
      </View>
      <View style={[styles.plot, { height: plotHeight }]}>
        {Platform.OS === 'web'
          ? node(
              'svg',
              {
                width: '100%',
                height: '100%',
                viewBox: `0 0 ${width} ${plotHeight}`,
                'aria-hidden': true,
                style: { position: 'absolute', inset: 0 },
              },
              node('polygon', {
                points: vertices.map((point) => `${point.x},${point.y}`).join(' '),
                fill: 'none',
                stroke: 'rgba(232,200,142,0.38)',
                strokeWidth: 1.1,
              }),
              ...vertices.map((vertex, index) =>
                node('line', {
                  key: `axis-${index}`,
                  x1: center.x,
                  y1: center.y,
                  x2: vertex.x,
                  y2: vertex.y,
                  stroke: 'rgba(245,242,237,0.16)',
                  strokeWidth: 1,
                }),
              ),
              hasArea
                ? node('polygon', {
                    points: points.map((point) => `${point.x},${point.y}`).join(' '),
                    fill: moving ? 'rgba(232,200,142,0.2)' : 'rgba(232,200,142,0.16)',
                    stroke: ink.champagne,
                    strokeWidth: 1.35,
                    strokeLinejoin: 'round',
                  })
                : null,
              ...points.map((point, index) =>
                node('g', { key: `dot-${index}` },
                  node('circle', { cx: point.x, cy: point.y, r: 5.5, fill: 'rgba(232,200,142,0.28)' }),
                  node('circle', { cx: point.x, cy: point.y, r: 2.3, fill: '#F7F1E6' }),
                ),
              ),
              node('circle', { cx: center.x, cy: center.y, r: 3.2, fill: 'rgba(232,200,142,0.9)' }),
            )
          : (
            <>
              {vertices.map((vertex, index) => (
                <AxisLine
                  key={`edge-${index}`}
                  x1={vertex.x}
                  y1={vertex.y}
                  x2={vertices[(index + 1) % 3].x}
                  y2={vertices[(index + 1) % 3].y}
                  color="rgba(232,200,142,0.38)"
                  width={1}
                />
              ))}
              {vertices.map((vertex, index) => (
                <AxisLine key={`axis-${index}`} x1={center.x} y1={center.y} x2={vertex.x} y2={vertex.y} color="rgba(245,242,237,0.16)" width={1} />
              ))}
              {hasArea
                ? points.map((point, index) => (
                    <AxisLine
                      key={`inner-${index}`}
                      x1={point.x}
                      y1={point.y}
                      x2={points[(index + 1) % 3].x}
                      y2={points[(index + 1) % 3].y}
                      color={ink.champagne}
                      width={1.4}
                    />
                  ))
                : null}
              <View style={[styles.core, { left: center.x - 3, top: center.y - 3 }]} />
            </>
          )}
        {values.map((item, index) => {
          return (
            <View
              key={item.id}
              style={[
                styles.medal,
                {
                  width: ring,
                  height: ring,
                  left: figures[index].x - ring / 2,
                  top: figures[index].y - ring / 2,
                  borderRadius: ring / 2,
                  zIndex: 2,
                },
              ]}>
              <Image
                source={figureFor(item.id, feminine)}
                contentFit="cover"
                style={[styles.figure, { width: ring * 1.18, height: ring * 1.18, borderRadius: ring }]}
              />
              <Ring percent={item.percent} size={ring} />
            </View>
          );
        })}
      </View>
      <View style={styles.base}>
        <View style={styles.side}>
          <Text style={styles.name}>Mente</Text>
          <Text style={styles.percent}>{shownPercent(mente)}</Text>
        </View>
        <View style={[styles.side, styles.sideRight]}>
          <Text style={[styles.name, styles.nameRight]}>Espírito</Text>
          <Text style={[styles.percent, styles.percentRight]}>{shownPercent(espirito)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topLabel: {
    alignItems: 'center',
    marginBottom: 2,
  },
  plot: {
    width: '100%',
    position: 'relative',
  },
  medal: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  figure: {
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  core: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: ink.champagne,
  },
  ringFallback: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderWidth: 1.5,
  },
  base: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  side: {
    width: '42%',
  },
  sideRight: {
    alignItems: 'flex-end',
  },
  name: {
    color: ink.text,
    fontFamily: fonts.display,
    fontSize: 13,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  nameRight: {
    textAlign: 'right',
  },
  percent: {
    marginTop: 1,
    color: ink.text,
    fontFamily: fonts.textMedium,
    fontSize: 22,
    lineHeight: 26,
  },
  percentRight: {
    textAlign: 'right',
  },
});
