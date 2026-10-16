import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '@/lib/haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { copyDay, removeItem, restoreItem, setGrams } from '@/lib/foods';
import { dayLabel, macrosOf, MEAL_TYPES, num, r1, shiftDate, today } from '@/lib/nutrition';
import { useDay, type Item } from '@/lib/today';
import { useRefresh } from '@/lib/useRefresh';
import { c, r } from '@/theme';
import { Button } from '@/ui/Button';
import { Empty } from '@/ui/Empty';
import { Skeleton } from '@/ui/Skeleton';
import { toast } from '@/ui/Toast';

// A day's meals with date navigation, swipe-to-delete (with undo), tap-to-edit grams and "copy from yesterday".
export default function Nutrition() {
  const [date, setDate] = useState(today());
  const { goals, meals, items, total, loading, load } = useDay(date);
  const refreshControl = useRefresh(load);
  const [editing, setEditing] = useState<Item | null>(null);
  const [grams, setG] = useState('');

  const isToday = date === today();
  const go = (n: number) => { Haptics.selectionAsync(); setDate(shiftDate(date, n)); };

  async function remove(i: Item) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await removeItem(i.id);
    load();
    toast(`"${i.foods.name}" removido`, { action: { label: 'Desfazer', run: async () => { await restoreItem(i.id); load(); } } });
  }

  async function saveGrams() {
    const g = num(grams);
    if (!editing || !(g > 0)) return toast('Informe uma quantidade maior que zero.', { error: true });
    await setGrams(editing.id, g);
    setEditing(null);
    load();
  }

  async function copyYesterday() {
    try {
      const n = await copyDay(shiftDate(date, -1), date);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast(n ? `${n} item${n === 1 ? '' : 'ns'} copiado${n === 1 ? '' : 's'} de ontem` : 'Ontem está vazio.');
      load();
    } catch (e) { toast((e as Error).message, { error: true }); }
  }

  const kcal = Math.round(total.kcal);

  return (
    <View style={s.screen}>
      <View style={s.nav}>
        <Pressable onPress={() => go(-1)} hitSlop={12}><Ionicons name="chevron-back" size={26} color={c.text} /></Pressable>
        <Text style={s.navTxt}>{dayLabel(date)}</Text>
        <Pressable onPress={() => go(1)} hitSlop={12} disabled={isToday} style={{ opacity: isToday ? 0.25 : 1 }}>
          <Ionicons name="chevron-forward" size={26} color={c.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 4, gap: 12 }}
        refreshControl={refreshControl}>
        <View style={s.sum}>
          {loading ? <Skeleton h={36} /> : (
            <>
              <View style={s.sumMain}>
                <Text style={s.sumKcal}>{kcal}</Text>
                <Text style={s.sumUnit}>{goals ? `/ ${goals.goal_kcal} kcal` : 'kcal'}</Text>
              </View>
              <Text style={s.sumMacros}>
                <Text style={{ color: c.protein }}>P {r1(total.protein)} g</Text>  ·  <Text style={{ color: c.carbs }}>C {r1(total.carbs)} g</Text>  ·  <Text style={{ color: c.fat }}>G {r1(total.fat)} g</Text>
              </Text>
            </>
          )}
        </View>

        {!loading && items.length === 0 && (
          <Empty title={isToday ? 'Nenhuma refeição hoje' : 'Nada registrado neste dia'} sub="Registre o que você comeu para acompanhar suas metas."
            cta="Adicionar alimento" onPress={() => router.push({ pathname: '/add-food', params: { date } })} />
        )}
        {!loading && items.length === 0 && (
          <Pressable onPress={copyYesterday}><Text style={s.link}>Copiar refeições de {dayLabel(shiftDate(date, -1)).toLowerCase()}</Text></Pressable>
        )}

        {MEAL_TYPES.map((t) => {
          const list = meals.filter((m) => m.type === t.id).flatMap((m) => m.meal_items);
          const sub = Math.round(list.reduce((a, i) => a + macrosOf(i.foods, i.grams).kcal, 0));
          return (
            <View key={t.id} style={s.meal}>
              <View style={s.mealHead}>
                <Ionicons name={t.icon} size={18} color={c.primary} />
                <Text style={s.mealTitle}>{t.label}</Text>
                {sub > 0 && <Text style={s.mealKcal}>{sub} kcal</Text>}
                <View style={{ flex: 1 }} />
                <Pressable onPress={() => router.push({ pathname: '/add-food', params: { type: t.id, date } })} hitSlop={10} style={s.plus}>
                  <Ionicons name="add" size={20} color={c.white} />
                </Pressable>
              </View>
              {list.map((i) => (
                <ReanimatedSwipeable key={i.id} overshootRight={false} rightThreshold={80} onSwipeableOpen={() => remove(i)}
                  renderRightActions={() => <View style={s.del}><Ionicons name="trash" size={20} color="#fff" /></View>}>
                  <Pressable style={s.line} onPress={() => { setEditing(i); setG(String(i.grams)); }}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.lineName} numberOfLines={1}>{i.foods.name}</Text>
                      <Text style={s.lineSub}>{i.grams} g · P {r1(macrosOf(i.foods, i.grams).protein)} g</Text>
                    </View>
                    <Text style={s.lineKcal}>{Math.round(macrosOf(i.foods, i.grams).kcal)} kcal</Text>
                  </Pressable>
                </ReanimatedSwipeable>
              ))}
              {list.length === 0 && items.length > 0 && <Text style={s.none}>Nada registrado</Text>}
            </View>
          );
        })}
      </ScrollView>

      <Modal visible={!!editing} transparent animationType="fade" onRequestClose={() => setEditing(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <Pressable style={s.backdrop} onPress={() => setEditing(null)}>
            <Pressable style={s.dialog} onPress={() => {}}>
              <Text style={s.dTitle} numberOfLines={2}>{editing?.foods.name}</Text>
              <TextInput style={s.input} keyboardType="decimal-pad" value={grams} onChangeText={setG} autoFocus selectTextOnFocus placeholder="Gramas" placeholderTextColor={c.faint} />
              {editing && num(grams) > 0 && <Text style={s.lineSub}>≈ {Math.round(macrosOf(editing.foods, num(grams)).kcal)} kcal</Text>}
              <Button label="Salvar" onPress={saveGrams} />
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 8 },
  navTxt: { fontSize: 17, fontWeight: '700', color: c.text, textTransform: 'capitalize' },
  sum: { backgroundColor: c.card, borderRadius: r.card, padding: 16, gap: 6, minHeight: 80, justifyContent: 'center' },
  sumMain: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  sumKcal: { fontSize: 32, fontWeight: '800', color: c.text },
  sumUnit: { fontSize: 14, color: c.muted },
  sumMacros: { fontSize: 13, fontWeight: '600', color: c.muted },
  meal: { backgroundColor: c.card, borderRadius: r.card, padding: 14, gap: 8, overflow: 'hidden' },
  mealHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mealTitle: { fontSize: 15, fontWeight: '700', color: c.text },
  mealKcal: { fontSize: 12, color: c.muted },
  plus: { width: 30, height: 30, borderRadius: 15, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' },
  line: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, backgroundColor: c.card },
  lineName: { color: c.text, fontSize: 14, fontWeight: '500' },
  lineSub: { color: c.muted, fontSize: 12 },
  lineKcal: { color: c.text, fontSize: 13, fontWeight: '600' },
  del: { width: 80, backgroundColor: c.danger, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  none: { color: c.faint, fontSize: 13 },
  hint: { color: c.faint, fontSize: 12, textAlign: 'center' },
  link: { color: c.primary, fontWeight: '600', textAlign: 'center', padding: 4 },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'center', padding: 24 },
  dialog: { backgroundColor: c.card, borderRadius: r.card, padding: 18, gap: 12 },
  dTitle: { fontSize: 16, fontWeight: '700', color: c.text },
  input: { backgroundColor: c.bg, borderRadius: r.sm, padding: 12, fontSize: 18, color: c.text },
});
