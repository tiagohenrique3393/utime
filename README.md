# YouTime

Aplicativo mobile para a evolução de três pilares: corpo, mente e espírito.

A jornada diária, os 30 dias e os pilares de Corpo, Mente e Espírito já funcionam. O cadastro e a entrada por e-mail usam o Supabase. O botão do Google continua como prévia local.

## Stack

- React Native
- Expo SDK 57
- Expo Router
- TypeScript

O app está preparado para Android e iOS. As pastas nativas não ficam no repositório: o Expo gera `android/` e `ios/` na hora do build a partir do `app.json`.

| Plataforma | Identificador |
| --- | --- |
| iOS | `app.youtime.mobile` |
| Android | `app.youtime.mobile` |
| Esquema | `youtime://` |

## Como rodar

```bash
npm install
npx expo start
```

- **Android:** abra o projeto no [Expo Go](https://expo.dev/go) ou rode `npm run android` (Android Studio).
- **iOS:** abra no Expo Go ou rode `npm run ios` em um Mac com Xcode.
- **Prévia no navegador:** `npm run web`.

A tela inicial está em `src/app/index.tsx`. Novas rotas entram como arquivos em `src/app/`.

## Autenticação

O cadastro, a entrada e a recuperação de senha por e-mail usam o Supabase. A sessão fica salva no aparelho e continua depois de fechar o aplicativo. Cada conta lê apenas o próprio perfil e as próprias tarefas, guardados neste aparelho.

Crie um arquivo `.env.local` na raiz (ele não entra no Git):

```bash
EXPO_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=sua-chave-publicavel
```

Use a chave publicável do projeto, nunca a chave secreta. No painel do Supabase, em Authentication → URL Configuration, inclua o endereço em que o app está aberto para os links de confirmação e de nova senha abrirem o YouTime.
