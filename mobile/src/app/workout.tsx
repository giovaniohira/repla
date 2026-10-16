import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '@/lib/supabase';
import { num } from '@/lib/nutrition';
import { gifUrl } from '@/lib/catalog';
import { discarded } from '@/lib/templates';
import * as Haptics from '@/lib/haptics';
import { GifModal } from '@/ui/GifModal';
import { Skeleton } from '@/ui/Skeleton';
import { Stepper } from '@/ui/Stepper';
import { toast } from '@/ui/Toast';
import { dialog } from '@/ui/Dialog';
import { c, r } from '@/theme';

type Row = { id: string; name: string; gif?: string; position: number; target_sets: string; target_reps: string; target_weight_kg: string; rest_s: string };

// Routine editor: edits save on their own shortly after the last change, and on leaving the screen.
// Leaving a routine with no exercises discards it.
export default function Workout() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [name, setName] = useState('');
  const [rows, setRows] = useState<Row[] | null>(null);
  const [viewing, setViewing] = useState<Row | null>(null);
  // latest values for the debounced save and the unmount cleanup
  const rowsRef = useRef(rows);
  const nameRef = useRef(name);
  useEffect(() => { rowsRef.current = rows; nameRef.current = name; });
  const dirty = useRef(new Set<string>()); // row ids, plus 'name'
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const saving = useRef<Promise<unknown>>(Promise.resolve());

  const saveDirty = useCallback(() => {
    clearTimeout(timer.current);
    const ids = [...dirty.current];
    dirty.current.clear();
    saving.current = Promise.all(ids.map(async (k) => {
      if (k === 'name') {
        const n = nameRef.current.trim();
        return n && supabase.from('workouts').update({ name: n }).eq('id', id);
      }
      const x = rowsRef.current?.find((y) => y.id === k);
      if (!x) return;
      const { error } = await supabase.from('workout_exercises').update({
        target_sets: Math.max(1, Math.round(num(x.target_sets)) || 3),
        target_reps: Math.max(1, Math.round(num(x.target_reps)) || 10),
        target_weight_kg: x.target_weight_kg.trim() ? Math.max(0, num(x.target_weight_kg) || 0) : null,
        rest_s: Math.max(0, Math.round(num(x.rest_s)) || 0),
      }).eq('id', x.id);
      if (error) toast(error.message, { error: true });
    }));
    return saving.current;
  }, [id]);

  const load = useCallback(async () => {
    await saving.current;
    const [w, we] = await Promise.all([
      supabase.from('workouts').select('name').eq('id', id).single(),
      supabase.from('workout_exercises')
        .select('id, position, target_sets, target_reps, target_weight_kg, rest_s, exercises(name, catalog_key)')
        .eq('workout_id', id).is('deleted_at', null).order('position'),
    ]);
    if (we.error) return toast(we.error.message, { error: true });
    if (w.data && !dirty.current.has('name')) setName(w.data.name);
    setRows((we.data ?? []).map((x: any) => ({
      id: x.id, name: x.exercises?.name ?? '?', gif: gifUrl(x.exercises?.catalog_key), position: x.position,
      target_sets: String(x.target_sets), target_reps: String(x.target_reps),
      target_weight_kg: x.target_weight_kg == null ? '' : String(x.target_weight_kg), rest_s: String(x.rest_s),
    })));
  }, [id]);
  // blur (e.g. opening the catalog) saves first, so the reload on return sees the edits
  useFocusEffect(useCallback(() => { load(); return () => { saveDirty(); }; }, [load, saveDirty]));

  useEffect(() => () => {
    saveDirty();
    if (rowsRef.current?.length === 0 && !discarded.has(id)) {
      discarded.add(id);
      supabase.from('workouts').update({ deleted_at: new Date().toISOString() }).eq('id', id).then(() => {});
      toast('Rotina vazia descartada.');
    }
  }, [id, saveDirty]);

  function touch(k: string) {
    dirty.current.add(k);
    clearTimeout(timer.current);
    timer.current = setTimeout(saveDirty, 700);
  }

  function edit(rowId: string, k: keyof Row, v: string) {
    setRows((rs) => rs!.map((x) => (x.id === rowId ? { ...x, [k]: v } : x)));
    touch(rowId);
  }

  // swaps with the neighbour, then renumbers every row whose position no longer matches its index
  async function move(i: number, d: number) {
    const rs = [...rows!];
    const j = i + d;
    if (j < 0 || j >= rs.length) return;
    [rs[i], rs[j]] = [rs[j], rs[i]];
    const changed = rs.map((x, k) => ({ ...x, position: k + 1 })).filter((x, k) => x.position !== rs[k].position);
    setRows(rs.map((x, k) => ({ ...x, position: k + 1 })));
    Haptics.selectionAsync();
    const res = await Promise.all(changed.map((x) => supabase.from('workout_exercises').update({ position: x.position }).eq('id', x.id)));
    const err = res.find((x) => x.error)?.error;
    if (err) { toast(err.message, { error: true }); load(); }
  }

  async function remove(x: Row) {
    setRows((rs) => rs!.filter((y) => y.id !== x.id));
    const { error } = await supabase.from('workout_exercises').update({ deleted_at: new Date().toISOString() }).eq('id', x.id);
    if (error) { toast(error.message, { error: true }); return load(); }
    toast(`${x.name} removido`, { action: { label: 'Desfazer', run: async () => {
      await supabase.from('workout_exercises').update({ deleted_at: null }).eq('id', x.id);
      load();
    } } });
  }

  function confirmDelete() {
    dialog('Apagar rotina?', name, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Apagar', style: 'destructive', onPress: async () => {
        const { error } = await supabase.from('workouts').update({ deleted_at: new Date().toISOString() }).eq('id', id);
        if (error) return toast(error.message, { error: true });
        discarded.add(id);
        router.back();
      } },
    ]);
  }

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
      <TextInput style={s.input} value={name} onChangeText={(v) => { setName(v); touch('name'); }} placeholder="Nome da rotina" />
      {rows == null && <><Skeleton h={96} radius={r.sm} /><Skeleton h={96} radius={r.sm} /></>}
      {rows?.map((x, i) => (
        <View key={x.id} style={s.card}>
          <View style={s.head}>
            <Pressable style={{ flex: 1 }} disabled={!x.gif} onPress={() => setViewing(x)}>
              <Text style={s.name}>{x.name}{x.gif ? '  ▶' : ''}</Text>
            </Pressable>
            <Pressable onPress={() => move(i, -1)} disabled={i === 0} hitSlop={8} accessibilityLabel="Subir">
              <Ionicons name="chevron-up" size={20} color={i === 0 ? c.line : c.muted} />
            </Pressable>
            <Pressable onPress={() => move(i, 1)} disabled={i === rows.length - 1} hitSlop={8} accessibilityLabel="Descer">
              <Ionicons name="chevron-down" size={20} color={i === rows.length - 1 ? c.line : c.muted} />
            </Pressable>
            <Pressable onPress={() => remove(x)} hitSlop={8} accessibilityLabel="Remover">
              <Ionicons name="trash-outline" size={19} color={c.danger} />
            </Pressable>
          </View>
          <View style={s.row}>
            <Stepper small label="Séries" value={x.target_sets} onChange={(v) => edit(x.id, 'target_sets', v)} step={1} min={1} />
            <Stepper small label="Reps" value={x.target_reps} onChange={(v) => edit(x.id, 'target_reps', v)} step={1} min={1} />
            <Stepper small label="Carga kg" value={x.target_weight_kg} onChange={(v) => edit(x.id, 'target_weight_kg', v)} step={2.5} decimal />
            <Stepper small label="Descanso s" value={x.rest_s} onChange={(v) => edit(x.id, 'rest_s', v)} step={15} />
          </View>
        </View>
      ))}
      {rows?.length === 0 && <Text style={s.sub}>Nenhum exercício ainda. Rotinas vazias são descartadas ao sair.</Text>}
      <Pressable style={s.add} onPress={() => router.push({ pathname: '/catalog', params: { workout: id } })}>
        <Text style={s.addTxt}>+ Exercícios</Text>
      </Pressable>
      <Pressable onPress={confirmDelete}><Text style={[s.sub, { color: c.danger, textAlign: 'center', padding: 8 }]}>Apagar rotina</Text></Pressable>
      <GifModal url={viewing?.gif ?? null} title={viewing?.name ?? ''} onClose={() => setViewing(null)} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  input: { backgroundColor: c.card, borderRadius: r.sm, padding: 12, fontSize: 17, fontWeight: '600', color: c.text },
  card: { backgroundColor: c.card, borderRadius: r.sm, padding: 12, gap: 10 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  name: { fontSize: 15, fontWeight: '600', color: c.text },
  row: { flexDirection: 'row', gap: 6 },
  add: { borderWidth: 1, borderColor: c.primary, borderRadius: r.btn, padding: 14, alignItems: 'center' },
  addTxt: { color: c.primary, fontWeight: '600' },
  sub: { fontSize: 12, color: c.muted },
});
