# Repla

App de dieta e treino em um só lugar: registra refeições (busca no Open Food Facts ou código de barras) e treinos (séries, descanso, PR) e mostra a evolução. Feito com Expo e Supabase.

## Stack

- **App:** Expo (React Native + TypeScript), Expo Router, `expo-camera` para o scanner de código de barras.
- **Backend:** Supabase (Auth, Postgres com RLS e RPCs). As migrations estão em [`supabase/migrations`](supabase/migrations).
- **Alimentos:** Open Food Facts direto do cliente. O produto escolhido é copiado para a tabela `foods`.
- **Offline:** cache de leitura persistido e fila de escrita (`outbox`).

## Recursos

- **Hoje:** anel de kcal, macros, streak e treino do dia.
- **Nutrição:** busca, código de barras, alimento próprio, recentes e favoritos, editar gramas, copiar o dia, swipe com desfazer.
- **Treino:** sessão flexível (pular, série extra, adicionar exercício no meio), descanso com ajuste da próxima série, sugestão de +2,5 kg, PR por 1RM estimado e modelos prontos (Full body, Push, Pull, Legs).
- **Progresso:** kcal e proteína por dia, peso, cargas por exercício, histórico e calendário de consistência.
- **Lembretes locais:** fim do descanso, refeições, sequência em risco e resumo semanal.
- Dark mode, skeletons, toasts e haptics. Excluir conta via RPC `delete_my_account` (exigência da Play Store).

## Rodando

```bash
cd mobile
cp .env.example .env   # EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_KEY
npm install
npx expo start         # abre no Expo Go
```

Para aplicar o schema: `supabase db push` com as migrations do repositório.

O roadmap e o estado atual estão em [PLAN.md](PLAN.md).
