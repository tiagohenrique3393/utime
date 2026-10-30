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
.profile-planet-layer {
  position: absolute;
  width: 228%;
  height: auto;
  max-width: none;
  left: -42%;
  top: -18%;
  pointer-events: none;
  user-select: none;
  filter: brightness(0.42) saturate(0.68);
  mask-image: linear-gradient(to bottom, transparent 0%, #000 8%, #000 34%, transparent 62%);
  -webkit-mask-image: linear-gradient(to bottom, transparent 0%, #000 8%, #000 34%, transparent 62%);
}
.profile-planet-layer.photo {
  top: -8%;
  width: 250%;
  left: -62%;
}
.profile-planet-layer.low {
  top: 18%;
}
.profile-planet-veil {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(100deg, rgba(5,5,5,0.82) 0%, rgba(5,5,5,0.34) 42%, rgba(5,5,5,0.05) 100%),
    linear-gradient(180deg, rgba(5,5,5,0.08) 0%, rgba(5,5,5,0.5) 38%, #050505 64%);
}
`;

export function ProfilePlanet({ placement = 'perfil' }: { placement?: 'perfil' | 'photo' | 'low' }) {
  const uri = imageUri(source);
  const layer = placement === 'perfil' ? 'profile-planet-layer' : `profile-planet-layer ${placement}`;
  if (Platform.OS === 'web' && uri) {
    return (
      <View pointerEvents="none" style={styles.frame}>
        {createElement('style', null, css)}
        {createElement('img', { src: uri, alt: '', draggable: false, className: layer })}
        {createElement('div', { className: 'profile-planet-veil' })}
      </View>
    );
  }
  return (
    <View pointerEvents="none" style={styles.frame}>
      <Image source={source} contentFit="cover" style={[styles.native, placement === 'photo' && styles.nativePhoto, placement === 'low' && styles.nativeLow]} />
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
    height: '58%',
    overflow: 'hidden',
  },
  native: {
    position: 'absolute',
    width: '228%',
    height: '180%',
    top: '-18%',
    left: '-42%',
    opacity: 0.5,
  },
  nativePhoto: {
    top: '-8%',
    left: '-62%',
    width: '250%',
  },
  nativeLow: {
    top: '18%',
  },
  nativeFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '46%',
    backgroundColor: '#050505',
  },
});
