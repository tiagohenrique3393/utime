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
.pillar-planet-layer {
  position: absolute;
  height: 145%;
  width: auto;
  max-width: none;
  left: 68%;
  top: -20%;
  transform: translateX(-50%);
  pointer-events: none;
  user-select: none;
  filter: brightness(0.58) saturate(0.72);
  mask-image: linear-gradient(to bottom, transparent 0%, #000 6%, #000 36%, transparent 58%);
  -webkit-mask-image: linear-gradient(to bottom, transparent 0%, #000 6%, #000 36%, transparent 58%);
}
.pillar-planet-veil {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(180deg, rgba(5,5,5,0.22) 0%, rgba(5,5,5,0.04) 14%, rgba(5,5,5,0.42) 36%, rgba(5,5,5,0.9) 54%, #050505 68%);
}
`;

export function PillarPlanet() {
  const uri = imageUri(source);
  if (Platform.OS === 'web' && uri) {
    return (
      <View pointerEvents="none" style={styles.frame}>
        {createElement('style', null, css)}
        {createElement('img', { src: uri, alt: '', draggable: false, className: 'pillar-planet-layer' })}
        {createElement('div', { className: 'pillar-planet-veil' })}
      </View>
    );
  }
  return (
    <View pointerEvents="none" style={styles.frame}>
      <Image source={source} contentFit="cover" contentPosition="top" style={styles.native} />
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
    height: '72%',
    overflow: 'hidden',
  },
  native: {
    position: 'absolute',
    width: '190%',
    height: '150%',
    top: '-28%',
    left: '-20%',
    opacity: 0.42,
  },
  nativeVeil: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(5,5,5,0.45)',
  },
});
