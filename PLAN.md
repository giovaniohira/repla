# Repla — plano

## Stack
- Expo (React Native, TypeScript) + Expo Router. Roda no celular via **Expo Go** (sem Android Studio/SDK).
- Supabase: Auth + Postgres + RLS. Projeto `calorie-gym-app` (ref `aqzosvwsgxuemymetuys`, sa-east-1, free).
- Cliente: `@supabase/supabase-js` + `expo-secure-store` (sessão).
- Open Food Facts: fetch direto, `User-Agent` próprio, cópia do produto para `foods`.
- Cache offline: TanStack Query + persistência em AsyncStorage no MVP. Sync com fila/Room só se precisar.
- Play Store depois: `eas build` (nuvem) gera o AAB; ainda sem Android Studio.

## Limites do Expo Go
- Login Google nativo não roda no Expo Go: e-mail/senha primeiro; Google via development build (EAS) depois.
- Scanner de código de barras: `expo-camera` funciona no Expo Go.

## Telas
Auth: Login, Cadastro, Recuperar senha.
Abas: Hoje, Treinos, Progresso, Perfil.
- Hoje: barras kcal/proteína, refeições, "+" → Adicionar (meus alimentos | Open Food Facts | código de barras).
- Treinos: lista, editor de rotina, biblioteca de exercícios, sessão ativa (séries, descanso), histórico.
- Progresso: carga por exercício, kcal/proteína por dia.
- Perfil: metas, sair, excluir conta (obrigatório Play Store).

## Fases
1. Schema Supabase (`supabase/migrations/0001_init.sql`) + app Expo + login.
2. Nutrição.
3. Treino.
4. Progresso.
5. Play Store: privacidade, Data Safety, exclusão de conta (edge function), EAS build, teste fechado (12 testers, 14 dias).

## Estado (pacotes premium)
Feito: Hoje (anel, macros, streak, treino do dia), Progresso (kcal/proteína, peso, cargas, PR, histórico), sessão de treino (última vez, PR, retomar, resumo), nutrição (dias, swipe+desfazer, editar gramas, recentes, favoritos, código de barras, alimento próprio, copiar dia), perfil/metas, esqueci a senha, excluir conta (RPC `delete_my_account`, migration 0004), dark mode (segue o sistema ao abrir), skeletons, toasts, haptics, cache de leitura offline.
Sessão flexível (lista de exercícios, pular, série extra, adicionar exercício no meio, descanso compacto com ajuste da próxima série, sugestão de +2,5 kg, PR por 1RM estimado, finalizar manual, sair e continuar depois), banner "Treino em andamento", sessões abandonadas vão pro histórico, editor com steppers/reordenar/desfazer, catálogo com seleção múltipla.
Modelos de treino prontos (Full body, Push, Pull, Legs) e resumo pós-treino com volume vs último, streak e próximo treino.
Lembretes locais (fim do descanso, refeições 12:30/19:30, sequência em risco 20:30, resumo semanal domingo; Perfil > Lembretes). Progresso virou aba, com resumo da semana e calendário de consistência.
Falta: ícone/splash próprios, política de privacidade (URL), deep link do reset de senha, fonte de marca, fila de escrita offline.
