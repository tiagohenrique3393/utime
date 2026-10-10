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
  filter: brightness(0.84) saturate(0.9);
  mask-image: linear-gradient(to bottom, transparent 0%, #000 12%, #000 62%, transparent 90%);
  -webkit-mask-image: linear-gradient(to bottom, transparent 0%, #000 12%, #000 62%, transparent 90%);
}
.progress-planet-veil {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(180deg, rgba(5,5,5,0.72) 0%, rgba(5,5,5,0.48) 18%, rgba(5,5,5,0.22) 40%, rgba(5,5,5,0.7) 68%, #050505 86%);
}
.progress-planet-layer.bright {
  top: 14%;
  width: 156%;
  filter: brightness(1.02) saturate(0.92) contrast(1.04);
  mask-image: linear-gradient(to bottom, transparent 0%, #000 10%, #000 64%, transparent 92%);
  -webkit-mask-image: linear-gradient(to bottom, transparent 0%, #000 10%, #000 64%, transparent 92%);
}
.progress-planet-veil.bright {
  background: linear-gradient(180deg, rgba(5,5,5,0.55) 0%, rgba(5,5,5,0.34) 14%, rgba(5,5,5,0.1) 40%, rgba(5,5,5,0.22) 54%, rgba(5,5,5,0.78) 74%, #050505 88%);
}
`;

export function ProgressPlanet({ bright = false }: { bright?: boolean }) {
  const uri = imageUri(source);
  const layerClass = bright ? 'progress-planet-layer bright' : 'progress-planet-layer';
  const veilClass = bright ? 'progress-planet-veil bright' : 'progress-planet-veil';

  if (Platform.OS === 'web' && uri) {
    return (
      <View pointerEvents="none" style={styles.frame}>
        {createElement('style', null, css)}
        {createElement('img', {
          src: uri,
          alt: '',
          draggable: false,
          className: layerClass,
        })}
        {createElement('div', { className: veilClass })}
      </View>
    );
  }

  return (
    <View pointerEvents="none" style={styles.frame}>
      <Image source={source} contentFit="cover" style={[styles.nativeImage, bright && styles.nativeBright]} />
      <View style={[styles.nativeVeil, bright && styles.nativeVeilBright]} />
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
  nativeBright: {
    opacity: 0.78,
    top: 8,
  },
  nativeVeil: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    bottom: 0,
    backgroundColor: 'rgba(5,5,5,0.58)',
  },
  nativeVeilBright: {
    backgroundColor: 'rgba(5,5,5,0.22)',
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
