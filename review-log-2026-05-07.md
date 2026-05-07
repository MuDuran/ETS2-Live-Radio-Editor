# Review Log - 2026-05-07

## Ciclo 1 - Arquitetura multi-game
- Problema revisado: a base do aplicativo estava acoplada ao ETS2 em diretórios, importação, sincronização e tipagem.
- Risco: o suporte a ATS seria feito de forma espalhada pelo código, o que aumentaria retrabalho e chance de inconsistência.
- Correção aplicada: introdução de `activeGame`, `lastSelectedGame`, `gameDirs` por jogo, perfis centralizados em `shared/gameProfiles.json` e generalização do fluxo de ambiente/importação/sync para `game`.
- Resultado da revisão seguinte: a arquitetura ficou reutilizável para ETS2 e ATS sem duplicar o app.

## Ciclo 2 - Corner case de dados por jogo
- Problema revisado: a escolha do jogo já é dinâmica, mas a lista de rádios continua compartilhada no mesmo `stations.json`.
- Risco: importar rádios do ATS pode substituir visualmente a lista que antes representava o ETS2, ou vice-versa, dependendo da estratégia de uso que decidirmos para o produto.
- Correção aplicada: separação das listas locais em `stations-ets2.json` e `stations-ats.json`, com recarga automática da coleção correta ao trocar o `activeGame`.
- Resultado da revisão seguinte: ETS2 e ATS agora podem manter coleções independentes no app, sem sobrescrever o estado visual um do outro.

## Ciclo 3 - Internacionalização e UX residual
- Problema revisado: os textos dinâmicos principais foram atualizados para inglês e português do Brasil, mas idiomas secundários ainda têm algumas mensagens antigas citando ETS2.
- Risco: usuários em outros idiomas podem ver textos parcialmente específicos de ETS2 ao usar ATS.
- Correção aplicada: nesta etapa, os fluxos dinâmicos principais foram ajustados em `en` e `pt-BR`, que são os idiomas de validação imediata do projeto.
- Resultado da revisão seguinte: não há bloqueio funcional para a validação atual, mas vale planejar uma passada futura para alinhar os demais idiomas.

## Ciclo 4 - Troca de jogo com relays ativos e entrada da sessão
- Problema revisado: trocar de ETS2 para ATS com relays ativos poderia deixar listeners armados para o jogo anterior e gerar estado híbrido.
- Risco: reprodução instável, listeners misturados e UX confusa ao alternar o jogo com o motor de relay ainda ligado.
- Correção aplicada: bloqueio da troca de jogo quando os relays estão ativos ou ainda em startup, tanto no fluxo da sessão quanto na troca por `Settings`. Também foi criado um modal de sessão que aparece ao abrir o app para confirmar ETS2 ou ATS antes do uso normal.
- Resultado da revisão seguinte: a sessão agora começa com um jogo explicitamente escolhido, e a troca em tempo de execução fica protegida contra um estado inseguro do relay.

## Ciclo 5 - Prontidão de release multi-game
- Problema revisado: a versão multi-game ainda carregava dois riscos típicos de release: `productName` com barra (`/`) e empacotamento de `stations.json`/`settings.json`, o que poderia gerar nome de artefato problemático no Windows e vazamento de dados locais no instalador.
- Risco: falha no empacotamento Windows, atalhos com nome inconsistente ou release distribuindo configuração/lista pessoal do ambiente de desenvolvimento.
- Correção aplicada: troca do nome visível do produto para `ETS2 and ATS Live Radio Editor`, remoção de `stations.json` e `settings.json` da lista de arquivos empacotados, alinhamento do nome do artefato da workflow e revisão dos textos principais de `en` e `pt-BR` para não dependerem mais de rótulos presos ao ETS2.
- Resultado da revisão seguinte: a release ficou mais segura para o Windows e mais limpa para distribuição pública, sem depender de dados locais do desenvolvedor.
