import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { c, r } from '@/theme';
import { Raised } from './Raised';

type B = { text: string; style?: 'default' | 'cancel' | 'destructive'; onPress?: () => void };
type D = { title: string; msg?: string; buttons: B[] };
let open: ((d: D) => void) | null = null;

// Drop-in replacement for Alert.alert, styled like the rest of the app. Mount <DialogHost /> once at the root.
export const dialog = (title: string, msg?: string, buttons: B[] = [{ text: 'OK' }]) => open?.({ title, msg, buttons });

export function DialogHost() {
  const [d, setD] = useState<D | null>(null);

  useEffect(() => {
    open = setD;
    return () => { open = null; };
  }, []);

  const close = () => setD(null);
  return (
    <Modal visible={!!d} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={close}>
      <Pressable style={s.backdrop} onPress={close}>
        {d && (
          <Pressable style={s.card}>
            <Text style={s.title}>{d.title}</Text>
            {!!d.msg && <Text style={s.msg}>{d.msg}</Text>}
            <View style={s.btns}>
              {d.buttons.map((b, i) => {
                const cancel = b.style === 'cancel', bad = b.style === 'destructive';
                return (
                  <Raised
                    key={i}
                    on={!cancel}
                    dark={bad ? '#991B1B' : c.primaryDark}
                    onPress={() => { close(); b.onPress?.(); }}
                    style={[s.btn, !cancel && { backgroundColor: bad ? c.danger : c.primary }]}>
                    <Text style={[s.btnTxt, cancel && { color: c.muted }]}>{b.text}</Text>
                  </Raised>
                );
              })}
            </View>
          </Pressable>
        )}
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: c.card, borderRadius: r.card, padding: 20, gap: 8 },
  title: { fontSize: 18, fontWeight: '700', color: c.text },
  msg: { fontSize: 14, color: c.muted, lineHeight: 20 },
  btns: { gap: 10, marginTop: 12 },
  btn: { borderRadius: r.btn, paddingVertical: 12, alignItems: 'center', backgroundColor: c.card },
  btnTxt: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
