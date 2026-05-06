# ETS2 Live Radio Editor

English below. Português do Brasil logo depois.

## English

### What this project is

ETS2 Live Radio Editor is a desktop application built to make custom internet radio management easier for **Euro Truck Simulator 2** players.

Instead of manually editing `live_streams.sii`, searching for direct stream URLs by hand, or configuring local relays in a technical way, the app gives you a visual workflow for:

- searching online radios from a catalog
- adding radios manually when needed
- syncing the radio list to ETS2 automatically
- delivering radio audio to the game through local `ffmpeg` relays

### Main features

- Electron desktop app with a React + TypeScript interface
- radio catalog search and assisted add flow
- automatic `live_streams.sii` sync after add, edit, and delete
- on-demand relay architecture to reduce CPU and memory spikes
- bundled `ffmpeg` for distribution builds
- environment diagnostics for ETS2 and `ffmpeg`
- system tray support on Windows
- accessibility and appearance customization

### First use

On the first use of the app, click `Import from ETS2` before making other changes.

This initial import loads the radios that already exist in the game's current `live_streams.sii` file into the app, so the visual list starts from the real ETS2 state instead of an empty or outdated local list.

### ffmpeg dependency

This project depends on `ffmpeg` to relay radio audio into ETS2.

- In packaged Windows builds, `ffmpeg` is bundled with the app during the release process.
- In local development, the app can still use a system installation such as `C:\ffmpeg\bin\ffmpeg.exe` if needed.

Official project:
- [FFmpeg official website](https://ffmpeg.org/)

### Tech stack

- `Electron`
- `React`
- `TypeScript`
- `Vite`
- `electron-builder`

### Project structure

- `electron/`
  Desktop process, preload bridge, environment checks, relay control, tray integration.
- `src/`
  React interface, styling, translations, and user flows.
- `shared/`
  Shared data consumed by more than one layer, especially translations.
- `assets/`
  Icons and visual assets used by the app.
- `vendor/ffmpeg/`
  Bundled `ffmpeg` used in packaged builds.
- `review-log-2026-05-05.md`
  Technical review history with problems, risks, fixes, and validation notes.

### Development

```powershell
cd "<project-root>"
npm install
npm run dev
```

### Build for distribution

```powershell
cd "<project-root>"
npm run build
```

For GitHub release packaging, the project uses:

```powershell
cd "<project-root>"
npm run build:release
```

This command is important because it forces `electron-builder` to package with `--publish never`, leaving GitHub Release publishing to the workflow step that uploads the `.exe` files.

The release build now includes an extra safety validation step before packaging:

- it verifies that `dist/index.html` uses relative asset paths such as `./assets/...`
- it verifies that every referenced local asset exists
- it rejects remote Google Fonts references in the packaged renderer

You can run only this validation with:

```powershell
cd "<project-root>"
npm run verify:release
```

Current Windows build targets:

- `portable` `.exe`
- `nsis` installer `.exe`

### GitHub automation

This repository includes two GitHub Actions workflows:

- `CI`
  Runs on pushes to `main` and on pull requests. It installs dependencies, checks the main Electron files, builds the renderer, and runs TypeScript validation.
- `Release`
  Runs on Windows when you push a tag like `v0.2.0` or start it manually from GitHub Actions. It builds the app and publishes the generated `.exe` files in a GitHub Release.

Release steps at a high level:

1. update the version in `package.json`
2. commit the final changes
3. create and push a tag like `v0.2.0`
4. wait for the Release workflow to finish

Detailed release notes and manual test reminders are available in [docs/release-checklist.md](docs/release-checklist.md).

### Important note

The game can only play the custom radios while this app is running, because the local relay layer stays active in the background and feeds the audio to ETS2.

### Current product direction

This project is being shaped as a more polished desktop tool for ETS2 players, with focus on:

- easier radio discovery
- less manual configuration
- better performance
- clearer diagnostics
- a more professional desktop UX

---

## Português do Brasil

### O que é este projeto

O ETS2 Live Radio Editor é um aplicativo desktop criado para facilitar o gerenciamento de rádios online personalizadas no **Euro Truck Simulator 2**.

Em vez de editar o `live_streams.sii` manualmente, procurar links diretos de stream por conta própria ou configurar relays locais de forma técnica, o app oferece um fluxo visual para:

- buscar rádios online em um catálogo
- adicionar rádios manualmente quando necessário
- sincronizar a lista com o ETS2 automaticamente
- entregar o áudio ao jogo usando relays locais com `ffmpeg`

### Principais recursos

- aplicativo desktop em Electron com interface React + TypeScript
- busca de rádios por catálogo com fluxo guiado
- sincronização automática do `live_streams.sii` ao adicionar, editar e excluir
- arquitetura de relay sob demanda para reduzir picos de CPU e memória
- `ffmpeg` embarcado nas builds de distribuição
- diagnóstico de ambiente para ETS2 e `ffmpeg`
- suporte a bandeja do sistema no Windows
- acessibilidade e personalização visual

### Primeiro uso

No primeiro uso do aplicativo, clique em `Import from ETS2` antes de fazer outras alterações.

Essa importação inicial carrega para o app as rádios que já existem no arquivo `live_streams.sii` atual do jogo, para que a lista visual comece a partir do estado real do ETS2, e não de uma lista vazia ou desatualizada.

### Dependência do ffmpeg

Este projeto depende do `ffmpeg` para entregar o áudio das rádios ao ETS2.

- Nas builds empacotadas para Windows, o `ffmpeg` é incluído no app durante o processo de release.
- No desenvolvimento local, o app também pode usar uma instalação do sistema, como `C:\ffmpeg\bin\ffmpeg.exe`, quando necessário.

Projeto oficial:
- [Site oficial do FFmpeg](https://ffmpeg.org/)

### Stack técnica

- `Electron`
- `React`
- `TypeScript`
- `Vite`
- `electron-builder`

### Estrutura do projeto

- `electron/`
  Processo principal do desktop, preload, checagens de ambiente, controle dos relays e integração com tray.
- `src/`
  Interface React, estilos, traduções e fluxos de uso.
- `shared/`
  Dados compartilhados entre mais de uma camada, especialmente traduções.
- `assets/`
  Ícones e recursos visuais usados pelo app.
- `vendor/ffmpeg/`
  `ffmpeg` embarcado usado nas builds empacotadas.
- `review-log-2026-05-05.md`
  Histórico técnico das revisões com problemas, riscos, correções e validações.

### Como rodar em desenvolvimento

```powershell
cd "<pasta-do-projeto>"
npm install
npm run dev
```

### Como gerar build para distribuição

```powershell
cd "<pasta-do-projeto>"
npm run build
```

Para empacotamento de release no GitHub, o projeto usa:

```powershell
cd "<pasta-do-projeto>"
npm run build:release
```

Esse comando e importante porque força o `electron-builder` a empacotar com `--publish never`, deixando a publicacao da GitHub Release para a etapa da workflow que anexa os arquivos `.exe`.

O build de release agora inclui uma validação extra antes do empacotamento:

- verifica se o `dist/index.html` usa caminhos relativos como `./assets/...`
- verifica se todos os assets locais referenciados realmente existem
- bloqueia referências remotas ao Google Fonts no renderer empacotado

Se quiser rodar só essa verificação, use:

```powershell
cd "<pasta-do-projeto>"
npm run verify:release
```

Atualmente o build do Windows gera:

- `.exe` portátil
- instalador `.exe` via NSIS

### Automação no GitHub

Este repositório agora inclui duas workflows do GitHub Actions:

- `CI`
  Roda em pushes para `main` e em pull requests. Ela instala as dependências, valida os arquivos principais do Electron, gera o build do renderer e roda a validação de TypeScript.
- `Release`
  Roda no Windows quando você envia uma tag como `v0.2.0` ou dispara manualmente pelo GitHub Actions. Ela gera o app e publica os arquivos `.exe` em uma GitHub Release.

Fluxo de release em alto nível:

1. atualizar a versão no `package.json`
2. fazer o commit final
3. criar e enviar uma tag como `v0.2.0`
4. aguardar a workflow `Release` terminar

Os detalhes da publicação e a checklist de testes manuais estão em [docs/release-checklist.md](docs/release-checklist.md).

### Observação importante

O jogo só consegue tocar as rádios personalizadas enquanto este app estiver aberto, porque a camada de relay local continua ativa em segundo plano e entrega o áudio ao ETS2.

### Direção atual do produto

Este projeto está sendo moldado como uma ferramenta desktop mais polida para jogadores de ETS2, com foco em:

- descoberta mais fácil de rádios
- menos configuração manual
- melhor performance
- diagnósticos mais claros
- experiência de desktop mais profissional
