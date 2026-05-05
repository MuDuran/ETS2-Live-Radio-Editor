# ETS2 Live Radio Editor

Ferramenta desktop para:

- gerenciar a lista de radios do Euro Truck
- sincronizar o `live_streams.sii`
- iniciar relays locais com `ffmpeg`
- distribuir um app visualmente mais proximo de um produto desktop moderno

## Stack atual

- `Electron`
- `React`
- `TypeScript`
- `Vite`

## Como rodar em desenvolvimento

```powershell
cd "C:\Users\muril\Documents\ET2-Radio-Relays"
npm install
npm run dev
```

## Como gerar build

```powershell
cd "C:\Users\muril\Documents\ET2-Radio-Relays"
npm run build
```

## Estrutura principal

- `electron/`: processo principal, preload e logica desktop
- `src/`: interface React
- `stations.json`: base de radios
- `settings.json`: preferencias locais
- `review-log-2026-05-05.md`: registro das revisoes tecnicas

## Observacao importante

O app usa `ffmpeg` para transformar streams em um formato mais amigavel para o ETS2. Por isso, ao usar radios no jogo, o app precisa ficar aberto enquanto os relays estiverem ativos.
