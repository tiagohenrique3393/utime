# YouTime

Aplicativo mobile para a evolução de três pilares: corpo, mente e espírito.

Este primeiro passo entrega a estrutura do projeto, o Expo Router e uma tela inicial escura e minimalista. Login, pagamentos e banco de dados ficam para depois.

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
