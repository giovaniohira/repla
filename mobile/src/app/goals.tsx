import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '@/lib/haptics';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ACTIVITY, calcTargets, GOALS, splitMacros } from '@/lib/goals';
import { num, today } from '@/lib/nutrition';
import { supabase } from '@/lib/supabase';
import { c, r } from '@/theme';
import { Button } from '@/ui/Button';
import { Skeleton } from '@/ui/Skeleton';
import { toast } from '@/ui/Toast';

type Form = { sex: 'm' | 'f'; age: string; height: string; weight: string; goalWeight: string; goal: 'lose' | 'maintain' | 'gain'; act: number; kcal: string; protein: string; carbs: string; fat: string };

// Edit body data and daily goals; "Recalcular" fills the goals from the body data (Mifflin-St Jeor).
export default function Goals() {
  const [f, setF] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from('profiles').select('*').maybeSingle().then(({ data: p }) => {
      setF({
        sex: p?.sex ?? 'm', age: String(p?.age ?? 25), height: String(p?.height_cm ?? 170), weight: String(p?.weight_kg ?? 70),
        goalWeight: p?.goal_weight_kg ? String(p.goal_weight_kg) : '',
        goal: p?.goal_type ?? 'maintain', act: p?.activity ?? 1,
        kcal: String(p?.goal_kcal ?? 2000), protein: String(p?.goal_protein_g ?? 120), carbs: String(p?.goal_carbs_g ?? 250), fat: String(p?.goal_fat_g ?? 70),
      });
    });
  }, []);

  if (!f) return <View style={{ padding: 16, gap: 12 }}><Skeleton h={60} /><Skeleton h={120} /><Skeleton h={120} /></View>;
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => x && { ...x, [k]: v });

  function recalc() {
    const t = calcTargets({ sex: f!.sex, age: num(f!.age) || 25, height: num(f!.height) || 170, weight: num(f!.weight) || 70, goal: f!.goal, act: f!.act });
    setF((x) => x && { ...x, kcal: String(t.kcal), protein: String(t.protein), carbs: String(t.carbs), fat: String(t.fat) });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    toast('Metas recalculadas. Toque em Salvar para aplicar.');
  }

  // when kcal or protein change by hand, carbs/fat follow
  function onEnergy(k: 'kcal' | 'protein', v: string) {
    setF((x) => {
      if (!x) return x;
      const n = { ...x, [k]: v };
      const kc = num(n.kcal), p = num(n.protein);
      if (kc > 0 && p >= 0) { const t = splitMacros(kc, p); return { ...n, carbs: String(t.carbs), fat: String(t.fat) }; }
      return n;
    });
  }

  async function save() {
    const k = Math.round(num(f!.kcal)), p = Math.round(num(f!.protein)), cb = Math.round(num(f!.carbs)), ft = Math.round(num(f!.fat));
    if (!(k >= 800 && k <= 10000 && p >= 20 && p <= 500 && cb >= 0 && ft >= 0)) return toast('Metas fora do intervalo razoável.', { error: true });
    const w = num(f!.weight);
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from('profiles').update({
      goal_kcal: k, goal_protein_g: p, goal_carbs_g: cb, goal_fat_g: ft, sex: f!.sex, age: Math.round(num(f!.age)) || null,
      height_cm: num(f!.height) || null, weight_kg: w || null, goal_weight_kg: num(f!.goalWeight) || null, activity: f!.act, goal_type: f!.goal,
    }).eq('user_id', u.user!.id);
    if (!error && w >= 20) await supabase.from('body_weights').upsert({ date: today(), weight_kg: w, deleted_at: null }, { onConflict: 'user_id,date' });
    setBusy(false);
    if (error) return toast(error.message, { error: true });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    toast('Metas salvas');
    router.back();
  }

  const num_ = (k: keyof Form, label: string, unit: string, onChange?: (v: string) => void) => (
    <View style={{ flex: 1, gap: 4 }}>
      <Text style={s.lbl}>{label}</Text>
      <View style={s.inputBox}>
        <TextInput style={s.input} keyboardType="decimal-pad" value={String(f[k])} onChangeText={onChange ?? ((v) => set(k, v as never))} selectTextOnFocus />
        <Text style={s.unit}>{unit}</Text>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView style={s.screen} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <View style={s.card}>
          <Text style={s.title}>Seus dados</Text>
          <View style={s.row}>
            {([['m', 'Masculino'], ['f', 'Feminino']] as const).map(([k, l]) => (
              <Pressable key={k} style={[s.chip, f.sex === k && s.chipOn]} onPress={() => set('sex', k)}>
                <Text style={[s.chipTxt, f.sex === k && { color: c.white }]}>{l}</Text>
              </Pressable>
            ))}
          </View>
          <View style={s.row}>{num_('age', 'Idade', 'anos')}{num_('height', 'Altura', 'cm')}{num_('weight', 'Peso', 'kg')}</View>
          <View style={s.row}>{num_('goalWeight', 'Meta de peso (opcional)', 'kg')}</View>
          <Text style={s.lbl}>Objetivo</Text>
          <View style={s.row}>
            {GOALS.map((g) => (
              <Pressable key={g.k} style={[s.chip, f.goal === g.k && s.chipOn]} onPress={() => set('goal', g.k)}>
                <Ionicons name={g.icon} size={16} color={f.goal === g.k ? c.white : c.primary} />
                <Text style={[s.chipTxt, f.goal === g.k && { color: c.white }]}>{g.label}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={s.lbl}>Atividade física</Text>
          <View style={{ gap: 6 }}>
            {ACTIVITY.map((a, i) => (
              <Pressable key={i} style={[s.act, f.act === i && s.chipOn]} onPress={() => set('act', i)}>
                <Ionicons name={a.icon} size={20} color={f.act === i ? c.white : c.primary} />
                <Text style={[s.chipTxt, f.act === i && { color: c.white }]}>{a.label}</Text>
              </Pressable>
            ))}
          </View>
          <Button label="Recalcular metas" onPress={recalc} />
        </View>

        <View style={s.card}>
          <Text style={s.title}>Metas diárias</Text>
          <View style={s.row}>{num_('kcal', 'Calorias', 'kcal', (v) => onEnergy('kcal', v))}{num_('protein', 'Proteína', 'g', (v) => onEnergy('protein', v))}</View>
          <View style={s.row}>{num_('carbs', 'Carboidratos', 'g')}{num_('fat', 'Gordura', 'g')}</View>
          <Text style={s.lbl}>Carboidratos e gordura se ajustam sozinhos; você pode editá-los.</Text>
        </View>
        <Button label="Salvar" onPress={save} busy={busy} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  card: { backgroundColor: c.card, borderRadius: r.card, padding: 16, gap: 12 },
  title: { fontSize: 16, fontWeight: '700', color: c.text },
  lbl: { fontSize: 12, color: c.muted },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 16, backgroundColor: c.bg },
  chipOn: { backgroundColor: c.primary },
  chipTxt: { color: c.text, fontSize: 13, fontWeight: '600' },
  act: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: r.sm, backgroundColor: c.bg },
  inputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.bg, borderRadius: r.sm, paddingRight: 10 },
  input: { flex: 1, padding: 12, fontSize: 16, color: c.text, fontWeight: '600' },
  unit: { color: c.muted, fontSize: 12 },
});
