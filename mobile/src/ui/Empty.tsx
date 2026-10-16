import { StyleSheet, Text, View } from 'react-native';
import { c } from '@/theme';
import { Button } from './Button';
import { Mascot } from './Mascot';

// Friendly empty state: mascot + message + optional call to action.
export function Empty({ title, sub, cta, onPress }: { title: string; sub?: string; cta?: string; onPress?: () => void }) {
  return (
    <View style={s.box}>
      <Mascot size={88} />
      <Text style={s.title}>{title}</Text>
      {!!sub && <Text style={s.sub}>{sub}</Text>}
      {cta && onPress && <View style={{ alignSelf: 'stretch', marginTop: 8 }}><Button label={cta} onPress={onPress} /></View>}
    </View>
  );
}

const s = StyleSheet.create({
  box: { alignItems: 'center', gap: 6, padding: 24 },
  title: { fontSize: 17, fontWeight: '700', color: c.text, textAlign: 'center', marginTop: 8 },
  sub: { fontSize: 14, color: c.muted, textAlign: 'center' },
});
