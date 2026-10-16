import { StyleSheet, Text } from 'react-native';
import { c, r } from '@/theme';
import { Raised } from './Raised';

export function Button({ label, onPress, busy }: { label: string; onPress: () => void; busy?: boolean }) {
  return (
    <Raised on
      onPress={onPress}
      disabled={busy}
      style={[s.btn, busy && { opacity: 0.6 }]}>
      <Text style={s.txt}>{busy ? 'Aguarde…' : label}</Text>
    </Raised>
  );
}

const s = StyleSheet.create({
  btn: { backgroundColor: c.primary, borderRadius: r.btn, paddingVertical: 14, alignItems: 'center' },
  txt: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
