import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '@/lib/haptics';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cached } from '@/lib/cache';
import { ago } from '@/lib/nutrition';
import { activeSession, lastByWorkout } from '@/lib/stats';
import { useRefresh } from '@/lib/useRefresh';
import { supabase } from '@/lib/supabase';
import { startWorkout } from '@/lib/gifs';
import { discarded } from '@/lib/templates';
import { c, r } from '@/theme';
import { Button } from '@/ui/Button';
import { Empty } from '@/ui/Empty';
import { Skeleton } from '@/ui/Skeleton';
import { toast } from '@/ui/Toast';

type W = { id: string; name: string; n: number; groups: string[]; last: string | null };

export default function Workouts() {
  const [list, setList] = useState<W[] | null>(null);
  const [starting, setStarting] = useState<string | null>(null);
  const [active, setActive] = useState<{ workout: string; name: string } | null>(null);

  const load = useCallback(async () => {
    activeSession().then(setActive, () => {});
    const res = await cached<W[]>('workouts', async () => {
      const [w, s] = await Promise.all([
        supabase.from('workouts').select('id, name, workout_exercises(id, deleted_at, exercises(muscle_group))').is('deleted_at', null).order('updated_at', { ascending: false }),
        supabase.from('sessions').select('workout_id, started_at').not('ended_at', 'is', null).is('deleted_at', null).order('started_at', { ascending: false }).limit(100),
      ]);
      if (w.error) throw w.error;
      const last = lastByWorkout(s.data);
      return ((w.data ?? []) as any[]).map((x) => {
        const ex = x.workout_exercises.filter((e: any) => !e.deleted_at);
        return { id: x.id, name: x.name, n: ex.length, last: last.get(x.id) ?? null,
          groups: [...new Set<string>(ex.map((e: any) => e.exercises?.muscle_group).filter(Boolean))].slice(0, 3) };
      });
    });
    if (res) setList(res.filter((w) => !discarded.has(w.id)));
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const refreshControl = useRefresh(load);

  async function create() {
    const { data, error } = await supabase.from('workouts').insert({ name: 'Nova rotina' }).select('id').single();
    if (error) return toast(error.message, { error: true });
    Haptics.selectionAsync();
    router.push({ pathname: '/workout', params: { id: data.id } });
  }

  async function start(id: string, n: number) {
    if (!n) return toast('Adicione exercícios à rotina primeiro.');
    setStarting(id);
    await startWorkout(id);
    setStarting(null);
  }

  // routine done longest ago (never done first), same rule as the Today card
  const next = [...(list ?? [])].filter((w) => w.n > 0).sort((a, b) => (a.last ?? '').localeCompare(b.last ?? ''))[0]?.id;

  return (
    <SafeAreaView style={s.screen} edges={['left', 'right']}>
      <FlatList
        data={list ?? []}
        keyExtractor={(w) => w.id}
        contentContainerStyle={{ gap: 10, padding: 16, paddingBottom: 24 }}
        refreshControl={refreshControl}
        ListHeaderComponent={active ? (
          <Pressable style={s.active} onPress={() => start(active.workout, 1)} disabled={!!starting}>
            <Ionicons name="timer-outline" size={22} color={c.white} />
            <View style={{ flex: 1 }}>
              <Text style={s.activeTitle}>Treino em andamento</Text>
              <Text style={s.activeSub}>{active.name}</Text>
            </View>
            <Text style={s.activeTitle}>{starting === active.workout ? '…' : 'Continuar'}</Text>
          </Pressable>
        ) : null}
        ListEmptyComponent={list == null ? (
          <View style={{ gap: 10 }}><Skeleton h={84} radius={r.card} /><Skeleton h={84} radius={r.card} /></View>
        ) : (
          <View>
            <Empty title="Monte seu primeiro treino" sub="Comece por um modelo pronto ou crie a sua rotina do zero."
              cta="Usar um modelo pronto" onPress={() => router.push('/templates')} />
            <Pressable onPress={create}><Text style={[s.link, { textAlign: 'center', padding: 10 }]}>Criar do zero</Text></Pressable>
          </View>
        )}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(index * 60)}>
            <Pressable style={s.card} onPress={() => router.push({ pathname: '/workout', params: { id: item.id } })}>
              <View style={{ flex: 1, gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={[s.name, { flexShrink: 1 }]}>{item.name}</Text>
                  {item.id === next && !active && <Text style={s.next}>Próximo</Text>}
                </View>
                <Text style={s.sub}>{item.n} exercício{item.n === 1 ? '' : 's'} · {ago(item.last)}</Text>
                {item.groups.length > 0 && (
                  <View style={s.tags}>{item.groups.map((g) => <Text key={g} style={s.tag}>{g}</Text>)}</View>
                )}
              </View>
              <Pressable style={[s.start, starting === item.id && { opacity: 0.6 }]} onPress={() => start(item.id, item.n)} disabled={!!starting}>
                <Ionicons name="play" size={16} color={c.white} />
                <Text style={s.startTxt}>{starting === item.id ? '…' : 'Iniciar'}</Text>
              </Pressable>
            </Pressable>
          </Animated.View>
        )}
      />
      {!!list?.length && <View style={{ padding: 16, paddingTop: 0 }}><Button label="Nova rotina" onPress={create} /></View>}
      {!!list?.length && (
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 24 }}>
          <Pressable onPress={() => router.push('/templates')}><Text style={[s.link, { padding: 10 }]}>Modelos prontos</Text></Pressable>
          <Pressable onPress={() => router.push('/catalog')}><Text style={[s.link, { padding: 10 }]}>Catálogo de exercícios</Text></Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: c.card, borderRadius: r.card, padding: 16 },
  name: { fontSize: 17, fontWeight: '700', color: c.text },
  sub: { fontSize: 12, color: c.muted },
  tags: { flexDirection: 'row', gap: 6 },
  tag: { fontSize: 11, color: c.primaryDark, backgroundColor: c.primarySoft, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, overflow: 'hidden' },
  link: { color: c.primary, fontWeight: '600' },
  start: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: c.primary, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
  startTxt: { color: c.white, fontWeight: '700' },
  next: { fontSize: 11, fontWeight: '700', color: c.amber, backgroundColor: c.amberSoft, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, overflow: 'hidden' },
  active: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.primaryDark, borderRadius: r.card, padding: 16 },
  activeTitle: { color: c.white, fontWeight: '700', fontSize: 15 },
  activeSub: { color: c.white, opacity: 0.85, fontSize: 13 },
});
