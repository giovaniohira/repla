import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { exportData } from '@/lib/export';
import { GOALS } from '@/lib/goals';
import { localDay, num, r1, today } from '@/lib/nutrition';
import { logWeight, sessionHistory, streak, weights } from '@/lib/stats';
import { supabase } from '@/lib/supabase';
import { c, r } from '@/theme';
import { Mascot } from '@/ui/Mascot';
import { Row, Section } from '@/ui/Rows';
import { toast } from '@/ui/Toast';
import { dialog } from '@/ui/Dialog';

type P = {
  display_name: string | null; goal_kcal: number; goal_protein_g: number; goal_carbs_g: number; goal_fat_g: number;
  weight_kg: number | null; goal_weight_kg: number | null; goal_type: string | null;
};
type Sum = { days: number; month: number; first: number | null; last: number | null };

export default function Profile() {
  const [email, setEmail] = useState('');
  const [p, setP] = useState<P | null>(null);
  const [sum, setSum] = useState<Sum | null>(null);
  const [kg, setKg] = useState('');

  const load = useCallback(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ''));
    supabase.from('profiles').select('display_name, goal_kcal, goal_protein_g, goal_carbs_g, goal_fat_g, weight_kg, goal_weight_kg, goal_type').maybeSingle().then(({ data }) => setP(data as P | null));
    const month = today().slice(0, 7);
    Promise.all([streak(), sessionHistory(60), weights(365)]).then(([days, ss, w]) => setSum({
      days, month: ss.filter((x) => localDay(x.started_at).startsWith(month)).length, first: w[0]?.kg ?? null, last: w.at(-1)?.kg ?? null,
    })).catch(() => {});
  }, []);
  useFocusEffect(load);

  async function saveWeight() {
    const v = num(kg);
    if (!(v >= 20 && v <= 400)) return toast('Informe um peso válido em kg.', { error: true });
    const { data: u } = await supabase.auth.getUser();
    const [a, b] = await Promise.all([logWeight(v), supabase.from('profiles').update({ weight_kg: v }).eq('user_id', u.user!.id)]);
    if (a.error || b.error) return toast((a.error ?? b.error)!.message, { error: true });
    setKg('');
    toast('Peso registrado');
    load();
  }

  function confirmSignOut() {
    dialog('Sair da conta?', undefined, [{ text: 'Cancelar', style: 'cancel' }, { text: 'Sair', onPress: () => supabase.auth.signOut() }]);
  }

  function deleteAccount() {
    dialog('Excluir conta?', 'Todos os seus dados (refeições, treinos e histórico) serão apagados permanentemente. Essa ação não pode ser desfeita.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir tudo', style: 'destructive', onPress: async () => {
        const { error } = await supabase.rpc('delete_my_account');
        if (error) return toast(error.message, { error: true });
        await supabase.auth.signOut();
      } },
    ]);
  }

  const goal = GOALS.find((g) => g.k === p?.goal_type)?.label;
  const left = p?.goal_weight_kg && sum?.last != null ? r1(p.goal_weight_kg - sum.last) : null;
  const diff = sum?.first != null && sum.last != null ? r1(sum.last - sum.first) : null;

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
      <View style={s.head}>
        <Mascot size={72} />
        <View style={{ flex: 1 }}>
          <Text style={s.name} numberOfLines={1}>{p?.display_name || email}</Text>
          {!!p?.display_name && <Text style={s.sub} numberOfLines={1}>{email}</Text>}
          <Text style={s.sub}>{[goal, p?.weight_kg ? `${p.weight_kg} kg` : null].filter(Boolean).join(' · ') || 'Complete seus dados'}</Text>
        </View>
      </View>

      <View style={s.stats}>
        <Stat icon="flame" color={c.amber} v={sum ? String(sum.days) : '—'} l="dias seguidos" />
        <Stat icon="barbell" color={c.primary} v={sum ? String(sum.month) : '—'} l="treinos no mês" />
        <Stat icon="scale" color={c.fat} v={diff == null ? '—' : `${diff > 0 ? '+' : ''}${diff}`} l="kg no ano" />
      </View>

      <Section title="Meus dados">
        <Pressable style={s.card} onPress={() => router.push('/goals')}>
          <View style={s.cardHead}>
            <Text style={s.title}>Metas diárias</Text>
            <Ionicons name="create-outline" size={20} color={c.primary} />
          </View>
          <View style={s.goals}>
            <G v={p?.goal_kcal} u="kcal" l="Calorias" color={c.primary} />
            <G v={p?.goal_protein_g} u="g" l="Proteína" color={c.protein} />
            <G v={p?.goal_carbs_g} u="g" l="Carbo" color={c.carbs} />
            <G v={p?.goal_fat_g} u="g" l="Gordura" color={c.fat} />
          </View>
        </Pressable>
        <View style={s.card}>
          <Text style={s.title}>Peso de hoje</Text>
          {left != null && <Text style={s.sub}>{left === 0 ? 'Você chegou na meta!' : `${Math.abs(left)} kg ${left < 0 ? 'acima' : 'abaixo'} da meta de ${p!.goal_weight_kg} kg`}</Text>}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput style={s.input} keyboardType="decimal-pad" placeholder="kg" placeholderTextColor={c.faint} value={kg} onChangeText={setKg} onSubmitEditing={saveWeight} />
            <Pressable style={s.save} onPress={saveWeight}><Text style={s.saveTxt}>Registrar</Text></Pressable>
          </View>
        </View>
      </Section>

      <Section title="Conta">
        <Row icon="settings-outline" label="Aparência, treino e lembretes" onPress={() => router.push('/settings')} />
        <Row icon="person-circle-outline" label="Nome, e-mail e senha" onPress={() => router.push('/account')} />
        <Row icon="download-outline" label="Exportar meus dados" onPress={() => exportData().catch((e) => toast(e.message ?? 'Falha ao exportar', { error: true }))} />
        <Row icon="log-out-outline" label="Sair" onPress={confirmSignOut} />
        <Row icon="information-circle-outline" label="Sobre, privacidade e termos" onPress={() => router.push('/about')} />
        <Row icon="trash-outline" label="Excluir conta" danger onPress={deleteAccount} />
      </Section>
    </ScrollView>
  );
}

function Stat({ icon, color, v, l }: { icon: keyof typeof Ionicons.glyphMap; color: string; v: string; l: string }) {
  return (
    <View style={s.stat}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={s.sv}>{v}</Text>
      <Text style={s.sub}>{l}</Text>
    </View>
  );
}

function G({ v, u, l, color }: { v?: number; u: string; l: string; color: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={[s.gv, { color }]}>{v ?? '—'}</Text>
      <Text style={s.sub}>{u}</Text>
      <Text style={s.sub}>{l}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  head: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 8 },
  name: { fontSize: 17, fontWeight: '700', color: c.text },
  sub: { fontSize: 12, color: c.muted },
  stats: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, alignItems: 'center', gap: 2, backgroundColor: c.card, borderRadius: r.card, padding: 12 },
  sv: { fontSize: 20, fontWeight: '800', color: c.text },
  card: { backgroundColor: c.card, borderRadius: r.card, padding: 16, gap: 12 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 15, fontWeight: '700', color: c.text },
  goals: { flexDirection: 'row' },
  gv: { fontSize: 22, fontWeight: '800' },
  input: { flex: 1, backgroundColor: c.bg, borderRadius: r.sm, padding: 12, fontSize: 15, color: c.text },
  save: { backgroundColor: c.primary, borderRadius: r.sm, paddingHorizontal: 18, justifyContent: 'center' },
  saveTxt: { color: c.white, fontWeight: '700' },
});
