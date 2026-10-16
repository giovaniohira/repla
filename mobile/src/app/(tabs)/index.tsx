import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useDay } from '@/lib/today';
import { useRefresh } from '@/lib/useRefresh';
import { cached } from '@/lib/cache';
import { activeSession, nextWorkout, streakInfo, type Next } from '@/lib/stats';
import { ALL_ON, dismissedPrompt, dismissPrompt, getPrefs, setPrefs, syncReminders } from '@/lib/reminders';
import { startWorkout } from '@/lib/gifs';
import { ago, r1 } from '@/lib/nutrition';
import { c, r } from '@/theme';
import { Button } from '@/ui/Button';
import { Ring } from '@/ui/Ring';
import { Skeleton } from '@/ui/Skeleton';
import { toast } from '@/ui/Toast';

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
};

export default function Today() {
  const { goals, total, loading, load } = useDay();
  const [days, setDays] = useState(0);
  const [next, setNext] = useState<Next>(null);
  const [nextLoaded, setNextLoaded] = useState(false);
  const [active, setActive] = useState<{ workout: string; name: string } | null>(null);
  const [starting, setStarting] = useState(false);
  const [ask, setAsk] = useState(false); // show the "turn on reminders" card

  const loadExtra = useCallback(async () => {
    activeSession().then(setActive, () => {});
    const [st, nw] = await Promise.all([cached('streakInfo', streakInfo), cached('next', nextWorkout)]);
    setDays(st?.days ?? 0);
    if (st) syncReminders(st);
    setAsk((await getPrefs()) === null && !(await dismissedPrompt()));
    setNext(nw ?? null);
    setNextLoaded(true);
  }, []);
  useFocusEffect(useCallback(() => { loadExtra(); }, [loadExtra]));
  const refreshControl = useRefresh(load, loadExtra);

  async function enableReminders() {
    setAsk(false);
    if (!(await setPrefs(ALL_ON))) toast('Sem permissão de notificações. Ative nos Ajustes do celular.', { error: true });
    else loadExtra();
  }

  async function start(id: string) {
    setStarting(true);
    await startWorkout(id);
    setStarting(false);
  }

  const kcal = Math.round(total.kcal);
  const left = goals ? goals.goal_kcal - kcal : 0;

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.body} refreshControl={refreshControl}>
      <View style={s.top}>
        <View>
          <Text style={s.hi}>{greeting()}!</Text>
          <Text style={s.date}>{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
        </View>
        {days > 0 && (
          <View style={s.streak}>
            <Ionicons name="flame" size={18} color={c.amber} />
            <Text style={s.streakTxt}>{days} {days === 1 ? 'dia' : 'dias'}</Text>
          </View>
        )}
      </View>

      <Animated.View entering={FadeInDown.delay(50)} style={[s.card, { alignItems: 'center', gap: 16 }]}>
        {loading || !goals ? (
          <Skeleton h={200} w={200} radius={100} />
        ) : (
          <Ring value={kcal} goal={goals.goal_kcal} label={`de ${goals.goal_kcal} kcal`}
            sub={left >= 0 ? `restam ${left}` : `${-left} acima da meta`} />
        )}
        <View style={s.macros}>
          {loading || !goals ? [0, 1, 2].map((i) => <Skeleton key={i} h={40} style={{ flex: 1 }} />) : (
            <>
              <Macro label="Proteína" v={total.protein} goal={goals.goal_protein_g} color={c.protein} />
              <Macro label="Carbo" v={total.carbs} goal={goals.goal_carbs_g} color={c.carbs} />
              <Macro label="Gordura" v={total.fat} goal={goals.goal_fat_g} color={c.fat} />
            </>
          )}
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(120)} style={s.card}>
        <View style={s.cardHead}>
          <Ionicons name="barbell" size={20} color={c.primary} />
          <Text style={s.cardTitle}>Treino de hoje</Text>
        </View>
        {active ? (
          <>
            <View style={{ gap: 2 }}>
              <Text style={s.wName}>{active.name}</Text>
              <Text style={s.sub}>Treino em andamento</Text>
            </View>
            <Button label="Continuar treino" onPress={() => start(active.workout)} busy={starting} />
          </>
        ) : !nextLoaded ? <Skeleton h={48} /> : next ? (
          <>
            <View style={{ gap: 2 }}>
              <Text style={s.wName}>{next.name}</Text>
              <Text style={s.sub}>{next.n} exercício{next.n === 1 ? '' : 's'} · {ago(next.last)}</Text>
            </View>
            <Button label="Iniciar treino" onPress={() => start(next.id)} busy={starting} />
          </>
        ) : (
          <>
            <Text style={s.sub}>Você ainda não tem uma rotina. Comece por um modelo pronto (Push/Pull/Legs ou Full body) e ajuste as cargas.</Text>
            <Button label="Escolher um modelo pronto" onPress={() => router.push('/templates')} />
          </>
        )}
      </Animated.View>

      {ask && (
        <View style={s.card}>
          <View style={s.cardHead}>
            <Ionicons name="notifications" size={20} color={c.primary} />
            <Text style={s.cardTitle}>Não perca o ritmo</Text>
          </View>
          <Text style={s.sub}>Avisamos quando o descanso entre séries acabar, na hora das refeições e quando sua sequência estiver em risco.</Text>
          <Button label="Ativar lembretes" onPress={enableReminders} />
          <Pressable onPress={() => { dismissPrompt(); setAsk(false); }}><Text style={[s.sub, { textAlign: 'center', padding: 6 }]}>Agora não</Text></Pressable>
        </View>
      )}

      <Animated.View entering={FadeInDown.delay(190)}>
        <Button label="Adicionar refeição" onPress={() => router.push('/add-food')} />
      </Animated.View>
    </ScrollView>
  );
}

function Macro({ label, v, goal, color }: { label: string; v: number; goal: number; color: string }) {
  const pct = goal ? Math.min(100, (v / goal) * 100) : 0;
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <Text style={s.macroLab}>{label}</Text>
      <View style={s.track}><View style={[s.fill, { width: `${pct}%`, backgroundColor: color }]} /></View>
      <Text style={s.macroVal}>{r1(v)} <Text style={{ color: c.faint }}>/ {goal} g</Text></Text>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  body: { padding: 16, gap: 14 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hi: { fontSize: 26, fontWeight: '800', color: c.text },
  date: { fontSize: 13, color: c.muted, textTransform: 'capitalize' },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: c.amberSoft, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  streakTxt: { color: c.amber, fontWeight: '800' },
  card: { backgroundColor: c.card, borderRadius: r.card, padding: 16, gap: 14 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: c.text },
  wName: { fontSize: 20, fontWeight: '700', color: c.text },
  sub: { fontSize: 13, color: c.muted },
  macros: { flexDirection: 'row', gap: 12, alignSelf: 'stretch' },
  macroLab: { fontSize: 12, color: c.muted },
  macroVal: { fontSize: 12, fontWeight: '700', color: c.text },
  track: { height: 8, borderRadius: 4, backgroundColor: c.track, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
});
