import { useState } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { c, r, lift } from '@/theme';
import { Raised } from '@/ui/Raised';
import { Button } from '@/ui/Button';
import { saveDraft, type Plan } from '@/lib/draft';

// Placeholder pricing: billing is not wired yet, nobody is charged.
const PLANS: { k: Plan; name: string; price: string; per: string; note?: string; badge?: string }[] = [
  { k: 'annual', name: 'Anual', price: 'R$ 149,90', per: '/ano', note: 'R$ 12,49 por mês', badge: 'Economize 37%' },
  { k: 'monthly', name: 'Mensal', price: 'R$ 19,90', per: '/mês' },
  { k: 'free', name: 'Grátis', price: 'R$ 0', per: '', note: 'Recursos básicos' },
];

const PREMIUM = ['Histórico e gráficos sem limite', 'Modelos de treino e catálogo completo', 'Exportar seus dados', 'Lembretes inteligentes'];

export default function PlanScreen() {
  const [plan, setPlan] = useState<Plan>('annual');

  function next() {
    saveDraft({ plan });
    router.push({ pathname: '/login', params: { mode: 'signup' } });
  }

  return (
    <SafeAreaView style={s.screen}>
      <ScrollView contentContainerStyle={s.body}>
        <Text style={s.title}>Escolha seu plano</Text>
        <Text style={s.sub}>Suas metas estão prontas. Você pode trocar de plano quando quiser.</Text>
        <View style={s.list}>
          {PLANS.map((p) => {
            const on = plan === p.k;
            return (
              <Raised key={p.k} on={on} onPress={() => setPlan(p.k)} style={[s.card, on && { borderColor: c.primary, backgroundColor: c.primarySoft }]}>
                {!!p.badge && <View style={s.badge}><Text style={s.badgeTxt}>{p.badge}</Text></View>}
                <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={26} color={on ? c.primary : c.faint} />
                <View style={{ flex: 1 }}>
                  <Text style={s.name}>{p.name}</Text>
                  {!!p.note && <Text style={s.note}>{p.note}</Text>}
                </View>
                <Text style={s.price}>{p.price}<Text style={s.per}>{p.per}</Text></Text>
              </Raised>
            );
          })}
        </View>
        {plan !== 'free' && (
          <View style={s.perks}>
            {PREMIUM.map((t) => (
              <View key={t} style={s.perk}>
                <Ionicons name="checkmark-circle" size={20} color={c.primary} />
                <Text style={s.perkTxt}>{t}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
      <View style={s.footer}>
        <Button label="Continuar" onPress={next} />
        <Text style={s.fine}>{plan === 'free' ? 'Sem custo.' : 'Você não será cobrado agora.'}</Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  body: { padding: 24, gap: 12 },
  title: { fontSize: 26, fontWeight: '700', color: c.text, textAlign: 'center', marginTop: 12 },
  sub: { color: c.muted, fontSize: 15, textAlign: 'center' },
  list: { gap: 12, marginTop: 8 },
  card: { ...lift, flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderRadius: r.card, backgroundColor: c.card, borderWidth: 2, borderColor: c.line },
  badge: { position: 'absolute', top: -12, right: 14, backgroundColor: c.amber, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 },
  badgeTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },
  name: { color: c.text, fontSize: 18, fontWeight: '600' },
  note: { color: c.muted, fontSize: 13 },
  price: { color: c.text, fontSize: 18, fontWeight: '700' },
  per: { color: c.muted, fontSize: 13, fontWeight: '400' },
  perks: { gap: 8, marginTop: 8 },
  perk: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  perkTxt: { color: c.text, fontSize: 15 },
  footer: { paddingHorizontal: 24, paddingBottom: 12, gap: 8 },
  fine: { color: c.muted, fontSize: 13, textAlign: 'center' },
});
