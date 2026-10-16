import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from '@/lib/haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { saveProduct } from '@/lib/foods';
import { productByCode } from '@/lib/off';
import { c, r } from '@/theme';
import { Button } from '@/ui/Button';
import { toast } from '@/ui/Toast';

// Barcode scanner: looks the code up on Open Food Facts, stores it and returns to "Adicionar" with the food selected.
export default function Scan() {
  const { type, date } = useLocalSearchParams<{ type?: string; date?: string }>();
  const [perm, ask] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const locked = useRef(false); // the camera fires many events per code

  async function onCode(code: string) {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const p = await productByCode(code);
      if (!p) throw new Error('Produto não encontrado ou sem calorias cadastradas.');
      const food = await saveProduct(p);
      router.replace({ pathname: '/add-food', params: { foodId: food.id, type, date } });
    } catch (e) {
      toast((e as Error).message, { error: true });
      setBusy(false);
      setTimeout(() => { locked.current = false; }, 1500);
    }
  }

  if (!perm) return <View style={s.center} />;
  if (!perm.granted) {
    return (
      <View style={s.center}>
        <Text style={s.txt}>Precisamos da câmera para ler o código de barras dos produtos.</Text>
        <View style={{ alignSelf: 'stretch' }}><Button label="Permitir câmera" onPress={ask} /></View>
      </View>
    );
  }

  return (
    <View style={s.screen}>
      <CameraView style={StyleSheet.absoluteFill} facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
        onBarcodeScanned={({ data }) => onCode(data)} />
      <View style={s.overlay} pointerEvents="none">
        <View style={s.frame} />
        <Text style={s.hint}>{busy ? 'Buscando produto…' : 'Aponte para o código de barras'}</Text>
        {busy && <ActivityIndicator color="#fff" />}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  txt: { color: c.text, fontSize: 16, textAlign: 'center' },
  overlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: 16 },
  frame: { width: 280, height: 160, borderRadius: r.card, borderWidth: 3, borderColor: '#fff', backgroundColor: 'transparent' },
  hint: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
