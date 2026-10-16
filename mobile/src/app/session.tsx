import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '@/lib/haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { num } from '@/lib/nutrition';
import { gifUrl } from '@/lib/catalog';
import { clearGifs } from '@/lib/gifs';
import { enqueue, flush, uuid } from '@/lib/outbox';
import { prefs } from '@/lib/prefs';
import { cancelRest, scheduleRest } from '@/lib/reminders';
import { closeStale, e1rm, lastSets, nextWorkout, prs, RESUME_MS, streak, type Next, type SetRow } from '@/lib/stats';
import { GifModal } from '@/ui/GifModal';
import { Button } from '@/ui/Button';
import { Confetti } from '@/ui/Confetti';
import { Skeleton } from '@/ui/Skeleton';
import { Stepper } from '@/ui/Stepper';
import { toast } from '@/ui/Toast';
import { dialog } from '@/ui/Dialog';
import { c, r } from '@/theme';

type Ex = { exercise_id: string; name: string; gif?: string; sets: number; reps: number; weight: string; rest: number };
type Log = { id: string; exercise_id: string; name: string; set: number; w: number; reps: number };
type Rest = { key: number; endAt: number; total: number; next: string };

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const STEP_KG = 2.5;

async function fetchExercises(workout: string): Promise<Ex[]> {
  const { data, error } = await supabase.from('workout_exercises')
    .select('exercise_id, target_sets, target_reps, target_weight_kg, rest_s, exercises(name, catalog_key)')
    .eq('workout_id', workout).is('deleted_at', null).order('position');
  if (error) throw error;
  return (data ?? []).map((x: any) => ({
    exercise_id: x.exercise_id, name: x.exercises?.name ?? '?', gif: gifUrl(x.exercises?.catalog_key),
    sets: x.target_sets, reps: x.target_reps, weight: x.target_weight_kg == null ? '' : String(x.target_weight_kg), rest: x.rest_s,
  }));
}

// Last session hit every target rep on every set: suggest a bit more weight.
function shouldProgress(e: Ex, l: SetRow[] | undefined) {
  return !!l && l.length >= e.sets && l.every((x) => x.reps >= e.reps && x.weight_kg > 0);
}

// Rest countdown shown above the next set, so weight/reps can be adjusted while resting.
function RestBar({ rest, onAdjust, onEnd }: { rest: Rest; onAdjust: (d: number) => void; onEnd: () => void }) {
  const [now, setNow] = useState(() => Date.now());
  const done = useRef(false);
  const left = Math.max(0, rest.endAt - now);

  // local notification for when the phone is locked or the app is in the background; replaced on ±15 s, cancelled on skip/unmount
  useEffect(() => {
    scheduleRest(new Date(rest.endAt), rest.next);
    return () => { cancelRest(); };
  }, [rest.endAt, rest.next]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (left === 0 && !done.current) {
      done.current = true;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onEnd();
    }
  });

  return (
    <View style={s.rest}>
      <View style={s.restTop}>
        <Text style={s.restLbl}>Descanso</Text>
        <Text style={s.restTime}>{mmss(Math.ceil(left / 1000))}</Text>
      </View>
      <View style={s.track}><View style={[s.fill, { width: `${Math.min(100, (left / (rest.total * 1000)) * 100)}%` }]} /></View>
      <View style={s.restBtns}>
        <Pressable hitSlop={8} onPress={() => onAdjust(-15)}><Text style={s.link}>−15 s</Text></Pressable>
        <Pressable hitSlop={8} onPress={() => onAdjust(15)}><Text style={s.link}>+15 s</Text></Pressable>
        <Pressable hitSlop={8} onPress={onEnd}><Text style={s.link}>Pular</Text></Pressable>
      </View>
    </View>
  );
}

export default function Session() {
  useEffect(() => {
    if (!prefs.keepAwake) return;
    activateKeepAwakeAsync('session').catch(() => {});
    return () => { deactivateKeepAwake('session').catch(() => {}); };
  }, []);
  const { workout } = useLocalSearchParams<{ workout: string }>();
  const [exercises, setExercises] = useState<Ex[] | null>(null);
  const [i, setI] = useState(0); // current exercise
  const [rest, setRest] = useState<Rest | null>(null);
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [up, setUp] = useState(false); // weight was bumped by the progression suggestion
  const [gif, setGif] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [logs, setLogs] = useState<Log[]>([]);
  const [summary, setSummary] = useState<{ minutes: number; volume: number; prs: string[]; delta: number | null } | null>(null);
  const [extra, setExtra] = useState<{ days: number; next: Next } | null>(null); // streak + next routine, loaded after the outbox flushes
  const [now, setNow] = useState(Date.now());
  const sessionId = useRef<string | null>(null);
  const startedAt = useRef(Date.now());
  const last = useRef<Record<string, SetRow[]>>({});
  const best = useRef<Record<string, number>>({}); // best e1RM per exercise
  const newPrs = useRef<Set<string>>(new Set());
  const tapped = useRef(false); // swallows a double tap on "Concluir série"
  const exRef = useRef(exercises);
  exRef.current = exercises;

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!summary) return;
    flush().then(() => Promise.all([streak(), nextWorkout()])).then(([days, next]) => setExtra({ days, next })).catch(() => {});
  }, [summary]);

  useEffect(() => {
    (async () => {
      await flush(); // sets left over from a dropped connection go first, so the resume below sees them
      const list = await fetchExercises(workout).catch(() => []);
      if (!list.length) { dialog('Rotina vazia', 'Adicione exercícios primeiro.'); return router.back(); }
      const ids = list.map((x) => x.exercise_id);
      [last.current, best.current] = await Promise.all([lastSets(ids).catch(() => ({})), prs(ids).catch(() => ({}))]);

      // resume an unfinished session of this routine (recent enough) instead of starting a new one
      const open = await supabase.from('sessions').select('id, started_at, set_logs(id, exercise_id, set_number, weight_kg, reps, deleted_at)')
        .eq('workout_id', workout).is('ended_at', null).is('deleted_at', null)
        .gte('started_at', new Date(Date.now() - RESUME_MS).toISOString()).order('started_at', { ascending: false }).limit(1).maybeSingle();
      closeStale(open.data?.id ?? null).catch(() => {}); // older/other abandoned sessions go to history
      let done: Log[] = [];
      if (open.data) {
        sessionId.current = open.data.id;
        startedAt.current = +new Date(open.data.started_at);
        done = ((open.data as any).set_logs as any[]).filter((x) => !x.deleted_at).sort((a, b) => a.set_number - b.set_number)
          .map((x) => ({ id: x.id, exercise_id: x.exercise_id, name: list.find((e) => e.exercise_id === x.exercise_id)?.name ?? '?', set: x.set_number, w: +x.weight_kg, reps: x.reps }));
        if (done.length) toast('Treino retomado de onde você parou.');
      }
      setLogs(done);
      setExercises(list);
      const k = Math.max(0, nextOpen(list, 0, done));
      setI(k);
      prefill(list[k], done);
    })();
  }, [workout]);

  // back from the catalog: append exercises added to the routine mid-workout (local set tweaks are kept)
  useFocusEffect(useCallback(() => {
    const cur = exRef.current;
    if (!cur) return;
    fetchExercises(workout).then(async (list) => {
      const added = list.filter((x) => !cur.some((e) => e.exercise_id === x.exercise_id));
      if (!added.length) return;
      const ids = added.map((x) => x.exercise_id);
      const [l, b] = await Promise.all([lastSets(ids).catch(() => ({})), prs(ids).catch(() => ({}))]);
      Object.assign(last.current, l);
      Object.assign(best.current, b);
      setExercises((xs) => [...(xs ?? []), ...added]);
    }).catch(() => {});
  }, [workout]));

  // Android back button: same as the close button
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (summary) leave(); else quit();
      return true;
    });
    return () => sub.remove();
  });

  // first exercise (from `from`, wrapping around) with sets still to do; -1 if all done
  function nextOpen(list: Ex[], from: number, ls: Log[], skip = -1) {
    for (let d = 0; d < list.length; d++) {
      const k = (from + d) % list.length;
      if (k !== skip && ls.filter((l) => l.exercise_id === list[k].exercise_id).length < list[k].sets) return k;
    }
    return -1;
  }

  // weight: today's previous set, else last session's same set (+2.5 kg if every rep was hit), else the routine target
  function prefill(e: Ex, ls: Log[]) {
    const mine = ls.filter((l) => l.exercise_id === e.exercise_id);
    const l = last.current[e.exercise_id];
    const ref = l?.[mine.length] ?? l?.[l.length - 1];
    const bump = !mine.length && shouldProgress(e, l);
    setUp(bump);
    if (mine.length) setWeight(String(mine[mine.length - 1].w));
    else setWeight(ref ? String(ref.weight_kg + (bump ? STEP_KG : 0)) : e.weight);
    setReps(String(ref && !bump ? ref.reps : e.reps));
  }

  if (!exercises) return <SafeAreaView style={s.screen}><Skeleton h={40} /><Skeleton h={120} /></SafeAreaView>;
  const ex = exercises[i];
  const elapsed = Math.floor((now - startedAt.current) / 1000);
  const doneOf = (e: Ex) => logs.filter((l) => l.exercise_id === e.exercise_id).length;
  const mine = logs.filter((l) => l.exercise_id === ex.exercise_id);
  const exDone = mine.length >= ex.sets;
  const lastTxt = last.current[ex.exercise_id]?.map((x) => `${x.weight_kg} kg × ${x.reps}`).join('  ·  ');
  const after = nextOpen(exercises, i + 1, logs, i); // where "Próximo" / "Pular" goes

  function goTo(k: number, ls = logs) {
    Haptics.selectionAsync();
    setI(k);
    prefill(exercises![k], ls);
  }

  function ensureSession() {
    if (sessionId.current) return sessionId.current;
    startedAt.current = Date.now();
    sessionId.current = uuid();
    enqueue({ table: 'sessions', row: { id: sessionId.current, workout_id: workout, started_at: new Date(startedAt.current).toISOString() } });
    return sessionId.current;
  }

  // takes the fresh list because `logs` in state is stale right after setLogs
  function finish(nl: Log[] = logs) {
    if (!nl.length) return leave();
    setRest(null);
    enqueue({ table: 'sessions', id: sessionId.current!, patch: { ended_at: new Date().toISOString() } });
    // volume vs the previous session, over the exercises done today
    let prev = 0, cur = 0;
    for (const id of new Set(nl.map((l) => l.exercise_id))) {
      const p = last.current[id];
      if (!p) continue;
      prev += p.reduce((a, x) => a + x.weight_kg * x.reps, 0);
      cur += nl.filter((l) => l.exercise_id === id).reduce((a, l) => a + l.w * l.reps, 0);
    }
    setSummary({
      delta: prev > 0 ? Math.round((cur / prev - 1) * 100) : null,
      minutes: Math.max(1, Math.round((Date.now() - startedAt.current) / 60000)),
      volume: nl.reduce((a, l) => a + l.w * l.reps, 0),
      prs: [...newPrs.current],
    });
    if (newPrs.current.size) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function leave() {
    clearGifs().catch(() => {});
    router.back();
  }

  function quit() {
    if (!logs.length) {
      return dialog('Sair do treino?', 'Nenhuma série foi registrada.', [
        { text: 'Continuar', style: 'cancel' },
        { text: 'Sair', style: 'destructive', onPress: leave },
      ]);
    }
    dialog('Encerrar treino?', 'As séries feitas ficam salvas.', [
      { text: 'Finalizar e ver resumo', onPress: () => finish() },
      { text: 'Sair e continuar depois', onPress: leave },
      { text: 'Voltar ao treino', style: 'cancel' },
    ]);
  }

  // optimistic: the set shows up, the next set is prefilled and the rest starts right away; the write goes through the outbox
  function completeSet() {
    if (tapped.current) return;
    const w = Math.max(0, num(weight) || 0), rp = Math.max(0, Math.round(num(reps)) || 0);
    if (!rp) return toast('Informe as repetições.');
    tapped.current = true;
    setTimeout(() => { tapped.current = false; }, 600);
    const id = uuid();
    const setNo = Math.max(0, ...mine.map((l) => l.set)) + 1; // unique even after an undo
    enqueue({ table: 'set_logs', row: { id, session_id: ensureSession(), exercise_id: ex.exercise_id, set_number: setNo, weight_kg: w, reps: rp } });
    const nl = [...logs, { id, exercise_id: ex.exercise_id, name: ex.name, set: setNo, w, reps: rp }];
    setLogs(nl);
    const prev = best.current[ex.exercise_id] ?? 0, score = e1rm(w, rp);
    if (prev > 0 && w > 0 && score > prev + 0.01) {
      newPrs.current.add(ex.name);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast(`Novo recorde em ${ex.name}: ${w} kg × ${rp}!`);
    } else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    best.current[ex.exercise_id] = Math.max(prev, score);

    const k = nextOpen(exercises!, i, nl);
    if (k < 0) { // everything done: stay here with "Finalizar treino" (extra sets still possible)
      setRest(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }
    const nx = exercises![k];
    if (k !== i) setI(k);
    prefill(nx, nl);
    const n = nl.filter((l) => l.exercise_id === nx.exercise_id).length + 1;
    setRest(ex.rest > 0 ? { key: Date.now(), endAt: Date.now() + ex.rest * 1000, total: ex.rest, next: `${nx.name} · série ${n}` } : null);
  }

  function undo(l: Log) {
    enqueue({ table: 'set_logs', id: l.id, patch: { deleted_at: new Date().toISOString() } });
    setLogs((x) => x.filter((y) => y.id !== l.id));
    Haptics.selectionAsync();
    toast('Série removida');
  }

  function extraSet() {
    setExercises((xs) => xs!.map((e, k) => (k === i ? { ...e, sets: e.sets + 1 } : e)));
    prefill(ex, logs);
    Haptics.selectionAsync();
  }

  function adjustRest(d: number) {
    setRest((x) => x && { ...x, endAt: x.endAt + d * 1000, total: d > 0 ? x.total + d : x.total });
  }

  if (summary) {
    return (
      <SafeAreaView style={[s.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <Ionicons name="trophy" size={72} color={c.amber} />
        <Text style={s.name}>Treino concluído!</Text>
        <View style={s.stats}>
          <Stat icon="time-outline" v={`${summary.minutes} min`} l="Duração" />
          <Stat icon="barbell-outline" v={`${Math.round(summary.volume)} kg`} l="Volume" />
          <Stat icon="layers-outline" v={String(logs.length)} l="Séries" />
        </View>
        {summary.delta != null && (
          <Text style={[s.delta, { color: summary.delta >= 0 ? c.primary : c.muted }]}>
            {summary.delta > 0 ? '+' : ''}{summary.delta}% de volume vs. o último treino
          </Text>
        )}
        {!!extra?.days && (
          <View style={s.streak}>
            <Ionicons name="flame" size={18} color={c.amber} />
            <Text style={s.streakTxt}>{extra.days} {extra.days === 1 ? 'dia' : 'dias'} seguidos</Text>
          </View>
        )}
        {summary.prs.length > 0 && (
          <View style={s.prBox}>
            <Text style={s.prTitle}>Novos recordes</Text>
            {summary.prs.map((p) => <Text key={p} style={s.prItem}>🏆 {p}</Text>)}
          </View>
        )}
        {extra?.next && extra.next.id !== workout && <Text style={s.sub}>Próximo treino: {extra.next.name}</Text>}
        <View style={{ alignSelf: 'stretch', marginTop: 16 }}><Button label="Concluir" onPress={leave} /></View>
        {summary.prs.length > 0 && <Confetti />}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.screen}>
      <View style={s.topRow}>
        <Text style={s.sub}>Exercício {i + 1} de {exercises.length} · <Text style={s.clock}>{mmss(elapsed)}</Text></Text>
        <View style={{ flexDirection: 'row', gap: 20 }}>
          <Pressable onPress={() => setListOpen(true)} hitSlop={12} accessibilityLabel="Lista de exercícios">
            <Ionicons name="list" size={22} color={c.text} />
          </Pressable>
          <Pressable onPress={quit} hitSlop={12} accessibilityLabel="Encerrar treino">
            <Ionicons name="close" size={22} color={c.danger} />
          </Pressable>
        </View>
      </View>
      <View style={s.dots}>
        {exercises.map((e, k) => (
          <Pressable key={k} style={{ flex: 1, paddingVertical: 8 }} onPress={() => goTo(k)} accessibilityLabel={e.name}>
            <View style={[s.dot, doneOf(e) >= e.sets && { backgroundColor: c.primary }, k === i && { backgroundColor: c.primaryDark }]} />
          </Pressable>
        ))}
      </View>
      {rest && <RestBar key={rest.key} rest={rest} onAdjust={adjustRest} onEnd={() => setRest(null)} />}
      <Pressable disabled={!ex.gif} onPress={() => setGif(true)}>
        <Text style={s.name}>{ex.name}{ex.gif ? '  ▶' : ''}</Text>
      </Pressable>
      {!!lastTxt && <Text style={s.last}>Última vez: {lastTxt}</Text>}
      {up && <Text style={s.up}>↑ +{String(STEP_KG).replace('.', ',')} kg: você fez todas as reps da última vez.</Text>}

      {exDone ? (
        <View style={s.doneBox}>
          <Ionicons name="checkmark-circle" size={28} color={c.primary} />
          <Text style={s.setLabel}>{after < 0 ? 'Todos os exercícios feitos!' : 'Exercício concluído'}</Text>
        </View>
      ) : (
        <>
          <View style={s.setRow}>
            <Text style={s.setLabel}>Série {mine.length + 1} de {ex.sets}</Text>
            {after >= 0 && <Pressable hitSlop={10} onPress={() => goTo(after)}><Text style={s.link}>Pular exercício</Text></Pressable>}
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Stepper label="Carga kg" value={weight} onChange={(v) => { setWeight(v); setUp(false); }} step={STEP_KG} decimal />
            <Stepper label="Reps" value={reps} onChange={setReps} step={1} />
          </View>
        </>
      )}

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 6 }}>
        {mine.map((l, k) => (
          <View key={l.id} style={s.done}>
            <Ionicons name="checkmark-circle" size={20} color={c.primary} />
            <Text style={s.doneTxt}>Série {k + 1}: {l.w} kg × {l.reps}</Text>
            <Pressable hitSlop={10} onPress={() => undo(l)} accessibilityLabel="Desfazer série"><Ionicons name="close-circle-outline" size={22} color={c.faint} /></Pressable>
          </View>
        ))}
        {exDone && <Pressable onPress={extraSet}><Text style={[s.link, { textAlign: 'center', padding: 10 }]}>+ Série extra</Text></Pressable>}
      </ScrollView>

      {!exDone ? <Button label="Concluir série" onPress={completeSet} />
        : after >= 0 ? <Button label={`Próximo: ${exercises[after].name}`} onPress={() => goTo(after)} />
        : <Button label="Finalizar treino" onPress={() => finish()} />}

      <Modal visible={listOpen} transparent animationType="fade" onRequestClose={() => setListOpen(false)}>
        <Pressable style={s.backdrop} onPress={() => setListOpen(false)}>
          <Pressable style={s.sheet}>
            <Text style={s.sheetTitle}>Exercícios</Text>
            <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ gap: 6 }}>
              {exercises.map((e, k) => {
                const d = doneOf(e), full = d >= e.sets;
                return (
                  <Pressable key={k} style={[s.item, k === i && { backgroundColor: c.primarySoft }]}
                    onPress={() => { setListOpen(false); goTo(k); }}>
                    <Ionicons name={full ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={full ? c.primary : c.line} />
                    <Text style={[s.doneTxt, full && { color: c.muted }]}>{e.name}</Text>
                    <Text style={s.sub}>{d}/{e.sets}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable onPress={() => { setListOpen(false); router.push({ pathname: '/catalog', params: { workout } }); }}>
              <Text style={[s.link, { textAlign: 'center', padding: 10 }]}>+ Adicionar exercício</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
      <GifModal url={gif ? ex.gif ?? null : null} title={ex.name} onClose={() => setGif(false)} />
    </SafeAreaView>
  );
}

function Stat({ icon, v, l }: { icon: keyof typeof Ionicons.glyphMap; v: string; l: string }) {
  return (
    <View style={s.stat}>
      <Ionicons name={icon} size={22} color={c.primary} />
      <Text style={s.statV}>{v}</Text>
      <Text style={s.sub}>{l}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg, padding: 16, gap: 14 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  clock: { fontSize: 14, fontWeight: '700', color: c.primaryDark },
  dots: { flexDirection: 'row', gap: 4, marginVertical: -8 },
  dot: { height: 4, borderRadius: 2, backgroundColor: c.line },
  sub: { fontSize: 13, color: c.muted },
  last: { fontSize: 13, color: c.muted, backgroundColor: c.card, padding: 10, borderRadius: r.sm },
  up: { fontSize: 13, fontWeight: '600', color: c.primaryDark, backgroundColor: c.primarySoft, padding: 10, borderRadius: r.sm, overflow: 'hidden' },
  name: { fontSize: 28, fontWeight: '700', color: c.text },
  setRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  setLabel: { fontSize: 18, fontWeight: '600', color: c.primaryDark },
  doneBox: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  done: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.card, borderRadius: r.sm, padding: 10 },
  doneTxt: { flex: 1, color: c.text, fontSize: 14 },
  link: { color: c.primary, fontWeight: '600', fontSize: 15 },
  rest: { backgroundColor: c.card, borderRadius: r.card, padding: 14, gap: 10 },
  restTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  restLbl: { fontSize: 15, fontWeight: '700', color: c.text },
  restTime: { fontSize: 32, fontWeight: '800', color: c.text, fontVariant: ['tabular-nums'] },
  restBtns: { flexDirection: 'row', justifyContent: 'space-around' },
  track: { height: 6, borderRadius: 3, backgroundColor: c.line, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3, backgroundColor: c.primary },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'center', padding: 24 },
  sheet: { backgroundColor: c.card, borderRadius: r.card, padding: 16, gap: 10 },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: c.text },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: r.sm, padding: 10 },
  stats: { flexDirection: 'row', gap: 10, alignSelf: 'stretch', marginTop: 12 },
  stat: { flex: 1, alignItems: 'center', gap: 2, backgroundColor: c.card, borderRadius: r.card, padding: 14 },
  statV: { fontSize: 20, fontWeight: '800', color: c.text },
  delta: { fontSize: 15, fontWeight: '700', marginTop: 4 },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: c.amberSoft, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginTop: 4 },
  streakTxt: { color: c.amber, fontWeight: '800' },
  prBox: { alignSelf: 'stretch', backgroundColor: c.amberSoft, borderRadius: r.card, padding: 14, gap: 4, marginTop: 8 },
  prTitle: { color: c.amber, fontWeight: '800' },
  prItem: { color: c.text, fontSize: 15 },
});
