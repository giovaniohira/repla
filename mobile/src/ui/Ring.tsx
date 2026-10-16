import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { c } from '@/theme';
import { useCountUp } from '@/lib/useCountUp';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Progress ring that fills with an animation; overflow (over goal) shown in amber. Center shows children or a count-up value.
export function Ring({ value, goal, size = 200, stroke = 16, color = c.primary, label, sub, children }: {
  value: number; goal?: number; size?: number; stroke?: number; color?: string; label?: string; sub?: string; children?: React.ReactNode;
}) {
  const R = (size - stroke) / 2, C = 2 * Math.PI * R;
  const frac = goal ? Math.min(1, value / goal) : 0;
  const p = useSharedValue(0);
  useEffect(() => { p.value = withTiming(frac, { duration: 900 }); }, [frac, p]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: C * (1 - p.value) }));
  const overFrac = goal ? Math.min(1, Math.max(0, value - goal) / goal) : 0;
  const po = useSharedValue(0);
  useEffect(() => { po.value = withTiming(overFrac, { duration: 900 }); }, [overFrac, po]);
  const overProps = useAnimatedProps(() => ({ strokeDashoffset: C * (1 - po.value) }));
  const shown = useCountUp(value);
  const over = !!goal && value > goal;
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill} rotation={-90} originX={size / 2} originY={size / 2}>
        <Circle cx={size / 2} cy={size / 2} r={R} stroke={c.track} strokeWidth={stroke} fill="none" />
        <AnimatedCircle cx={size / 2} cy={size / 2} r={R} stroke={color} strokeWidth={stroke} fill="none"
          strokeLinecap="round" strokeDasharray={C} animatedProps={props} />
        {over && <AnimatedCircle cx={size / 2} cy={size / 2} r={R} stroke={c.amber} strokeWidth={stroke} fill="none"
          strokeLinecap="round" strokeDasharray={C} animatedProps={overProps} />}
      </Svg>
      {children ?? (
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: size / 4.4, fontWeight: '800', color: c.text }}>{shown}</Text>
          {!!label && <Text style={{ fontSize: 13, color: c.muted }}>{label}</Text>}
          {!!sub && <Text style={{ fontSize: 12, color: over ? c.amber : c.muted, fontWeight: '600' }}>{sub}</Text>}
        </View>
      )}
    </View>
  );
}
