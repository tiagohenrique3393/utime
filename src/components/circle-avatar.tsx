import { StyleSheet, View } from 'react-native';

export function CircleAvatar({ size = 36 }: { size?: number }) {
  return (
    <View style={[styles.ring, { width: size, height: size, borderRadius: size / 2 }]}>
      <View
        style={{
          width: size * 0.28,
          height: size * 0.28,
          borderRadius: size,
          backgroundColor: '#070605',
          marginTop: size * 0.16,
        }}
      />
      <View
        style={{
          width: size * 0.5,
          height: size * 0.22,
          borderTopLeftRadius: size,
          borderTopRightRadius: size,
          backgroundColor: '#070605',
          marginTop: size * 0.05,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(232, 201, 155, 0.9)',
    backgroundColor: '#1C1814',
    overflow: 'hidden',
    boxShadow: '0 0 10px rgba(232, 201, 155, 0.35)',
  },
});
