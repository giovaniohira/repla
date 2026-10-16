import { useCallback, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { getPrefs, setPrefs, type Prefs as Rem } from '@/lib/reminders';
import { prefs, setPref, type Prefs } from '@/lib/prefs';
import { c, r } from '@/theme';
import { Chips, SwitchRow } from '@/ui/Rows';
import { toast } from '@/ui/Toast';
import { dialog } from '@/ui/Dialog';

const THEMES = [['system', 'Sistema'], ['light', 'Claro'], ['dark', 'Escuro']] as const;
const TABS = [['index', 'Hoje'], ['nutrition', 'Alimentação'], ['workouts', 'Treinos'], ['progress', 'Progresso'], ['profile', 'Perfil']] as const;
const REMINDERS = [['rest', 'Fim do descanso entre séries'], ['meals', 'Refeições (12:30 e 19:30)'], ['streak', 'Sequência em risco (20:30)'], ['weekly', 'Resumo semanal (domingo)']] as const;

export default function Settings() {
  const [p, setP] = useState<Prefs>({ ...prefs });
  const [rem, setRem] = useState<Rem | null>(null);
  useFocusEffect(useCallback(() => { getPrefs().then(setRem); }, []));

  const set = <K extends keyof Prefs>(k: K, v: Prefs[K]) => { setPref(k, v); setP({ ...prefs }); };

  async function toggle(k: keyof Rem, v: boolean) {
    const next = { rest: false, meals: false, streak: false, weekly: false, ...rem, [k]: v };
    setRem(next);
    if (!(await setPrefs(next)) && v) {
      setRem(await getPrefs());
      dialog('Notificações desativadas', 'Ative as notificações do app nos Ajustes do celular.', [{ text: 'Agora não', style: 'cancel' }, { text: 'Abrir Ajustes', onPress: () => Linking.openSettings() }]);
    }
  }

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ padding: 16, gap: 14 }}>
      <View style={s.card}>
        <Text style={s.title}>Aparência</Text>
        <Chips value={p.theme} options={THEMES} onChange={(v) => { set('theme', v); toast('O tema muda na próxima vez que você abrir o app.'); }} />
        <Text style={s.lbl}>Aba inicial</Text>
        <Chips value={p.startTab} options={TABS} onChange={(v) => { set('startTab', v); toast('Vale na próxima vez que você abrir o app.'); }} />
      </View>

      <View style={s.card}>
        <Text style={s.title}>Treino e uso</Text>
        <SwitchRow label="Manter a tela ligada durante o treino" value={p.keepAwake} onChange={(v) => set('keepAwake', v)} />
        <SwitchRow label="Mostrar GIFs dos exercícios" value={p.gifs} onChange={(v) => set('gifs', v)} />
        <SwitchRow label="Vibração ao tocar" value={p.haptics} onChange={(v) => set('haptics', v)} />
      </View>

      <View style={s.card}>
        <Text style={s.title}>Lembretes</Text>
        {REMINDERS.map(([k, l]) => <SwitchRow key={k} label={l} value={!!rem?.[k]} onChange={(v) => toggle(k, v)} />)}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  card: { backgroundColor: c.card, borderRadius: r.card, padding: 16, gap: 12 },
  title: { fontSize: 15, fontWeight: '700', color: c.text },
  lbl: { fontSize: 12, color: c.muted },
});
