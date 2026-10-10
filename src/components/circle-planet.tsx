import { Image } from 'expo-image';
import { createElement } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

const source = require('@/assets/hoje-planet.png');

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

const css = `
.circle-planet-layer {
  position: absolute;
  width: 128%;
  height: auto;
  left: 22%;
  top: -8%;
  pointer-events: none;
  user-select: none;
  filter: brightness(0.72) saturate(0.85);
  mask-image: linear-gradient(to bottom, transparent 0%, #000 12%, #000 42%, transparent 72%);
  -webkit-mask-image: linear-gradient(to bottom, transparent 0%, #000 12%, #000 42%, transparent 72%);
}
.circle-planet-veil {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(180deg, rgba(5,5,5,0.2) 0%, rgba(5,5,5,0.55) 28%, #050505 48%);
}
`;

export function CirclePlanet() {
  const uri = imageUri(source);
  if (Platform.OS === 'web' && uri) {
    return (
      <View pointerEvents="none" style={styles.frame}>
        {createElement('style', null, css)}
        {createElement('img', { src: uri, alt: '', draggable: false, className: 'circle-planet-layer' })}
        {createElement('div', { className: 'circle-planet-veil' })}
      </View>
    );
  }
  return (
    <View pointerEvents="none" style={styles.frame}>
      <Image source={source} contentFit="cover" style={styles.native} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    height: 280,
    overflow: 'hidden',
  },
  native: {
    position: 'absolute',
    width: '130%',
    height: 220,
    top: -10,
    left: '18%',
    opacity: 0.7,
  },
});
