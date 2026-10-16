import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

// One combination-lock wheel: spins a full turn and stops on `d`.
function Wheel({ d, i, size, color, run }: { d: number; i: number; size: number; color: string; run: boolean }) {
  const h = Math.round(size * 1.15), w = Math.round(size * 0.62);
  const y = useSharedValue(0);
  useEffect(() => {
    // left wheels stop first, like a lock clicking into place
    y.value = run ? withTiming(-(10 + d) * h, { duration: 900 + i * 250, easing: Easing.out(Easing.cubic) }) : 0;
  }, [run, d, i, h, y]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return (
    <View style={{ height: h, width: w, overflow: 'hidden' }}>
      <Animated.View style={style}>
        {DIGITS.map((n, k) => (
          <Text key={k} style={{ height: h, lineHeight: h, fontSize: size, fontWeight: '800', color, textAlign: 'center' }}>{n}</Text>
        ))}
      </Animated.View>
    </View>
  );
}

// Number whose digits roll in like a combination lock once `run` turns true.
export function Odometer({ value, size, color, run }: { value: number; size: number; color: string; run: boolean }) {
  const s = String(Math.max(0, Math.round(value)));
  return (
    <View style={{ flexDirection: 'row' }}>
      {[...s].map((ch, i) => <Wheel key={`${s.length}-${i}`} d={+ch} i={i} size={size} color={color} run={run} />)}
    </View>
  );
}
