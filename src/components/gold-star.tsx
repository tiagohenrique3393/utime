import { Text, type StyleProp, type TextStyle } from 'react-native';

import { fonts, ui } from '@/constants/theme';

export function GoldStar({ size = 12, style }: { size?: number; style?: StyleProp<TextStyle> }) {
  return (
    <Text
      accessible={false}
      style={[
        {
          color: ui.champagne,
          fontFamily: fonts.textMedium,
          fontSize: size,
          lineHeight: size + 2,
          textAlign: 'center',
        },
        style,
      ]}>
      ★
    </Text>
  );
}
