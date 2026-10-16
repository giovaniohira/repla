import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { c, lift, r } from '@/theme';
import { Button } from '@/ui/Button';

// one step per tab, in tab-bar order
const STEPS = [
  { path: '/', title: 'Hoje', text: 'O resumo do seu dia: calorias, proteína e sua sequência.' },
  { path: '/nutrition', title: 'Alimentação', text: 'Registre refeições, escaneie códigos de barras e copie o que comeu ontem.' },
  { path: '/workouts', title: 'Treinos', text: 'Monte suas rotinas e registre cada série.' },
  { path: '/progress', title: 'Progresso', text: 'Gráficos de calorias, cargas e recordes.' },
  { path: '/profile', title: 'Perfil', text: 'Suas metas, preferências e conta.' },
] as const;

const HOLE = 68;
const RING = 1500; // dim ring thick enough to cover the whole screen around the hole
const BAR = Platform.OS === 'ios' ? 49 : 56; // ponytail: tab bar height guessed, measure it if the spotlight drifts

// First-run tour: dims the app and spotlights each tab. Shows once (user_metadata.tour_done).
export function Tour() {
  const [step, setStep] = useState(-1); // -1 = hidden
  const { width } = useWindowDimensions();
  const { bottom } = useSafeAreaInsets();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session?.user.user_metadata?.tour_done) setStep(0);
    });
  }, []);

  if (step < 0) return null;

  const done = () => {
    setStep(-1);
    supabase.auth.updateUser({ data: { tour_done: true } });
  };
  const go = (n: number) => {
    setStep(n);
    router.navigate(STEPS[n].path);
  };
  const last = step === STEPS.length - 1;
  const cx = ((step + 0.5) * width) / STEPS.length;
  const cy = bottom + BAR / 2; // vertical center of the tab icons, measured from the bottom edge
  const S = STEPS[step];

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable style={StyleSheet.absoluteFill} onPress={() => (last ? done() : go(step + 1))} />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute', left: cx - HOLE / 2 - RING, bottom: cy - HOLE / 2 - RING,
          width: HOLE + 2 * RING, height: HOLE + 2 * RING, borderRadius: (HOLE + 2 * RING) / 2,
          borderWidth: RING, borderColor: 'rgba(0,0,0,0.7)',
        }}
      />
      <View style={[s.card, { bottom: BAR + bottom + HOLE / 2 + 12 }]}>
        <Text style={s.title}>{S.title}</Text>
        <Text style={s.text}>{S.text}</Text>
        <View style={s.foot}>
          <Text style={s.count}>{step + 1} de {STEPS.length}</Text>
          {!last && <Pressable onPress={done} hitSlop={12}><Text style={s.skip}>Pular</Text></Pressable>}
        </View>
        <Button label={last ? 'Entendi' : 'Próximo'} onPress={() => (last ? done() : go(step + 1))} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { ...lift, position: 'absolute', left: 20, right: 20, backgroundColor: c.card, borderRadius: r.card, padding: 20, gap: 10 },
  title: { color: c.text, fontSize: 20, fontWeight: '700' },
  text: { color: c.muted, fontSize: 16, lineHeight: 22 },
  foot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  count: { color: c.faint, fontSize: 14 },
  skip: { color: c.primary, fontSize: 15 },
});
