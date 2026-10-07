import { Image } from 'expo-image';
import { createElement } from 'react';
import { Platform, useWindowDimensions, View } from 'react-native';

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
.hoje-planet-layer {
  position: absolute;
  left: 50%;
  width: 100%;
  height: auto;
  max-width: none;
  transform: translateX(-50%);
  top: calc(24vh - 22.5vw);
  pointer-events: none;
  user-select: none;
  mask-image: linear-gradient(to bottom, #000 0%, #000 70%, transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, #000 0%, #000 70%, transparent 100%);
}
@media (max-width: 759px) {
  .hoje-planet-layer {
    width: 196%;
    top: calc(32vh - 44vw);
  }
}
`;

export function HojePlanet() {
  const { width, height } = useWindowDimensions();
  const uri = imageUri(source);

  if (Platform.OS === 'web' && uri) {
    return (
      <>
        {createElement('style', null, css)}
        {createElement('img', {
          src: uri,
          alt: '',
          draggable: false,
          className: 'hoje-planet-layer',
        })}
      </>
    );
  }

  const phone = width < 760;
  const imgWidth = phone ? width * 1.96 : width;
  const imgHeight = imgWidth * (941 / 1672);
  const top = (phone ? height * 0.32 : height * 0.24) - imgHeight * 0.399;
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: imgWidth,
        height: imgHeight,
        top,
        left: (width - imgWidth) / 2,
      }}>
      <Image source={source} contentFit="fill" style={{ width: '100%', height: '100%' }} />
    </View>
  );
}
