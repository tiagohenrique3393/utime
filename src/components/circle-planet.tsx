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
  width: 156%;
  height: auto;
  left: -16%;
  top: -18%;
  pointer-events: none;
  user-select: none;
  filter: brightness(0.72) saturate(0.9);
  mask-image: linear-gradient(to bottom, transparent 0%, #000 6%, #000 62%, transparent 96%);
  -webkit-mask-image: linear-gradient(to bottom, transparent 0%, #000 6%, #000 62%, transparent 96%);
}
.circle-planet-veil {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(180deg, rgba(5,5,5,0.08) 0%, rgba(5,5,5,0.18) 24%, rgba(5,5,5,0.62) 62%, #050505 88%);
}
.circle-planet-foot {
  position: absolute;
  width: 150%;
  height: 280px;
  left: -25%;
  bottom: 0;
  object-fit: cover;
  object-position: center 68%;
  pointer-events: none;
  user-select: none;
  filter: brightness(0.42) saturate(0.75);
  mask-image: linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.45) 42%, transparent 100%);
  -webkit-mask-image: linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.45) 42%, transparent 100%);
}
`;

export function CirclePlanet({ footing = false }: { footing?: boolean }) {
  const uri = imageUri(source);
  if (Platform.OS === 'web' && uri) {
    return (
      <>
        <View pointerEvents="none" style={styles.frame}>
          {createElement('style', null, css)}
          {createElement('img', { src: uri, alt: '', draggable: false, className: 'circle-planet-layer' })}
          {createElement('div', { className: 'circle-planet-veil' })}
        </View>
        {footing ? createElement('img', { src: uri, alt: '', draggable: false, className: 'circle-planet-foot' }) : null}
      </>
    );
  }
  return (
    <>
      <View pointerEvents="none" style={styles.frame}>
        <Image source={source} contentFit="cover" style={styles.native} />
      </View>
      {footing ? (
        <View pointerEvents="none" style={styles.foot}>
          <Image source={source} contentFit="cover" contentPosition="bottom" style={styles.footImage} />
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  frame: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    height: 460,
    overflow: 'hidden',
  },
  native: {
    position: 'absolute',
    width: '156%',
    height: 460,
    top: -36,
    left: '-16%',
    opacity: 0.88,
  },
  foot: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    height: 240,
    overflow: 'hidden',
  },
  footImage: {
    width: '150%',
    height: 280,
    marginLeft: '-25%',
    opacity: 0.5,
  },
});
