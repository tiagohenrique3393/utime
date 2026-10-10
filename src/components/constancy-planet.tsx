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
.constancy-planet-layer {
  position: absolute;
  width: 132%;
  height: auto;
  left: 16%;
  top: -4%;
  pointer-events: none;
  user-select: none;
  filter: brightness(0.76) saturate(0.86);
  mask-image: linear-gradient(to bottom, transparent 0%, #000 10%, #000 46%, transparent 76%);
  -webkit-mask-image: linear-gradient(to bottom, transparent 0%, #000 10%, #000 46%, transparent 76%);
}
.constancy-planet-veil {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(180deg, rgba(5,5,5,0.28) 0%, rgba(5,5,5,0.08) 14%, rgba(5,5,5,0.62) 32%, #050505 48%);
}
`;

export function ConstancyPlanet() {
  const uri = imageUri(source);

  if (Platform.OS === 'web' && uri) {
    return (
      <View pointerEvents="none" style={styles.frame}>
        {createElement('style', null, css)}
        {createElement('img', {
          src: uri,
          alt: '',
          draggable: false,
          className: 'constancy-planet-layer',
        })}
        {createElement('div', { className: 'constancy-planet-veil' })}
      </View>
    );
  }

  return (
    <View pointerEvents="none" style={styles.frame}>
      <Image source={source} contentFit="cover" style={styles.nativeImage} />
      <View style={styles.nativeVeil} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    height: 360,
    overflow: 'hidden',
  },
  nativeImage: {
    position: 'absolute',
    width: '140%',
    height: 280,
    top: -20,
    left: '8%',
    opacity: 0.72,
  },
  nativeVeil: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    bottom: 0,
    backgroundColor: 'rgba(5, 5, 5, 0.45)',
  },
});
