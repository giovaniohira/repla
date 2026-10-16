import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PRIVACY_URL, SUPPORT_EMAIL, TERMS_URL } from '@/lib/links';
import { c, r } from '@/theme';
import { Row } from '@/ui/Rows';

const PRIVACY = `Coletamos apenas o que você registra no app: e-mail, nome, medidas e metas, refeições, treinos e peso. Esses dados ficam na sua conta (Supabase) e servem só para o app funcionar para você.

Não vendemos nem compartilhamos seus dados para publicidade. A busca de alimentos consulta o Open Food Facts. A câmera é usada apenas para ler códigos de barras e nenhuma imagem é guardada.

Você pode exportar seus dados e excluir sua conta a qualquer momento no Perfil; a exclusão apaga tudo de forma permanente.`;

const TERMS = `O Repla é uma ferramenta de acompanhamento e não substitui orientação de médico, nutricionista ou educador físico. As metas calculadas são estimativas.

Você é responsável por manter sua senha em segurança e pelos dados que registra. Treine dentro dos seus limites.`;

const open = (url: string) => WebBrowser.openBrowserAsync(url).catch(() => Linking.openURL(url));

export default function About() {
  return (
    <ScrollView style={s.screen} contentContainerStyle={{ padding: 16, gap: 14 }}>
      <View style={s.card}>
        <Text style={s.title}>Repla</Text>
        <Text style={s.sub}>Versão {Constants.expoConfig?.version ?? '—'}</Text>
      </View>
      {!!PRIVACY_URL && <Row icon="shield-checkmark-outline" label="Política de privacidade (site)" onPress={() => open(PRIVACY_URL)} />}
      {!!TERMS_URL && <Row icon="document-text-outline" label="Termos de uso (site)" onPress={() => open(TERMS_URL)} />}
      {!!SUPPORT_EMAIL && <Row icon="mail-outline" label="Contato e feedback" onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)} />}
      <View style={s.card}><Text style={s.title}>Privacidade</Text><Text style={s.body}>{PRIVACY}</Text></View>
      <View style={s.card}><Text style={s.title}>Termos de uso</Text><Text style={s.body}>{TERMS}</Text></View>
      <View style={s.card}>
        <Text style={s.title}>Créditos</Text>
        <Text style={s.body}>Dados de alimentos: Open Food Facts (licença ODbL) e Tabela TACO. GIFs de exercícios: ExerciseDB.</Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  card: { backgroundColor: c.card, borderRadius: r.card, padding: 16, gap: 8 },
  title: { fontSize: 15, fontWeight: '700', color: c.text },
  sub: { fontSize: 13, color: c.muted },
  body: { fontSize: 13, lineHeight: 19, color: c.muted },
});
