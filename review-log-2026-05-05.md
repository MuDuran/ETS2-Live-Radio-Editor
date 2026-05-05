# Revisoes Tecnicas - 2026-05-05

## Contexto
Migracao inicial do app de `Tkinter` para `PySide6`, com nova arquitetura em camadas e nova UI no conceito `Control Room`.

## Revisao 1 - Arquitetura e separacao de responsabilidades
- Problema: a interface antiga concentrava armazenamento, validacao, importacao do ETS2 e operacao de UI no mesmo arquivo.
- Risco: manutencao dificil, regressao facil e baixa clareza para evoluir a aplicacao.
- Correcao aplicada:
  - criacao de `core/` para caminhos e modelos;
  - criacao de `services/` para configuracoes, estacoes e ETS2;
  - criacao de `ui/` para janelas, dialogos e tema;
  - `app.py` virou apenas ponto de entrada.
- Resultado da revisao seguinte: a janela principal passou a depender de servicos reutilizaveis, reduzindo acoplamento.

## Revisao 2 - Fluxo de idioma e estado da aplicacao
- Problema: a troca de idioma precisava atualizar a interface inteira, nao apenas salvar a preferencia.
- Risco: o usuario trocar idioma e sentir que o botao "nao funciona".
- Correcao aplicada:
  - recriacao controlada da janela principal ao trocar idioma;
  - preservacao da lista atual de radios, navegacao atual e relay manager existente;
  - persistencia imediata da preferencia em `settings.json`.
- Resultado da revisao seguinte: o fluxo de idioma ficou consistente com o comportamento esperado para o app.

## Revisao 3 - Consistencia visual e pequenos detalhes de UX
- Problema:
  - destaque visual da navegacao lateral podia nao acompanhar a pagina atual;
  - o dialogo de radio ainda tinha um botao `Cancel` fixo em ingles.
- Risco: experiencia visual inconsistente e quebra parcial da localizacao.
- Correcao aplicada:
  - sincronizacao do estado da barra lateral com a pagina ativa;
  - repintura do estilo dos botoes de navegacao quando o estado muda;
  - adicao da chave `cancel_button` nas traducoes e uso dela no dialogo.
- Resultado final: navegacao mais coerente e melhor consistencia na localizacao visivel.

## Validacoes executadas
- `python -m py_compile` na nova base PySide6
- abertura invisivel da janela com `QT_QPA_PLATFORM=offscreen`
- verificacao de carregamento de 275 radios da base atual

## Pendencias para teste manual
- validar visualmente o layout `Control Room`
- validar fluxo de criar/editar/remover radios
- validar troca de idioma no app aberto
- validar `Apply to ETS2`, `Turn radios on` e `Turn radios off`

## Revisao 4 - Migracao para Electron
- Problema: a direcao em `Qt` nao chegou perto o suficiente do conceito visual desejado.
- Risco: insistir nessa stack de UI consumiria tempo sem garantir fidelidade visual.
- Correcao aplicada:
  - migracao da UI para `Electron + React + Vite`;
  - port da logica principal para `Node` no processo principal;
  - separacao entre renderer, processo principal e camada de persistencia.
- Resultado da revisao seguinte: renderer compilando, backend Electron validado e build de executavel portatil funcionando.

## Revisao 5 - Testes funcionais do backend Electron
- Problema: apos a migracao, era preciso garantir que a logica principal continuava correta sem depender do visual.
- Risco: interface bonita por fora, mas regras de negocio quebradas por dentro.
- Correcao aplicada:
  - validacao da importacao do ETS2;
  - validacao da escrita segura do `live_streams.sii` em copia temporaria;
  - validacao do ciclo de start/stop de relay com `ffmpeg`.
- Resultado da revisao seguinte: os fluxos centrais do backend passaram nos testes automatizados manuais.

## Revisao 6 - Empacotamento do executavel
- Problema: o primeiro empacotamento falhou por causa de dependencias de assinatura no Windows exigindo privilegio para links simbolicos.
- Risco: o app funcionar em desenvolvimento, mas travar no caminho para distribuicao.
- Correcao aplicada:
  - troca do alvo inicial para build `portable`;
  - desativacao de `signAndEditExecutable` na configuracao do Windows.
- Resultado final: o build do `.exe` portatil foi concluido com sucesso.
