# Release Checklist

## English

Use this checklist before publishing a new version of the app.

1. Update the version in `package.json`.
2. Run local validation:
   - `npm run build:renderer`
   - `npm run verify:release`
   - `npm run build`
   - `npm run build:release`
3. Open the generated app and test:
   - welcome flow
   - radio search
   - add/edit/delete
   - ETS2 sync
   - ET2 relay toggle
   - tray minimize/restore
   - PayPal support button
4. Confirm the bundled `ffmpeg` is present in the packaged app.
   The GitHub Release workflow prepares this file automatically before packaging.
5. Review `README.md` if features, installation steps, or build targets changed.
6. Commit the final changes.
7. Create and push a tag like `v0.2.0`.
8. Let GitHub Actions publish the Release and attach the `.exe` files.

## Português do Brasil

Use esta checklist antes de publicar uma nova versão do app.

1. Atualize a versão em `package.json`.
2. Rode a validação local:
   - `npm run build:renderer`
   - `npm run verify:release`
   - `npm run build`
   - `npm run build:release`
3. Abra o app gerado e teste:
   - fluxo de boas-vindas
   - busca de rádios
   - adicionar/editar/excluir
   - sincronização com o ETS2
   - botão ET2 para ligar/desligar relay
   - minimizar/restaurar pela bandeja
   - botão de apoio via PayPal
4. Confirme se o `ffmpeg` embarcado está dentro do app empacotado.
   A workflow de Release do GitHub prepara esse arquivo automaticamente antes do empacotamento.
5. Revise o `README.md` se recursos, instalação ou tipos de build mudarem.
6. Faça o commit final das mudanças.
7. Crie e envie uma tag como `v0.2.0`.
8. Deixe o GitHub Actions publicar a Release e anexar os arquivos `.exe`.
