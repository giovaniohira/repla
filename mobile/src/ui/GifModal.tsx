import { Image } from 'expo-image';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { c, r } from '@/theme';

// Shows the exercise GIF; tapping anywhere closes it. `url` null = closed.
export function GifModal({ url, title, onClose }: { url: string | null; title: string; onClose: () => void }) {
  return (
    <Modal visible={!!url} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <View style={s.card}>
          <Text style={s.title}>{title}</Text>
          {url && <Image source={url} style={s.img} contentFit="contain" />}
        </View>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: c.card, borderRadius: r.card, padding: 16, gap: 12 },
  title: { fontSize: 16, fontWeight: '600', color: c.text },
  img: { width: '100%', aspectRatio: 1, backgroundColor: '#fff' },
});
