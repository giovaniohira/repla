import { useEffect, useRef } from 'react';
import { Animated, PanResponder, StyleSheet, Text, View } from 'react-native';
import { impactAsync, ImpactFeedbackStyle } from '@/lib/haptics';
import { c } from '@/theme';

const H = 250;
const ITEM = 50;

type Props = { label: string; unit: string; min: number; max: number; value: number; onChange: (v: number) => void };

export function VSlider({ label, unit, min, max, value, onChange }: Props) {
  const initial = ((max - min) / 2 - (value - min)) * ITEM;
  const scroll = useRef(new Animated.Value(initial)).current;
  const scrollVal = useRef(initial);
  const start = useRef(0);
  const last = useRef(value);
  const p = useRef({ min, max, onChange });
  p.current = { min, max, onChange };

  useEffect(() => {
    const id = scroll.addListener(({ value: v }) => {
      scrollVal.current = v;
    });
    return () => scroll.removeListener(id);
  }, [scroll]);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        start.current = scrollVal.current;
      },
      onPanResponderMove: (_, g) => {
        const { min: lo, max: hi } = p.current;
        const range = hi - lo;
        const lim = (range / 2) * ITEM;
        const offset = Math.max(-lim, Math.min(lim, start.current + g.dy));
        const v = Math.round(lo + range / 2 - offset / ITEM);
        scroll.setValue(offset);
        if (v !== last.current && v >= lo && v <= hi) {
          last.current = v;
          p.current.onChange(v);
          impactAsync(ImpactFeedbackStyle.Light);
        }
      },
      onPanResponderRelease: (_, g) => {
        const { min: lo, max: hi } = p.current;
        const range = hi - lo;
        const offset = start.current + g.dy;
        const v = Math.round(lo + Math.max(0, Math.min(range, range / 2 - offset / ITEM)));
        Animated.spring(scroll, { toValue: (range / 2 - (v - lo)) * ITEM, useNativeDriver: false }).start();
        last.current = v;
      },
    }),
  ).current;

  const { min: lo, max: hi } = { min, max };
  const range = hi - lo;

  return (
    <View style={s.wrap}>
      <Text style={s.label}>{label}</Text>
      <View style={s.picker} {...pan.panHandlers}>
        <Animated.View style={[s.list, { height: (range + 5) * ITEM, transform: [{ translateY: scroll }] }]}>
          {Array.from({ length: 9 }, (_, i) => value - 4 + i)
            .filter((n) => n >= lo - 2 && n <= hi + 2)
            .map((n) => {
              // scroll position at which item n is centered
              const cn = (range / 2 - (n - lo)) * ITEM;
              const at = (f: (k: number) => number) => ({
                inputRange: [-3, -2, -1, 0, 1, 2, 3].map((k) => cn + k * ITEM),
                outputRange: [-3, -2, -1, 0, 1, 2, 3].map((k) => f(Math.abs(k))),
                extrapolate: 'clamp' as const,
              });
              return (
                <Animated.View key={n} style={[s.item, { top: (n - lo + 2) * ITEM, opacity: scroll.interpolate(at((k) => [1, 0.4, 0.15, 0.04][k])) }]}>
                  <Animated.Text style={[s.txt, {
                    color: scroll.interpolate({ inputRange: [cn - ITEM, cn, cn + ITEM], outputRange: [c.muted, c.text, c.muted], extrapolate: 'clamp' }),
                    transform: [{ scale: scroll.interpolate(at((k) => [1, 22 / 32, 17 / 32, 14 / 32][k])) }],
                  }]}>{n}</Animated.Text>
                </Animated.View>
              );
            })}
        </Animated.View>
      </View>
      <Text style={s.unit}>{unit}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', gap: 6 },
  label: { color: c.text, fontSize: 18, fontWeight: '600', height: 24 },
  picker: { alignSelf: 'stretch', height: H, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  list: { width: '100%' },
  item: { position: 'absolute', left: 0, right: 0, height: ITEM, justifyContent: 'center', alignItems: 'center' },
  txt: { textAlign: 'center', fontSize: 32, fontWeight: '300' },
  unit: { color: c.muted, fontSize: 24, fontWeight: '700' },
});
