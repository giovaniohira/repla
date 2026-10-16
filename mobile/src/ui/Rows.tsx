import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { c, r } from '@/theme';

type Icon = keyof typeof Ionicons.glyphMap;

export function Row({ icon, label, value, onPress, danger }: { icon: Icon; label: string; value?: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable style={s.row} onPress={onPress}>
      <Ionicons name={icon} size={22} color={danger ? c.danger : c.primary} />
      <Text style={[s.txt, danger && { color: c.danger }]}>{label}</Text>
      {!!value && <Text style={s.val} numberOfLines={1}>{value}</Text>}
      <Ionicons name="chevron-forward" size={18} color={c.faint} />
    </Pressable>
  );
}

export function SwitchRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={s.switch}>
      <Text style={s.txt}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: c.primary }} />
    </View>
  );
}

export function Chips<T extends string>({ value, options, onChange }: { value: T; options: readonly (readonly [T, string])[]; onChange: (v: T) => void }) {
  return (
    <View style={s.chips}>
      {options.map(([k, l]) => (
        <Pressable key={k} style={[s.chip, value === k && { backgroundColor: c.primary }]} onPress={() => onChange(k)}>
          <Text style={[s.chipTxt, value === k && { color: c.white }]}>{l}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View style={{ gap: 8 }}>
    <Text style={s.section}>{title}</Text>
    {children}
  </View>
);

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.card, borderRadius: r.sm, padding: 14 },
  txt: { flex: 1, fontSize: 15, fontWeight: '600', color: c.text },
  val: { maxWidth: '40%', fontSize: 13, color: c.muted },
  switch: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 16, backgroundColor: c.bg },
  chipTxt: { color: c.text, fontSize: 13, fontWeight: '600' },
  section: { fontSize: 12, fontWeight: '700', color: c.muted, textTransform: 'uppercase', marginTop: 6 },
});
