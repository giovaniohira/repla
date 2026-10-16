import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useEffect, useState } from 'react';

const COLORS = ['#0F9D8A', '#4A7BF7', '#F59E0B', '#EC4899', '#22C55E'];

function Piece({ i }: { i: number }) {
  const [cfg] = useState(() => ({
    x: (Math.random() - 0.5) * 320, y: 220 + Math.random() * 260, rot: Math.random() * 720,
    color: COLORS[i % COLORS.length], delay: Math.random() * 200, size: 6 + Math.random() * 6,
  }));
  const t = useSharedValue(0);
  useEffect(() => { t.value = withDelay(cfg.delay, withTiming(1, { duration: 1600, easing: Easing.out(Easing.quad) })); }, [t, cfg.delay]);
  const st = useAnimatedStyle(() => ({
    opacity: 1 - t.value * t.value,
    transform: [{ translateX: cfg.x * t.value }, { translateY: -120 + cfg.y * t.value * t.value + -160 * (1 - t.value) * t.value * 2 }, { rotate: `${cfg.rot * t.value}deg` }],
  }));
  return <Animated.View style={[{ position: 'absolute', width: cfg.size, height: cfg.size * 0.5, backgroundColor: cfg.color, borderRadius: 1 }, st]} />;
}

// One-shot celebration burst from the screen center. Mount it to play it.
export function Confetti({ count = 40 }: { count?: number }) {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
      {Array.from({ length: count }, (_, i) => <Piece key={i} i={i} />)}
    </View>
  );
}
