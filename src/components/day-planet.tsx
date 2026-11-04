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
  width: 156%;
  height: auto;
  left: 70%;
  top: -6%;
  transform: translateX(-46%);
  opacity: 0.96;
  pointer-events: none;
  user-select: none;
  mask-image: linear-gradient(to bottom, #000 0%, #000 46%, transparent 82%);
  -webkit-mask-image: linear-gradient(to bottom, #000 0%, #000 46%, transparent 82%);
}
.day-planet-veil {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(180deg, rgba(5,5,5,0.05) 0%, rgba(5,5,5,0.18) 34%, rgba(5,5,5,0.72) 68%, #050505 100%);
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
    height: 300,
    overflow: 'hidden',
  },
  nativeImage: {
    position: 'absolute',
    width: '170%',
    height: 360,
    left: '-10%',
    top: -48,
    opacity: 0.92,
  },
  nativeVeil: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    bottom: 0,
    backgroundColor: 'rgba(5,5,5,0.22)',
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
