import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { c } from '@/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, 'style'> & { style?: StyleProp<ViewStyle>; on?: boolean; dark?: string; off?: string };

// 3D button: fixed thick bottom border (doesn't shift layout); on press it sinks 3px (animated)
export function Raised({ style, on = false, dark = c.primaryDark, off = c.line, onPressIn, onPressOut, ...rest }: Props) {
  const p = useSharedValue(0);
  const anim = useAnimatedStyle(() => ({ transform: [{ translateY: 3 * p.value }] }));
  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(e) => { p.value = withTiming(1, { duration: 70 }); onPressIn?.(e); }}
      onPressOut={(e) => { p.value = withTiming(0, { duration: 120 }); onPressOut?.(e); }}
      style={[style, { borderBottomWidth: 4, borderBottomColor: on ? dark : off }, anim]}
    />
  );
}
