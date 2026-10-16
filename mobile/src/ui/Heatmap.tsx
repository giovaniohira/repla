import { StyleSheet, Text, View } from 'react-native';
import { shiftDate, today } from '@/lib/nutrition';
import { c } from '@/theme';

const WEEKS = 12;
const LEVEL = [c.track, c.primarySoft, c.primary, c.primaryDark];

// Consistency calendar: one column per week (Sun-Sat), last 12 weeks. `act[date]`: bit 1 = logged food, bit 2 = finished a workout.
export function Heatmap({ act }: { act: Record<string, number> }) {
  const now = today();
  const start = shiftDate(now, -new Date().getDay() - (WEEKS - 1) * 7);
  return (
    <View style={{ gap: 8 }}>
      <View style={s.grid}>
        {Array.from({ length: WEEKS }, (_, w) => (
          <View key={w} style={s.col}>
            {Array.from({ length: 7 }, (_, d) => {
              const day = shiftDate(start, w * 7 + d);
              return <View key={d} style={[s.cell, day > now ? s.future : { backgroundColor: LEVEL[act[day] ?? 0] }]} />;
            })}
          </View>
        ))}
      </View>
      <View style={s.legend}>
        {[['Nada', 0], ['Refeição', 1], ['Treino', 2], ['Ambos', 3]].map(([l, k]) => (
          <View key={l} style={s.item}>
            <View style={[s.dot, { backgroundColor: LEVEL[k as number] }]} />
            <Text style={s.txt}>{l}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  grid: { flexDirection: 'row', justifyContent: 'space-between' },
  col: { gap: 4 },
  cell: { width: 20, height: 20, borderRadius: 5 },
  future: { backgroundColor: 'transparent' },
  legend: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 10, height: 10, borderRadius: 3 },
  txt: { fontSize: 11, color: c.muted },
});
