import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { cached } from '@/lib/cache';
import { localDay, parseDay, r1, shiftDate, shortDate, today, ZERO } from '@/lib/nutrition';
import { useRefresh } from '@/lib/useRefresh';
import { exerciseProgress, nutritionRange, sessionHistory, weights, type DayTotals, type SessionRow } from '@/lib/stats';
import { supabase } from '@/lib/supabase';
import { c, r } from '@/theme';
import { BarChart, LineChart } from '@/ui/Charts';
import { Empty } from '@/ui/Empty';
import { Heatmap } from '@/ui/Heatmap';
import { Skeleton } from '@/ui/Skeleton';

type Data = { nut: DayTotals; sessions: SessionRow[]; weights: { date: string; kg: number }[]; goals: { goal_kcal: number; goal_protein_g: number } | null };

type Tab = 'sum' | 'nut' | 'wo' | 'body';
const TABS: [Tab, string][] = [['sum', 'Resumo'], ['nut', 'Nutrição'], ['wo', 'Treino'], ['body', 'Corpo']];
const dayNames = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export default function Progress() {
  const [range, setRange] = useState<7 | 30>(7);
  const [data, setData] = useState<Data | null>(null);
  const [exId, setExId] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('sum');
  const [metric, setMetric] = useState<'kcal' | 'prot'>('kcal');

  const load = useCallback(async () => {
    const d = await cached<Data>('progress', async () => {
      const [nut, sessions, w, g] = await Promise.all([
        nutritionRange(shiftDate(today(), -83), today()),
        sessionHistory(150),
        weights(90),
        supabase.from('profiles').select('goal_kcal, goal_protein_g').maybeSingle(),
      ]);
      return { nut, sessions, weights: w, goals: g.data };
    });
    if (d) setData(d);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const refreshControl = useRefresh(load);

  if (!data) {
    return <View style={s.screen}><View style={{ padding: 16, gap: 12 }}><Skeleton h={220} radius={20} /><Skeleton h={220} radius={20} /><Skeleton h={220} radius={20} /></View></View>;
  }

  const days = Array.from({ length: range }, (_, k) => shiftDate(today(), k - range + 1));
  const kcal = days.map((d) => Math.round((data.nut[d] ?? ZERO).kcal));
  const prot = days.map((d) => Math.round((data.nut[d] ?? ZERO).protein));
  const labels = days.map((d) => (range === 7 ? dayNames[parseDay(d).getDay()] : shortDate(d)));
  const logged = kcal.filter((v) => v > 0);
  const avg = (a: number[]) => { const l = a.filter((v) => v > 0); return l.length ? Math.round(l.reduce((x, y) => x + y, 0) / l.length) : 0; };

  const ex = exerciseProgress(data.sessions);
  const sel = ex.find((e) => e.id === exId) ?? ex[0];
  const weekAgo = shiftDate(today(), -6);
  const week = data.sessions.filter((x) => localDay(x.started_at) >= weekAgo);

  // weekly recap (last 7 days) + consistency calendar (last 12 weeks)
  const last7 = Array.from({ length: 7 }, (_, k) => shiftDate(today(), k - 6));
  const protDays = data.goals ? last7.filter((d) => (data.nut[d] ?? ZERO).protein >= data.goals!.goal_protein_g * 0.9).length : 0;
  const foodDays = last7.filter((d) => (data.nut[d] ?? ZERO).kcal > 0).length;
  const prevWeek = data.sessions.filter((x) => { const d = localDay(x.started_at); return d >= shiftDate(today(), -13) && d < weekAgo; }).length;
  const wk = data.weights.filter((x) => x.date >= weekAgo);
  const wkDelta = wk.length > 1 ? r1(wk[wk.length - 1].kg - wk[0].kg) : null;
  const insight = !week.length ? 'Nenhum treino nesta semana. Um treino curto hoje já muda o jogo.'
    : data.goals && foodDays >= 3 && protDays < 4 ? `Proteína é seu ponto fraco: meta batida em ${protDays} de 7 dias.`
    : foodDays < 5 ? `Você registrou comida em ${foodDays} de 7 dias. Registrar todo dia deixa os números confiáveis.`
    : 'Semana consistente. Continue assim!';
  const act: Record<string, number> = {};
  for (const [d, m] of Object.entries(data.nut)) if (m.kcal > 0) act[d] = 1;
  for (const x of data.sessions) act[localDay(x.started_at)] = (act[localDay(x.started_at)] ?? 0) | 2;
  let run = 0;
  for (let d = act[today()] ? today() : shiftDate(today(), -1); act[d]; d = shiftDate(d, -1)) run++;

  const w = data.weights;
  const wDelta = w.length > 1 ? r1(w[w.length - 1].kg - w[0].kg) : 0;

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}
      refreshControl={refreshControl}>
      <View style={s.tabs}>
        {TABS.map(([k, l]) => (
          <Pressable key={k} style={[s.tab, tab === k && s.tabOn]} onPress={() => setTab(k)}>
            <Text style={[s.tabTxt, tab === k && { color: c.white }]}>{l}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'sum' && (
        <>
          <View style={s.card}>
            <Text style={s.title}>Esta semana</Text>
            <View style={s.stats}>
              <Stat v={String(week.length)} l={`treinos${prevWeek ? ` (antes: ${prevWeek})` : ''}`} />
              <Stat v={`${foodDays}/7`} l="dias com refeição" />
              {data.goals ? <Stat v={`${protDays}/7`} l="metas de proteína" /> : null}
              {wkDelta != null ? <Stat v={`${wkDelta > 0 ? '+' : ''}${wkDelta}`} l="kg no peso" /> : null}
            </View>
            <Text style={s.sub}>{insight}</Text>
          </View>
          <View style={s.card}>
            <Text style={s.title}>Consistência</Text>
            <Text style={s.sub}>{run > 0 ? `Sequência atual: ${run} ${run === 1 ? 'dia' : 'dias'}` : 'Registre uma refeição ou treino para começar uma sequência'} · últimas 12 semanas</Text>
            <Heatmap act={act} />
          </View>
        </>
      )}

      {tab === 'nut' && (
        <View style={s.card}>
          <View style={s.tabs}>
            {([['kcal', 'Calorias'], ['prot', 'Proteína']] as const).map(([k, l]) => (
              <Pressable key={k} style={[s.tab, metric === k && s.tabOn]} onPress={() => setMetric(k)}>
                <Text style={[s.tabTxt, metric === k && { color: c.white }]}>{l}</Text>
              </Pressable>
            ))}
          </View>
          <View style={s.tabs}>
            {([7, 30] as const).map((n) => (
              <Pressable key={n} style={[s.tab, range === n && s.tabOn]} onPress={() => setRange(n)}>
                <Text style={[s.tabTxt, range === n && { color: c.white }]}>{n} dias</Text>
              </Pressable>
            ))}
          </View>
          {logged.length ? (
            <>
              <Text style={s.sub}>{metric === 'kcal'
                ? `Média ${avg(kcal)} kcal${data.goals ? ` · meta ${data.goals.goal_kcal}` : ''}`
                : `Média ${avg(prot)} g${data.goals ? ` · meta ${data.goals.goal_protein_g} g` : ''}`}</Text>
              {metric === 'kcal'
                ? <BarChart vals={kcal} labels={labels} goal={data.goals?.goal_kcal} />
                : <BarChart vals={prot} labels={labels} goal={data.goals?.goal_protein_g} color={c.protein} />}
            </>
          ) : <Empty title="Nenhum registro" sub="Registre refeições para ver seu gráfico." />}
        </View>
      )}

      {tab === 'body' && (
        <View style={s.card}>
          <Text style={s.title}>Peso corporal</Text>
          {w.length > 0 ? (
            <>
              <Text style={s.sub}>Atual {w[w.length - 1].kg} kg{w.length > 1 ? ` · ${wDelta > 0 ? '+' : ''}${wDelta} kg no período` : ''}</Text>
              <LineChart pts={w.map((x) => x.kg)} labels={w.map((x) => shortDate(x.date))} color={c.fat} unit="kg" />
            </>
          ) : <Empty title="Sem pesagens" sub="Registre seu peso na aba Perfil." />}
        </View>
      )}

      {tab === 'wo' && (
        <View style={s.card}>
          {data.sessions.length === 0 ? (
            <Empty title="Nenhum treino concluído" sub="Conclua um treino para ver cargas, recordes e histórico." />
          ) : (
            <>
              <View style={s.stats}>
                <Stat v={`${Math.round(week.reduce((a, x) => a + x.volume, 0))}`} l="kg de volume na semana" />
                <Stat v={String(data.sessions.length)} l="treinos no total" />
              </View>
              {sel && (
                <>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {ex.map((e) => (
                      <Pressable key={e.id} style={[s.chip, sel.id === e.id && s.chipOn]} onPress={() => setExId(e.id)}>
                        <Text style={[s.chipTxt, sel.id === e.id && { color: c.white }]}>{e.name}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                  <Text style={s.sub}>Recorde: <Text style={{ color: c.amber, fontWeight: '800' }}>🏆 {sel.pr} kg</Text> · carga máxima por treino</Text>
                  <LineChart pts={sel.points.map((p) => p.best)} labels={sel.points.map((p) => shortDate(p.date))} unit="kg" />
                </>
              )}
              <Text style={[s.title, { marginTop: 8 }]}>Histórico</Text>
              {data.sessions.slice(0, 15).map((x) => (
                <Pressable key={x.id} style={s.hist} onPress={() => setOpen(open === x.id ? null : x.id)}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={s.histName}>{x.workout}</Text>
                    <Text style={s.sub}>{shortDate(localDay(x.started_at))}</Text>
                  </View>
                  <Text style={s.sub}>{x.minutes} min · {Math.round(x.volume)} kg · {x.sets.length} séries</Text>
                  {open === x.id && (
                    <View style={{ gap: 2, marginTop: 6 }}>
                      {Object.entries(x.sets.reduce<Record<string, string[]>>((a, y) => ((a[y.name] ??= []).push(`${y.weight_kg}×${y.reps}`), a), {})).map(([n, v]) => (
                        <Text key={n} style={s.setTxt}><Text style={{ fontWeight: '700' }}>{n}: </Text>{v.join('  ·  ')}</Text>
                      ))}
                    </View>
                  )}
                </Pressable>
              ))}
            </>
          )}
        </View>
      )}
    </ScrollView>
  );
}

function Stat({ v, l }: { v: string; l: string }) {
  return (
    <View style={s.stat}>
      <Text style={s.statV}>{v}</Text>
      <Text style={[s.sub, { textAlign: 'center' }]}>{l}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  tabs: { flexDirection: 'row', backgroundColor: c.track, borderRadius: 12, padding: 3 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10 },
  tabOn: { backgroundColor: c.primary },
  tabTxt: { color: c.text, fontWeight: '600' },
  card: { backgroundColor: c.card, borderRadius: r.card, padding: 16, gap: 10 },
  title: { fontSize: 16, fontWeight: '700', color: c.text },
  sub: { fontSize: 12, color: c.muted },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, backgroundColor: c.bg, borderRadius: r.sm, padding: 10, alignItems: 'center', gap: 2 },
  statV: { fontSize: 22, fontWeight: '800', color: c.text },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, backgroundColor: c.bg },
  chipOn: { backgroundColor: c.primary },
  chipTxt: { color: c.text, fontSize: 13 },
  hist: { backgroundColor: c.bg, borderRadius: r.sm, padding: 12, gap: 2 },
  histName: { fontSize: 14, fontWeight: '700', color: c.text },
  setTxt: { fontSize: 12, color: c.text },
});
