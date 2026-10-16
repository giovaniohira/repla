import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '@/lib/haptics';
import { useRef, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { c, r } from '@/theme';
import { Button } from '@/ui/Button';
import { Mascot } from '@/ui/Mascot';

type Mode = 'signin' | 'signup' | 'reset';

// Supabase error messages are in English; translate the common ones.
const ptError = (m: string) =>
  /invalid login credentials/i.test(m) ? 'E-mail ou senha incorretos.'
  : /already registered|already been registered/i.test(m) ? 'Este e-mail já tem uma conta. Tente entrar.'
  : /rate limit|too many/i.test(m) ? 'Muitas tentativas. Aguarde um pouco e tente de novo.'
  : /network|fetch/i.test(m) ? 'Sem conexão com a internet.'
  : /email not confirmed/i.test(m) ? 'Confirme seu e-mail antes de entrar (veja sua caixa de entrada).'
  : /provider is not enabled/i.test(m) ? 'Login com Google ainda não está disponível.'
  : /valid email|invalid.*email/i.test(m) ? 'E-mail inválido.'
  : m;

export default function Login() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<Mode>(params.mode === 'signup' ? 'signup' : 'signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const pass = useRef<TextInput>(null);
  const shake = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  function fail(msg: string) {
    setError(msg);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    shake.set(withSequence(withTiming(-8, { duration: 50 }), withTiming(8, { duration: 80 }), withTiming(-6, { duration: 80 }), withTiming(0, { duration: 50 })));
  }

  async function submit() {
    setError(''); setInfo('');
    const mail = email.trim();
    if (!mail.includes('@')) return fail('Informe um e-mail válido.');
    if (mode === 'reset') {
      setBusy(true);
      const { error } = await supabase.auth.resetPasswordForEmail(mail);
      setBusy(false);
      if (error) return fail(ptError(error.message));
      return setInfo('Se o e-mail existir, enviamos um link para redefinir a senha. Confira sua caixa de entrada.');
    }
    if (password.length < 6) return fail('A senha precisa ter 6 ou mais caracteres.');
    setBusy(true);
    const creds = { email: mail, password };
    const res = mode === 'signup' ? await supabase.auth.signUp(creds) : await supabase.auth.signInWithPassword(creds);
    setBusy(false);
    if (res.error) return fail(ptError(res.error.message));
    // signup with e-mail confirmation on returns no session
    if (mode === 'signup' && !res.data.session) setInfo('Conta criada! Enviamos um e-mail de confirmação. Confirme e depois entre.');
    // otherwise onAuthStateChange in _layout swaps the screen
  }

  async function google() {
    setError(''); setInfo('');
    setBusy(true);
    try {
      const redirectTo = Linking.createURL('auth-callback');
      const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo, skipBrowserRedirect: true } });
      if (error) return fail(ptError(error.message));
      const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (res.type !== 'success') return;
      // implicit flow returns the tokens in the URL fragment; onAuthStateChange in _layout swaps the screen
      const q = new URLSearchParams(res.url.split('#')[1] ?? '');
      const access_token = q.get('access_token'), refresh_token = q.get('refresh_token');
      if (!access_token || !refresh_token) return fail('Não foi possível entrar com o Google.');
      const { error: e2 } = await supabase.auth.setSession({ access_token, refresh_token });
      if (e2) fail(ptError(e2.message));
    } finally {
      setBusy(false);
    }
  }

  const go = (m: Mode) => { setMode(m); setError(''); setInfo(''); };
  const title = mode === 'signup' ? 'Criar conta' : mode === 'reset' ? 'Recuperar senha' : 'Entrar';

  return (
    <SafeAreaView style={s.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
          <Animated.View entering={FadeIn.duration(600)}><Mascot size={110} /></Animated.View>
          <Text style={s.title}>{title}</Text>
          {mode === 'reset' && <Text style={s.sub}>Informe seu e-mail e enviaremos um link para criar uma nova senha.</Text>}
          <Animated.View style={[{ alignSelf: 'stretch', gap: 12 }, shakeStyle]}>
            <TextInput style={s.input} placeholder="E-mail" placeholderTextColor={c.faint} autoCapitalize="none" keyboardType="email-address"
              autoComplete="email" value={email} onChangeText={setEmail} returnKeyType={mode === 'reset' ? 'send' : 'next'}
              onSubmitEditing={() => (mode === 'reset' ? submit() : pass.current?.focus())} />
            {mode !== 'reset' && (
              <View style={s.passBox}>
                <TextInput ref={pass} style={s.passInput} placeholder="Senha" placeholderTextColor={c.faint} secureTextEntry={!show}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChangeText={setPassword} onSubmitEditing={submit} />
                <Pressable onPress={() => setShow(!show)} hitSlop={10}><Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={22} color={c.faint} /></Pressable>
              </View>
            )}
          </Animated.View>
          {!!error && <Text style={s.error}>{error}</Text>}
          {!!info && <Text style={s.info}>{info}</Text>}
          <View style={{ alignSelf: 'stretch' }}>
            <Button label={mode === 'reset' ? 'Enviar link' : title} onPress={submit} busy={busy} />
          </View>
          {mode !== 'reset' && (
            <>
              <Text style={s.or}>ou</Text>
              <Pressable onPress={google} disabled={busy} style={s.google}>
                <Ionicons name="logo-google" size={20} color={c.text} />
                <Text style={s.googleTxt}>Continuar com Google</Text>
              </Pressable>
            </>
          )}
          {mode === 'signin' && <Pressable onPress={() => go('reset')}><Text style={s.link}>Esqueci minha senha</Text></Pressable>}
          <Pressable onPress={() => go(mode === 'signup' || mode === 'reset' ? 'signin' : 'signup')}>
            <Text style={s.link}>{mode === 'signin' ? 'Criar uma conta' : 'Já tenho conta'}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  body: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 },
  title: { fontSize: 24, fontWeight: '700', color: c.text, marginBottom: 4 },
  sub: { color: c.muted, textAlign: 'center' },
  input: { alignSelf: 'stretch', backgroundColor: c.card, borderRadius: r.btn, padding: 14, fontSize: 16, color: c.text },
  passBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.card, borderRadius: r.btn, paddingRight: 14 },
  passInput: { flex: 1, padding: 14, fontSize: 16, color: c.text },
  error: { color: c.danger, alignSelf: 'stretch' },
  info: { color: c.primaryDark, alignSelf: 'stretch', backgroundColor: c.primarySoft, padding: 12, borderRadius: r.sm },
  or: { color: c.faint, fontSize: 14 },
  google: { alignSelf: 'stretch', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, paddingVertical: 14, borderRadius: r.btn, borderWidth: 2, borderColor: c.line, backgroundColor: c.card },
  googleTxt: { color: c.text, fontSize: 16, fontWeight: '600' },
  link: { color: c.primary, fontSize: 15, marginTop: 8, fontWeight: '600' },
});
