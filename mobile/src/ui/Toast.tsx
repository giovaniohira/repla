import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { c, r } from '@/theme';

type T = { id: number; msg: string; action?: { label: string; run: () => void }; error?: boolean };
let show: ((t: Omit<T, 'id'>) => void) | null = null;

// Global, non-blocking replacement for Alert. Mount <ToastHost /> once at the root.
export const toast = (msg: string, opts: { action?: T['action']; error?: boolean } = {}) => show?.({ msg, ...opts });

export function ToastHost() {
  const [t, setT] = useState<T | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    show = (n) => {
      clearTimeout(timer.current);
      setT({ ...n, id: Date.now() });
      timer.current = setTimeout(() => setT(null), n.action ? 5000 : 2800);
    };
    return () => { show = null; clearTimeout(timer.current); };
  }, []);

  if (!t) return null;
  return (
    <SafeAreaView pointerEvents="box-none" edges={['bottom']} style={s.wrap}>
      <Animated.View key={t.id} entering={FadeInDown.springify()} exiting={FadeOutDown} style={[s.toast, t.error && { backgroundColor: c.danger }]}>
        <Text style={s.msg}>{t.msg}</Text>
        {t.action && (
          <Pressable hitSlop={10} onPress={() => { t.action!.run(); setT(null); }}>
            <Text style={s.act}>{t.action.label}</Text>
          </Pressable>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 72, paddingHorizontal: 16 },
  toast: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: '#1E293B', borderRadius: r.sm, padding: 14, boxShadow: '0 4px 12px rgba(0,0,0,0.25)' },
  msg: { flex: 1, color: '#fff', fontSize: 14 },
  act: { color: '#5EEAD4', fontWeight: '700', fontSize: 14 },
});
