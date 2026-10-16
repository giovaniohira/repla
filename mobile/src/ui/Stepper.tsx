import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Haptics from '@/lib/haptics';
import { num, r1 } from '@/lib/nutrition';
import { c, r } from '@/theme';

// Number field with −/+ buttons. `small` is the compact version for the routine editor.
export function Stepper({ label, value, onChange, step, decimal, min = 0, small }: {
  label: string; value: string; onChange: (v: string) => void; step: number; decimal?: boolean; min?: number; small?: boolean;
}) {
  const bump = (d: number) => {
    Haptics.selectionAsync();
    onChange(String(Math.max(min, r1((num(value) || 0) + d))));
  };
  const icon = small ? 16 : 22;
  return (
    <View style={s.field}>
      <Text style={small ? s.lblSm : s.lbl}>{label}</Text>
      <View style={[s.row, small && { gap: 2 }]}>
        <Pressable style={small ? s.btnSm : s.btn} onPress={() => bump(-step)} hitSlop={6} accessibilityLabel={`Diminuir ${label}`}>
          <Ionicons name="remove" size={icon} color={c.text} />
        </Pressable>
        <TextInput style={small ? s.numSm : s.num} keyboardType={decimal ? 'decimal-pad' : 'number-pad'} value={value}
          onChangeText={onChange} selectTextOnFocus accessibilityLabel={label} />
        <Pressable style={small ? s.btnSm : s.btn} onPress={() => bump(step)} hitSlop={6} accessibilityLabel={`Aumentar ${label}`}>
          <Ionicons name="add" size={icon} color={c.text} />
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  field: { flex: 1, gap: 4 },
  lbl: { fontSize: 13, color: c.muted },
  lblSm: { fontSize: 11, color: c.muted, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  btn: { width: 36, height: 36, borderRadius: 18, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center' },
  btnSm: { width: 22, height: 30, alignItems: 'center', justifyContent: 'center' },
  num: { flex: 1, backgroundColor: c.card, borderRadius: r.sm, paddingVertical: 14, fontSize: 26, fontWeight: '700', textAlign: 'center', color: c.text },
  numSm: { flex: 1, minWidth: 0, backgroundColor: c.bg, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 0, fontSize: 14, fontWeight: '600', textAlign: 'center', color: c.text },
});
