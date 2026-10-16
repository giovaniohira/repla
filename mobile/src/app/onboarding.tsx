import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { Easing, type SharedValue, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { supabase } from '@/lib/supabase';
import { commitDraft, saveDraft } from '@/lib/draft';
import { c, r, lift } from '@/theme';
import { Raised } from '@/ui/Raised';
import { Button } from '@/ui/Button';
import { Mascot } from '@/ui/Mascot';
import { VSlider } from '@/ui/VSlider';
import { Odometer } from '@/ui/Odometer';
import { ACTIVITY, calcTargets, GOALS, splitMacros, weeksToGoal } from '@/lib/goals';

const TITLES = ['Bem-vindo!', 'O que você quer acompanhar?', 'Qual seu sexo?', 'Qual sua idade?', 'Qual sua altura?', 'Qual seu peso?', 'Seu objetivo', 'Quer chegar a quantos kg?', 'Atividade física', 'Suas metas diárias'];
// one-line reason shown under each question
const HINTS = [
  '',
  'Vamos deixar o app do seu jeito. Você pode mudar depois.',
  'Usamos para calcular quantas calorias seu corpo gasta por dia.',
  'Seu metabolismo muda com a idade.',
  'Altura e peso definem seu gasto base.',
  'Use o peso de hoje, você pode atualizar depois.',
  'Define se você come menos, igual ou mais do que gasta.',
  '',
  'Quanto você se movimenta muda seu gasto diário.',
  'Calculado com seus dados, seu objetivo e seu nível de atividade.',
];

// fake progress shown for ~2s before the targets appear
const STEPS = ['Calculando metabolismo basal…', 'Agrupando seus dados…', 'Ajustando ao seu objetivo…', 'Definindo suas metas diárias…'];

// bar progress reached at the end of each phrase; uneven steps make it speed up and slow down
const PROGRESS = [0.3, 0.45, 0.85, 1];
const PHRASE_MS = 1000;

const FOCUS = [
  { k: 'meals', icon: 'restaurant-outline', label: 'Refeições', desc: 'Calorias e macros do dia' },
  { k: 'workouts', icon: 'barbell-outline', label: 'Treinos', desc: 'Rotinas, cargas e evolução' },
  { k: 'both', icon: 'apps-outline', label: 'Os dois', desc: 'Tudo em um só lugar' },
] as const;

const PINK = '#EC4899';

const num = (s: string) => parseFloat(s.replace(',', '.'));

function Field({ label, value, onChange, unit }: { label: string; value: string; onChange: (v: string) => void; unit: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        style={s.input}
        keyboardType="decimal-pad"
        value={value}
        onChangeText={onChange}
        placeholder={unit}
        placeholderTextColor={c.faint}
      />
    </View>
  );
}

// one wheel picker per page, same look as before
function Wheel(props: React.ComponentProps<typeof VSlider>) {
  return (
    <View style={s.wheel}>
      <View pointerEvents="none" style={s.band} />
      <VSlider {...props} />
    </View>
  );
}

function Page({ i, pos, active, children }: { i: number; pos: SharedValue<number>; active: boolean; children: React.ReactNode }) {
  const style = useAnimatedStyle(() => {
    const d = i - pos.value; // <0 left through the left, >0 still to enter from the right
    return { opacity: Math.max(0, 1 - Math.abs(d) / 0.4), transform: [{ translateX: d * 40 }] };
  });
  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]} pointerEvents={active ? 'auto' : 'none'}>
      <Text style={s.title}>{TITLES[i]}</Text>
      {!!HINTS[i] && <Text style={s.hint}>{HINTS[i]}</Text>}
      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">{children}</ScrollView>
    </Animated.View>
  );
}

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const bar = useSharedValue(0); // fake loading progress 0..1
  const barStyle = useAnimatedStyle(() => ({ width: `${bar.value * 100}%` }));
  const pos = useSharedValue(0); // fractional position between pages during a transition

  // all pages stay mounted; switching only animates opacity and offset
  function go(n: number) {
    setStep(n);
    pos.value = withTiming(n, { duration: 500 });
  }
  const [focus, setFocus] = useState<'meals' | 'workouts' | 'both' | null>(null);
  const [sex, setSex] = useState<'m' | 'f' | null>(null);
  const [age, setAge] = useState(25);
  const [height, setHeight] = useState(170);
  const [weight, setWeight] = useState(70);
  const [goal, setGoal] = useState<(typeof GOALS)[number]['k'] | null>(null);
  const [goalW, setGoalW] = useState(70);
  const [act, setAct] = useState<number | null>(null);
  const [kcal, setKcal] = useState('2000');
  const [protein, setProtein] = useState('120');
  const [edit, setEdit] = useState(false); // targets fields visible on the last page
  const [busy, setBusy] = useState(false);
  const [calc, setCalc] = useState(-1); // index into STEPS while the fake loading runs, -1 = off
  const [error, setError] = useState('');
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => { supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session)); }, []);

  const kcalN = Math.round(num(kcal)) || 0;
  // direction comes from the target weight, not from the objective screen pick
  const dir: (typeof GOALS)[number]['k'] = goalW < weight ? 'lose' : goalW > weight ? 'gain' : 'maintain';
  const diff = goalW - weight;
  const weeks = dir === 'maintain' ? 0 : weeksToGoal(weight, goalW, dir);
  const macros = splitMacros(kcalN, Math.round(num(protein)) || 0);

  // single-choice screens: highlight the pick, then advance
  function pick(set: () => void, next: () => void) {
    set();
    setTimeout(next, 250);
  }

  function calculate(a = act) {
    const t = calcTargets({ sex: sex!, age, height, weight, goal: dir, act: a! });
    setKcal(String(t.kcal));
    setProtein(String(t.protein));
    setError('');
    setEdit(false);
    bar.value = 0;
    setCalc(0);
  }

  useEffect(() => {
    if (calc < 0) return;
    bar.value = withTiming(PROGRESS[calc], { duration: PHRASE_MS, easing: Easing.linear });
    const id = setTimeout(() => {
      if (calc < STEPS.length - 1) setCalc(calc + 1);
      else { setCalc(-1); go(9); }
    }, PHRASE_MS);
    return () => clearTimeout(id);
  }, [calc]);

  async function finish() {
    const k = Math.round(num(kcal)), p = Math.round(num(protein));
    if (!(k >= 800 && k <= 10000 && p >= 20 && p <= 500)) return setError('Metas fora do intervalo razoável.');
    setBusy(true);
    setError('');
    await saveDraft({ focus: focus!, sex: sex!, age, height, weight, goal: dir, goalWeight: goalW, act: act!, kcal: k, protein: p });
    // signed in without a draft (old account): save now, _layout unlocks the tabs. Otherwise go pick a plan and sign up.
    if (signedIn) setError(await commitDraft());
    else router.push('/plan');
    setBusy(false);
  }

  return (
    <SafeAreaView style={s.screen}>
      <View style={s.header}>
        {step > 0 && calc < 0 && (
          <Pressable onPress={() => { setError(''); go(step - 1); }} hitSlop={12} style={s.back}>
            <Ionicons name="arrow-back" size={26} color={c.text} />
          </Pressable>
        )}
        <View style={s.dots}>
          {TITLES.map((_, i) => <View key={i} style={[s.dot, i <= step && { backgroundColor: c.primary }]} />)}
        </View>
      </View>
      <View style={{ flex: 1 }}>
        <Page i={0} pos={pos} active={step === 0}>
          <>
            <Mascot size={140} />
            <Text style={s.sub}>Registre refeições, treinos e acompanhe sua evolução. Vamos definir suas metas diárias em 1 minuto.</Text>
          </>
        </Page>

        <Page i={1} pos={pos} active={step === 1}>
          <View style={s.goals}>
            {FOCUS.map((f) => (
              <Raised key={f.k} on={focus === f.k} onPress={() => pick(() => setFocus(f.k), () => go(2))} style={[s.goal, focus === f.k && { backgroundColor: c.primary }]}>
                <Ionicons name={f.icon} size={36} color={focus === f.k ? '#fff' : c.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={[s.goalTxt, focus === f.k && { color: '#fff' }]}>{f.label}</Text>
                  <Text style={[s.goalDesc, focus === f.k && { color: '#fff' }]}>{f.desc}</Text>
                </View>
              </Raised>
            ))}
          </View>
        </Page>

        <Page i={2} pos={pos} active={step === 2}>
          <View style={s.row}>
            {([['m', 'Masculino', 'male', c.protein, '#3B5FC4'], ['f', 'Feminino', 'female', PINK, '#BE185D']] as const).map(([k, label, icon, col, dark]) => (
              <View key={k} style={s.sexWrap}>
                <View style={[s.sexShadow, { backgroundColor: dark }]} />
                <Pressable onPress={() => pick(() => setSex(k), () => go(3))} style={({ pressed }) => [s.sex, { backgroundColor: sex === k ? col : c.card, borderColor: col }, pressed && { transform: [{ translateY: 4 }] }]}>
                  <Ionicons name={icon} size={72} color={sex === k ? '#fff' : col} />
                  <Text style={[s.sexTxt, { color: sex === k ? '#fff' : col }]}>{label}</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </Page>

        <Page i={3} pos={pos} active={step === 3}>
          <Wheel label="" unit="anos" min={14} max={100} value={age} onChange={setAge} />
        </Page>

        <Page i={4} pos={pos} active={step === 4}>
          <Wheel label="" unit="cm" min={120} max={220} value={height} onChange={setHeight} />
        </Page>

        <Page i={5} pos={pos} active={step === 5}>
          <Wheel label="" unit="kg" min={30} max={200} value={weight} onChange={setWeight} />
        </Page>

        <Page i={6} pos={pos} active={step === 6}>
          <View style={s.goals}>
            {GOALS.map((g) => (
              <Raised key={g.k} on={goal === g.k} onPress={() => pick(() => { setGoal(g.k); setGoalW(weight + (g.k === 'lose' ? -5 : g.k === 'gain' ? 5 : 0)); }, () => go(7))} style={[s.goal, goal === g.k && { backgroundColor: c.primary }]}>
                <Ionicons name={g.icon} size={36} color={goal === g.k ? '#fff' : c.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={[s.goalTxt, goal === g.k && { color: '#fff' }]}>{g.label}</Text>
                  <Text style={[s.goalDesc, goal === g.k && { color: '#fff' }]}>{g.desc}</Text>
                </View>
              </Raised>
            ))}
          </View>
        </Page>

        <Page i={7} pos={pos} active={step === 7}>
          <>
            <Text style={s.sub}>Seu peso atual é {weight} kg. Gire para escolher sua meta.</Text>
            <Wheel label="" unit="kg" min={30} max={200} value={goalW} onChange={setGoalW} />
            <Text style={s.diff}>{diff < 0 ? 'Perder' : diff > 0 ? 'Ganhar' : 'Manter'} {diff ? `${Math.abs(diff)} kg` : `${weight} kg`}</Text>
            {goalW < Math.ceil(18.5 * (height / 100) ** 2) && (
              <Text style={s.warn}>Esse peso fica abaixo do considerado saudável para sua altura. Vale conversar com um profissional.</Text>
            )}
          </>
        </Page>

        <Page i={8} pos={pos} active={step === 8}>
          <View style={s.goals}>
            {ACTIVITY.map((a, i) => (
              <Raised key={i} on={act === i} onPress={() => pick(() => setAct(i), () => calculate(i))} style={[s.goal, act === i && { backgroundColor: c.primary }]}>
                <Ionicons name={a.icon} size={32} color={act === i ? '#fff' : c.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={[s.goalTxt, act === i && { color: '#fff' }]}>{a.label}</Text>
                  <Text style={[s.goalDesc, act === i && { color: '#fff' }]}>{a.desc}</Text>
                </View>
              </Raised>
            ))}
          </View>
        </Page>

        <Page i={9} pos={pos} active={step === 9}>
          <>
            {edit ? (
              <View style={s.row}>
                <Field label="Calorias" value={kcal} onChange={setKcal} unit="kcal" />
                <Field label="Proteína" value={protein} onChange={setProtein} unit="g" />
              </View>
            ) : (
              <View style={{ alignItems: 'center' }}>
                <Odometer value={kcalN} size={88} color={c.text} run={step === 9} />
                <Text style={s.kcalLabel}>calorias por dia</Text>
              </View>
            )}
            <View style={s.macros}>
              {([['Proteína', macros.protein, c.protein], ['Carboidratos', macros.carbs, c.carbs], ['Gordura', macros.fat, c.fat]] as const).map(([label, g, col]) => (
                <View key={label} style={s.macro}>
                  <View style={s.macroNum}>
                    <Odometer value={g} size={24} color={col} run={step === 9} />
                    <Text style={[s.macroUnit, { color: col }]}> g</Text>
                  </View>
                  <Text style={s.macroLabel}>{label}</Text>
                </View>
              ))}
            </View>
            <Text style={s.promise}>
              {weeks
                ? <>Com o Repla você consegue atingir seu objetivo em <Text style={s.weeks}>{weeks} {weeks === 1 ? 'semana' : 'semanas'}</Text>!</>
                : 'Com o Repla você mantém seu peso com constância.'}
            </Text>
            {!edit && <Pressable onPress={() => setEdit(true)}><Text style={s.link}>Ajustar valores</Text></Pressable>}
            {edit && <Text style={s.sub}>Ajuste se quiser. Dá para mudar depois no Perfil.</Text>}
            {!!error && <Text style={s.error}>{error}</Text>}
          </>
        </Page>
        {calc >= 0 && (
          <View style={s.loading}>
            <View style={s.track}><Animated.View style={[s.fill, barStyle]} /></View>
            <Text style={s.loadingTxt}>{STEPS[calc]}</Text>
          </View>
        )}
      </View>
      <View style={s.footer}>
        {step === 0 && (
          <>
            <Button label="Começar" onPress={() => go(1)} />
            {!signedIn && <Pressable onPress={() => router.push({ pathname: '/login', params: { mode: 'signin' } })}><Text style={s.link}>Já tenho conta</Text></Pressable>}
          </>
        )}
        {step === 7 && <Button label="Continuar" onPress={() => go(8)} />}
        {step >= 3 && step <= 5 && <Button label="Continuar" onPress={() => go(step + 1)} />}
        {step === 9 && <Button label={signedIn ? 'Concluir' : 'Continuar'} onPress={finish} busy={busy} />}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  body: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 },
  header: { height: 48, justifyContent: 'center', alignItems: 'center' },
  back: { position: 'absolute', left: 16 },
  footer: { minHeight: 88, paddingHorizontal: 24, paddingBottom: 12, justifyContent: 'center', alignItems: 'stretch' },
  loading: { ...StyleSheet.absoluteFill, backgroundColor: c.bg, justifyContent: 'center', alignItems: 'center', gap: 20 },
  track: { alignSelf: 'stretch', marginHorizontal: 40, height: 44, borderRadius: 12, backgroundColor: c.track, borderBottomWidth: 4, borderBottomColor: c.line, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 12, backgroundColor: c.primary, borderBottomWidth: 4, borderBottomColor: c.primaryDark },
  loadingTxt: { color: c.text, fontSize: 18, fontWeight: '600' },
  hint: { color: c.muted, fontSize: 15, textAlign: 'center', paddingHorizontal: 24 },
  wheel: { flexDirection: 'row', width: 160 },
  band: { position: 'absolute', left: 0, right: 0, top: 130, height: 50, borderRadius: 16, backgroundColor: c.card, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' },
  kcalLabel: { color: c.muted, fontSize: 18, fontWeight: '600' },
  diff: { color: c.amber, fontSize: 32, fontWeight: '800', marginTop: 8 },
  warn: { color: c.muted, fontSize: 13, textAlign: 'center', paddingHorizontal: 16 },
  promise: { color: c.text, fontSize: 20, fontWeight: '600', textAlign: 'center', marginTop: 8, paddingHorizontal: 8 },
  weeks: { color: c.amber, fontSize: 26, fontWeight: '800' },
  macros: { flexDirection: 'row', gap: 10, alignSelf: 'stretch', marginTop: 32 },
  macro: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 16 },
  macroNum: { flexDirection: 'row', alignItems: 'flex-end', paddingBottom: 2 },
  macroUnit: { fontSize: 14, fontWeight: '600', paddingBottom: 4 },
  macroLabel: { color: c.muted, fontSize: 14, fontWeight: '600' },
  big: { color: c.text, fontSize: 36, fontWeight: '700', textAlign: 'center' },
  goalDesc: { color: c.muted, fontSize: 14 },
  info: { ...lift, alignSelf: 'stretch', backgroundColor: c.card, borderRadius: r.card, padding: 20, gap: 12 },
  infoTxt: { color: c.text, fontSize: 16, lineHeight: 22, textAlign: 'center' },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 28, height: 6, borderRadius: 3, backgroundColor: c.line },
  title: { fontSize: 24, fontWeight: '600', color: c.text, textAlign: 'center', marginTop: 8, marginBottom: 4 },
  sub: { color: c.muted, fontSize: 15, textAlign: 'center' },
  label: { color: c.text, fontSize: 18, fontWeight: '600', alignSelf: 'flex-start', marginBottom: 4 },
  row: { flexDirection: 'row', gap: 10, alignSelf: 'stretch' },
  // 3D: a dark rounded slab sits 4px below the card, so its edge follows the corners instead of tapering
  sexWrap: { flex: 1, paddingBottom: 4 },
  sexShadow: { position: 'absolute', left: 0, right: 0, top: 4, bottom: 0, borderRadius: r.card },
  sex: { alignItems: 'center', gap: 6, paddingVertical: 20, borderRadius: r.card, borderWidth: 2 },
  sexTxt: { fontSize: 16, fontWeight: '700' },
  goals: { gap: 10, alignSelf: 'stretch' },
  goal: { ...lift, flexDirection: 'row', alignItems: 'center', gap: 16, padding: 20, borderRadius: r.card, backgroundColor: c.card },
  goalTxt: { color: c.text, fontSize: 18, fontWeight: '600' },
  input: { backgroundColor: c.card, borderRadius: r.btn, padding: 14, fontSize: 16, color: c.text },
  error: { color: c.danger, alignSelf: 'stretch' },
  link: { color: c.primary, fontSize: 15, marginTop: 8, textAlign: 'center' },
});
