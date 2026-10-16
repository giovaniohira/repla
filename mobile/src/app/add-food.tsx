import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '@/lib/haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { favoriteFoods, logFood, recentFoods, saveProduct, setFavorite } from '@/lib/foods';
import { searchBasics } from '@/lib/basics';
import { searchOff, type OffProduct } from '@/lib/off';
import { supabase } from '@/lib/supabase';
import { FOOD_COLS, macrosOf, MEAL_TYPES, num, r1, today, type Food, type MealType } from '@/lib/nutrition';
import { c, lift, r } from '@/theme';
import { Button } from '@/ui/Button';
import { Empty } from '@/ui/Empty';
import { Skeleton } from '@/ui/Skeleton';
import { toast } from '@/ui/Toast';

type Tab = 'recent' | 'fav';
type Row = OffProduct | (Food & { lastGrams?: number });

const defaultType = (): MealType => {
  const h = new Date().getHours();
  return h < 10 ? 'breakfast' : h < 15 ? 'lunch' : h < 18 ? 'snack' : 'dinner';
};

// Logs a food (grams) to a meal: search (TACO + Open Food Facts), recents, favorites, barcode, or a custom food.
export default function AddFood() {
  const p = useLocalSearchParams<{ type?: MealType; date?: string; foodId?: string }>();
  const date = p.date ?? today();
  const [type, setType] = useState<MealType>(p.type ?? defaultType());
  const [tab, setTab] = useState<Tab>('recent'); // repeating what you ate is the daily habit: recents first, search on typing
  const [q, setQ] = useState('');
  const [off, setOff] = useState<OffProduct[]>([]);
  const [mine, setMine] = useState<Food[]>([]); // custom foods (no off_code)
  const [loading, setLoading] = useState(false);
  const [lists, setLists] = useState<Record<string, (Food & { lastGrams?: number })[]>>({});
  const [sel, setSel] = useState<Food | null>(null);
  const [grams, setGrams] = useState('100');
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);

  // food coming back from the barcode scanner
  useEffect(() => {
    if (!p.foodId) return;
    supabase.from('foods').select(FOOD_COLS).eq('id', p.foodId).maybeSingle().then(({ data }) => data && pick(data));
  }, [p.foodId]);

  // 400 ms debounce; `alive` discards responses from stale searches. TACO results are local and instant.
  const term = q.trim();
  const searching = term.length >= 2;
  const local = useMemo(() => (searching ? searchBasics(term) : []), [term, searching]);
  useEffect(() => {
    if (!searching) return; // (a stale `loading` stays hidden below until the next search resets it)
    let alive = true;
    const id = setTimeout(async () => {
      setLoading(true);
      supabase.from('foods').select(FOOD_COLS).is('off_code', null).is('deleted_at', null).ilike('name', `%${term.replace(/[%_,()]/g, ' ')}%`).limit(10)
        .then(({ data }) => { if (alive) setMine(data ?? []); });
      try {
        const res = await searchOff(term);
        if (alive) setOff(res);
      } catch {
        if (alive) toast('Open Food Facts indisponível. Mostrando só a tabela TACO.', { error: true });
      }
      if (alive) setLoading(false);
    }, 400);
    return () => { alive = false; clearTimeout(id); };
  }, [term, searching]);

  useEffect(() => {
    if (lists[tab]) return;
    (tab === 'recent' ? recentFoods() : favoriteFoods()).then((l) => {
      setLists((x) => ({ ...x, [tab]: l }));
      if (tab === 'recent' && !l.length) setTab('fav');
    }).catch(() => setLists((x) => ({ ...x, [tab]: [] })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);
  const list = lists[tab] ?? null;

  function pick(f: Food, g?: number) {
    setSel(f);
    setGrams(String(g ?? f.serving_g ?? 100));
    Haptics.selectionAsync();
  }

  async function pickRow(row: Row) {
    if ('code' in row) {
      try { pick(await saveProduct(row)); } catch (e) { toast((e as Error).message, { error: true }); }
    } else pick(row, row.lastGrams);
  }

  async function save(more = false) {
    const g = num(grams);
    if (!sel || !(g > 0)) return toast('Informe uma quantidade em gramas maior que zero.', { error: true });
    setBusy(true);
    try {
      await logFood(sel.id, g, type, date);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast(`${sel.name} registrado`);
      if (more) { // stay for the next item of the same meal
        setLists({}); // recents changed
        setSel(null); setQ(''); setOff([]); setMine([]); setBusy(false);
      } else router.back();
    } catch (e) {
      setBusy(false);
      toast((e as Error).message, { error: true });
    }
  }

  async function toggleFav() {
    if (!sel) return;
    const favorite = !sel.favorite;
    setSel({ ...sel, favorite });
    await setFavorite(sel.id, favorite);
    Haptics.selectionAsync();
  }

  const g = num(grams) || 0;
  const m = sel ? macrosOf(sel, g) : null;
  const rows: Row[] = searching ? [...mine, ...local, ...off] : list ?? [];

  const types = (
    <View style={s.types}>
      {MEAL_TYPES.map((x) => (
        <Pressable key={x.id} onPress={() => setType(x.id)} style={[s.chip, type === x.id && s.chipOn]}>
          <Text style={[s.chipTxt, type === x.id && { color: c.white }]}>{x.label}</Text>
        </Pressable>
      ))}
    </View>
  );

  if (creating) return <NewFood onDone={(f) => { setCreating(false); pick(f); }} onCancel={() => setCreating(false)} />;

  if (sel && m) {
    const quick = [...(sel.serving_g ? [{ label: sel.serving_label ?? 'Porção', g: sel.serving_g }] : []),
      ...[50, 100, 200].map((v) => ({ label: `${v} g`, g: v }))];
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView style={s.screen} contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
          {types}
          <View style={s.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={[s.name, { flex: 1, fontSize: 18 }]}>{sel.name}</Text>
              <Pressable onPress={toggleFav} hitSlop={10}>
                <Ionicons name={sel.favorite ? 'star' : 'star-outline'} size={26} color={sel.favorite ? c.amber : c.faint} />
              </Pressable>
            </View>
            <Text style={s.kcal}>{Math.round(m.kcal)} <Text style={s.unit}>kcal</Text></Text>
            <View style={s.macros}>
              <Chip label="Proteína" v={m.protein} color={c.protein} />
              <Chip label="Carbo" v={m.carbs} color={c.carbs} unknown={sel.carbs_100g == null} />
              <Chip label="Gordura" v={m.fat} color={c.fat} unknown={sel.fat_100g == null} />
            </View>
            <View style={s.gramsRow}>
              <Pressable style={s.step} onPress={() => setGrams(String(Math.max(0, g - 10)))}><Ionicons name="remove" size={22} color={c.text} /></Pressable>
              <TextInput style={s.gramsInput} keyboardType="decimal-pad" value={grams} onChangeText={setGrams} selectTextOnFocus />
              <Text style={s.unit}>g</Text>
              <Pressable style={s.step} onPress={() => setGrams(String(g + 10))}><Ionicons name="add" size={22} color={c.text} /></Pressable>
            </View>
            <View style={s.types}>
              {quick.map((x) => (
                <Pressable key={x.label} style={[s.chip, g === x.g && s.chipOn]} onPress={() => setGrams(String(x.g))}>
                  <Text style={[s.chipTxt, g === x.g && { color: c.white }]}>{x.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          <Button label="Registrar" onPress={() => save()} busy={busy} />
          <Pressable onPress={() => save(true)} disabled={busy}><Text style={s.link}>Registrar e adicionar outro</Text></Pressable>
          <Pressable onPress={() => setSel(null)}><Text style={s.link}>Trocar alimento</Text></Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={s.screen}>
      <FlatList
        data={rows}
        keyExtractor={(x, i) => ('code' in x ? x.code : x.id) + i}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ gap: 8, padding: 16, paddingBottom: 40 }}
        ListHeaderComponent={
          <View style={{ gap: 12 }}>
            {types}
            <View style={s.tabs}>
              {([['recent', 'Recentes'], ['fav', 'Favoritos']] as const).map(([k, l]) => (
                <Pressable key={k} style={[s.tab, !searching && tab === k && s.tabOn]} onPress={() => setTab(k)}>
                  <Text style={[s.tabTxt, !searching && tab === k && { color: c.white }]}>{l}</Text>
                </Pressable>
              ))}
            </View>
            <View style={s.searchRow}>
                <View style={s.searchBox}>
                  <Ionicons name="search" size={18} color={c.faint} />
                  <TextInput style={s.searchInput} placeholder="Buscar alimento (ex.: arroz)" placeholderTextColor={c.faint} value={q} onChangeText={setQ} />
                  {loading && searching && <ActivityIndicator color={c.primary} />}
                </View>
                <Pressable style={s.scan} onPress={() => router.push({ pathname: '/scan', params: { type, date } })}>
                  <Ionicons name="barcode-outline" size={24} color={c.white} />
                </Pressable>
              </View>
            {(searching || list?.length === 0) && (
              <Pressable onPress={() => setCreating(true)} style={s.create}>
                <Ionicons name="add-circle-outline" size={20} color={c.primary} />
                <Text style={s.createTxt}>Criar alimento próprio</Text>
              </Pressable>
            )}
          </View>
        }
        ListEmptyComponent={
          searching ? (loading ? null : <Text style={s.sub}>Nada encontrado. Você pode criar o alimento.</Text>)
            : list == null ? <View style={{ gap: 8 }}><Skeleton h={56} /><Skeleton h={56} /><Skeleton h={56} /></View>
            : <Empty title={tab === 'recent' ? 'Sem recentes ainda' : 'Nenhum favorito'} sub={tab === 'recent' ? 'Os alimentos que você registrar aparecem aqui.' : 'Toque na estrela ao escolher um alimento para favoritá-lo.'} />
        }
        renderItem={({ item }) => (
          <Pressable style={s.item} onPress={() => pickRow(item)}>
            <View style={{ flex: 1 }}>
              <Text style={s.name} numberOfLines={2}>{item.name}</Text>
              <Text style={s.sub}>
                {r1(item.kcal_100g)} kcal · {r1(item.protein_100g)} g prot / 100 g{'lastGrams' in item && item.lastGrams ? ` · último: ${item.lastGrams} g` : ''}
              </Text>
            </View>
            <Ionicons name="add-circle" size={26} color={c.primary} />
          </Pressable>
        )}
      />
    </View>
  );
}

function Chip({ label, v, color, unknown }: { label: string; v: number; color: string; unknown?: boolean }) {
  return (
    <View style={s.mChip}>
      <Text style={[s.mVal, { color }]}>{unknown ? '—' : `${r1(v)} g`}</Text>
      <Text style={s.sub}>{label}</Text>
    </View>
  );
}

// Form for a custom food (values per 100 g, optional default serving).
function NewFood({ onDone, onCancel }: { onDone: (f: Food) => void; onCancel: () => void }) {
  const [v, setV] = useState({ name: '', kcal: '', prot: '', carbs: '', fat: '', label: '', sg: '' });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof v) => (t: string) => setV((x) => ({ ...x, [k]: t }));

  async function save() {
    const kcal = num(v.kcal), prot = num(v.prot || '0');
    if (!v.name.trim() || !(kcal >= 0) || v.kcal === '') return toast('Informe o nome e as calorias por 100 g.', { error: true });
    setBusy(true);
    const sg = num(v.sg || '0');
    const { data, error } = await supabase.from('foods').insert({
      name: v.name.trim(), kcal_100g: kcal, protein_100g: prot >= 0 ? prot : 0,
      carbs_100g: v.carbs ? num(v.carbs) : null, fat_100g: v.fat ? num(v.fat) : null,
      serving_g: sg > 0 ? sg : null, serving_label: sg > 0 ? v.label.trim() || 'Porção' : null,
    }).select(FOOD_COLS).single();
    setBusy(false);
    if (error) return toast(error.message, { error: true });
    onDone(data);
  }

  const field = (k: keyof typeof v, label: string, kb: 'default' | 'decimal-pad' = 'decimal-pad') => (
    <View style={{ flex: 1, gap: 4 }}>
      <Text style={s.sub}>{label}</Text>
      <TextInput style={s.formInput} keyboardType={kb} value={v[k]} onChangeText={set(k)} placeholderTextColor={c.faint} />
    </View>
  );
  return (
    <ScrollView style={s.screen} contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
      {field('name', 'Nome', 'default')}
      <Text style={s.sub}>Valores por 100 g</Text>
      <View style={s.row}>{field('kcal', 'Calorias (kcal)')}{field('prot', 'Proteína (g)')}</View>
      <View style={s.row}>{field('carbs', 'Carbo (g)')}{field('fat', 'Gordura (g)')}</View>
      <Text style={s.sub}>Porção padrão (opcional)</Text>
      <View style={s.row}>{field('label', 'Nome (ex.: fatia)', 'default')}{field('sg', 'Gramas')}</View>
      <Button label="Salvar alimento" onPress={save} busy={busy} />
      <Pressable onPress={onCancel}><Text style={s.link}>Cancelar</Text></Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  types: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { ...lift, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: c.card },
  chipOn: { backgroundColor: c.primary },
  chipTxt: { color: c.text, fontSize: 13 },
  tabs: { flexDirection: 'row', backgroundColor: c.track, borderRadius: 12, padding: 3 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10 },
  tabOn: { backgroundColor: c.primary },
  tabTxt: { color: c.text, fontWeight: '600', fontSize: 13 },
  searchRow: { flexDirection: 'row', gap: 8 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.card, borderRadius: r.sm, paddingHorizontal: 12 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 15, color: c.text },
  scan: { width: 48, borderRadius: r.sm, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' },
  create: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', padding: 4 },
  createTxt: { color: c.primary, fontWeight: '600' },
  card: { backgroundColor: c.card, borderRadius: r.card, padding: 16, gap: 14 },
  kcal: { fontSize: 40, fontWeight: '800', color: c.text },
  unit: { fontSize: 16, fontWeight: '500', color: c.muted },
  macros: { flexDirection: 'row', gap: 8 },
  mChip: { flex: 1, backgroundColor: c.bg, borderRadius: r.sm, padding: 10, alignItems: 'center' },
  mVal: { fontSize: 16, fontWeight: '800' },
  gramsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  gramsInput: { minWidth: 100, textAlign: 'center', fontSize: 32, fontWeight: '800', color: c.text, backgroundColor: c.bg, borderRadius: r.sm, paddingVertical: 8 },
  step: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.card, borderRadius: r.sm, padding: 12 },
  name: { fontSize: 15, fontWeight: '600', color: c.text },
  sub: { fontSize: 12, color: c.muted },
  link: { color: c.primary, textAlign: 'center', padding: 8, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 10 },
  formInput: { backgroundColor: c.card, borderRadius: r.sm, padding: 12, fontSize: 15, color: c.text },
});
