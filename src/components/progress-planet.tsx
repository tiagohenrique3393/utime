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
.progress-planet-layer {
  position: absolute;
  width: 168%;
  height: auto;
  left: 50%;
  top: 16%;
  transform: translateX(-50%);
  pointer-events: none;
  user-select: none;
  filter: brightness(0.7) saturate(0.82);
  mask-image: linear-gradient(to bottom, transparent 0%, #000 14%, #000 62%, transparent 94%);
  -webkit-mask-image: linear-gradient(to bottom, transparent 0%, #000 14%, #000 62%, transparent 94%);
}
.progress-planet-veil {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(180deg, rgba(5,5,5,0.62) 0%, rgba(5,5,5,0.38) 26%, rgba(5,5,5,0.55) 48%, rgba(5,5,5,0.88) 72%, #050505 90%);
}
`;

export function ProgressPlanet() {
  const uri = imageUri(source);

  if (Platform.OS === 'web' && uri) {
    return (
      <View pointerEvents="none" style={styles.frame}>
        {createElement('style', null, css)}
        {createElement('img', {
          src: uri,
          alt: '',
          draggable: false,
          className: 'progress-planet-layer',
        })}
        {createElement('div', { className: 'progress-planet-veil' })}
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
    height: 560,
    overflow: 'hidden',
  },
  nativeImage: {
    position: 'absolute',
    width: '170%',
    height: 460,
    left: '-35%',
    top: 24,
    opacity: 0.42,
  },
  nativeVeil: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    bottom: 0,
    backgroundColor: 'rgba(5,5,5,0.58)',
  },
  nativeFade: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    height: 180,
    backgroundColor: '#050505',
  },
});
