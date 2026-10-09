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
.day-planet-layer {
  position: absolute;
  width: 210%;
  height: auto;
  left: 64%;
  top: -46%;
  transform: translateX(-50%);
  opacity: 0.85;
  pointer-events: none;
  user-select: none;
  filter: brightness(0.48) saturate(0.7);
  mask-image: linear-gradient(to bottom, transparent 0%, #000 18%, #000 42%, transparent 68%);
  -webkit-mask-image: linear-gradient(to bottom, transparent 0%, #000 18%, #000 42%, transparent 68%);
}
.day-planet-veil {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(180deg, rgba(5,5,5,0.8) 0%, rgba(5,5,5,0.88) 30%, rgba(5,5,5,0.96) 54%, #050505 72%);
}
`;

export function DayPlanet() {
  const uri = imageUri(source);

  if (Platform.OS === 'web' && uri) {
    return (
      <View pointerEvents="none" style={styles.frame}>
        {createElement('style', null, css)}
        {createElement('img', {
          src: uri,
          alt: '',
          draggable: false,
          className: 'day-planet-layer',
        })}
        {createElement('div', { className: 'day-planet-veil' })}
      </View>
    );
  }

  return (
    <View pointerEvents="none" style={styles.frame}>
      <Image source={source} contentFit="cover" style={styles.nativeImage} />
      <View style={styles.nativeVeil} />
      <View style={styles.nativeFade} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    height: 250,
    overflow: 'hidden',
  },
  nativeImage: {
    position: 'absolute',
    width: '190%',
    height: 420,
    left: '-20%',
    top: -168,
    opacity: 0.22,
  },
  nativeVeil: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    bottom: 0,
    backgroundColor: 'rgba(5,5,5,0.8)',
  },
  nativeFade: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    height: 110,
    backgroundColor: '#050505',
  },
});
