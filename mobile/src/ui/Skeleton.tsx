import { useEffect } from 'react';
import type { DimensionValue, StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { c } from '@/theme';

// Pulsing placeholder shown while data loads.
export function Skeleton({ h = 16, w = '100%', radius = 10, style }: { h?: number; w?: DimensionValue; radius?: number; style?: StyleProp<ViewStyle> }) {
  const o = useSharedValue(0.5);
  useEffect(() => { o.value = withRepeat(withTiming(1, { duration: 800 }), -1, true); }, [o]);
  const a = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[{ height: h, width: w, borderRadius: radius, backgroundColor: c.track }, a, style]} />;
}
