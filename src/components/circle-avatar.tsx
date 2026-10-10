import { StyleSheet, View } from 'react-native';

export function CircleAvatar({ size = 36 }: { size?: number }) {
  return (
    <View style={[styles.ring, { width: size, height: size, borderRadius: size / 2 }]}>
      <View
        style={{
          width: size * 0.28,
          height: size * 0.28,
          borderRadius: size,
          backgroundColor: '#E8C99B',
          marginTop: size * 0.16,
        }}
      />
      <View
        style={{
          width: size * 0.48,
          height: size * 0.2,
          borderTopLeftRadius: size,
          borderTopRightRadius: size,
          backgroundColor: '#E8C99B',
          marginTop: size * 0.06,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(232, 201, 155, 0.75)',
    backgroundColor: '#070707',
    overflow: 'hidden',
  },
});
