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
  height: 175%;
  width: auto;
  max-width: none;
  left: 92%;
  top: -52%;
  transform: translateX(-50%);
  pointer-events: none;
  user-select: none;
  filter: brightness(0.46) saturate(0.74);
  mask-image: linear-gradient(to bottom, transparent 0%, #000 7%, #000 72%, transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, transparent 0%, #000 7%, #000 72%, transparent 100%);
}
.circle-planet-veil {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(180deg, rgba(5,5,5,0.34) 0%, rgba(5,5,5,0.08) 14%, rgba(5,5,5,0.2) 42%, rgba(5,5,5,0.78) 76%, #050505 100%);
}
.circle-planet-foot {
  position: absolute;
  height: 150%;
  width: auto;
  max-width: none;
  left: 48%;
  bottom: -46%;
  transform: translateX(-50%);
  pointer-events: none;
  user-select: none;
  filter: brightness(0.3) saturate(0.55) contrast(1.2);
  mask-image: linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.4) 28%, transparent 58%);
  -webkit-mask-image: linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.4) 28%, transparent 58%);
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
    height: '78%',
    overflow: 'hidden',
  },
  native: {
    position: 'absolute',
    width: '190%',
    height: '175%',
    top: '-46%',
    left: '-12%',
    opacity: 0.86,
  },
  foot: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    height: '42%',
    overflow: 'hidden',
  },
  footImage: {
    width: '170%',
    height: '160%',
    marginLeft: '-32%',
    marginTop: '-20%',
    opacity: 0.55,
  },
});
