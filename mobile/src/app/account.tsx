import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '@/lib/supabase';
import { c, r } from '@/theme';
import { Button } from '@/ui/Button';
import { toast } from '@/ui/Toast';

export default function Account() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [current, setCurrent] = useState('');
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ''));
    supabase.from('profiles').select('display_name').maybeSingle().then(({ data }) => setName(data?.display_name ?? ''));
  }, []);

  async function run(k: string, fn: () => PromiseLike<{ error: { message: string } | null }>, ok: string) {
    setBusy(k);
    const { error } = await fn();
    setBusy('');
    if (error) return toast(error.message, { error: true });
    toast(ok);
  }

  const saveName = () => run('name', async () => {
    const { data: u } = await supabase.auth.getUser();
    return supabase.from('profiles').update({ display_name: name.trim() || null }).eq('user_id', u.user!.id);
  }, 'Nome salvo');

  const saveEmail = () => run('email', () => supabase.auth.updateUser({ email: email.trim() }), 'Enviamos um link de confirmação para o novo e-mail.');

  // re-checks the current password first, so someone with an unlocked phone can't silently change it
  function savePass() {
    if (pass.length < 6) return toast('A senha precisa ter ao menos 6 caracteres.', { error: true });
    run('pass', async () => {
      const chk = await supabase.auth.signInWithPassword({ email, password: current });
      if (chk.error) return { error: { message: 'Senha atual incorreta.' } };
      const res = await supabase.auth.updateUser({ password: pass });
      if (!res.error) { setCurrent(''); setPass(''); }
      return res;
    }, 'Senha alterada');
  }

  const input = (v: string, set: (s: string) => void, ph: string, extra = {}) => (
    <TextInput style={s.input} value={v} onChangeText={set} placeholder={ph} placeholderTextColor={c.faint} autoCapitalize="none" {...extra} />
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView style={s.screen} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <View style={s.card}>
          <Text style={s.title}>Nome</Text>
          {input(name, setName, 'Como devemos te chamar?', { maxLength: 40, autoCapitalize: 'words' })}
          <Button label="Salvar nome" onPress={saveName} busy={busy === 'name'} />
        </View>
        <View style={s.card}>
          <Text style={s.title}>E-mail</Text>
          {input(email, setEmail, 'E-mail', { keyboardType: 'email-address' })}
          <Button label="Alterar e-mail" onPress={saveEmail} busy={busy === 'email'} />
        </View>
        <View style={s.card}>
          <Text style={s.title}>Senha</Text>
          {input(current, setCurrent, 'Senha atual', { secureTextEntry: true })}
          {input(pass, setPass, 'Nova senha (mín. 6)', { secureTextEntry: true })}
          <Button label="Alterar senha" onPress={savePass} busy={busy === 'pass'} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  card: { backgroundColor: c.card, borderRadius: r.card, padding: 16, gap: 12 },
  title: { fontSize: 15, fontWeight: '700', color: c.text },
  input: { backgroundColor: c.bg, borderRadius: r.sm, padding: 12, fontSize: 16, color: c.text },
});
