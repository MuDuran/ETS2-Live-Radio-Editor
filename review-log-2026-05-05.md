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

## Revisao 7 - Hierarquia visual da tela principal
- Problema: a tela principal ja tinha a estrutura correta, mas ainda parecia uma composicao intermediaria, com pouco contraste entre navegacao, operacao e edicao.
- Risco: o usuario entender a funcao do app, mas nao sentir a interface como uma ferramenta desktop madura.
- Correcao aplicada:
  - refinamento da sidebar com icones consistentes e estado ativo mais tecnico;
  - reorganizacao da toolbar com resumo operacional visivel;
  - reforco visual do bloco ET2 como elemento funcional de energia do sistema.
- Resultado da revisao seguinte: a leitura da tela ficou mais proxima da referencia `Control Room`, com menos cara de dashboard generico.

## Revisao 8 - Leitura tecnica da tabela e do painel lateral
- Problema: a tabela e o editor lateral estavam corretos funcionalmente, mas ainda podiam comunicar melhor contexto, selecao e estado.
- Risco: uso repetitivo cansativo, pouca clareza do item em edicao e menor percepcao de acabamento.
- Correcao aplicada:
  - melhoria do contraste das linhas, hover e selecao da tabela;
  - adicao de detalhes tecnicos por linha, como endereco local do relay;
  - criacao de card de contexto no editor lateral com modo atual e estado da radio selecionada;
  - reorganizacao dos campos em grupos mais legiveis.
- Resultado da revisao seguinte: a tela ficou mais densa e mais coerente com o papel central da lista e do editor.

## Revisao 9 - Consistencia de microcopy e validacao final
- Problema: ainda havia varios rotulos curtos em ingles ou com tom inconsistente para o fluxo principal.
- Risco: a interface parecer inacabada mesmo com o layout visual mais forte.
- Correcao aplicada:
  - inclusao de novas chaves de traducao para busca, paginacao, modos do editor e estados curtos;
  - padronizacao dos principais textos visiveis da aba de radios em portugues;
  - validacao por `npm run build` apos as mudancas na interface.
- Resultado final: build aprovado e ciclo de refinamento visual concluido sem mexer na logica do processo principal do Electron.

## Validacoes executadas neste ciclo
- `npm run build`

## Pendencias para teste manual deste ciclo
- validar visualmente a nova hierarquia da sidebar, toolbar e tabela
- validar o bloco ET2 ligado e desligado
- validar criacao de nova radio e edicao de radio existente
- validar busca sem resultados
- validar leitura da interface em janela menor e comportamento responsivo

## Revisao 10 - Compatibilidade das configuracoes entre arquivos e app Electron
- Problema: os arquivos de configuracao existentes usavam `ets2_dir` e `ffmpeg_path`, enquanto o app Electron lia `ets2Dir` e `ffmpegPath`.
- Risco: o usuario abrir o app com caminhos aparentemente preenchidos no disco, mas o backend tratar esses valores como ausentes e falhar em importacao, sync e relay.
- Correcao aplicada:
  - criacao de normalizacao de configuracoes no storage;
  - suporte temporario aos formatos antigo e novo;
  - migracao automatica para o formato camelCase esperado pelo app.
- Resultado da revisao seguinte: a leitura de configuracoes ficou consistente com a interface e com o backend principal.

## Revisao 11 - Estado real dos relays
- Problema: o backend tratava o inicio dos relays como sucesso imediato, sem acompanhar erro de spawn, saida precoce ou status intermediario.
- Risco: a interface afirmar que os relays estavam ativos quando o `ffmpeg` ja podia ter falhado em segundo plano.
- Correcao aplicada:
  - adicao de mapa de estados por porta no `relay-service`;
  - monitoramento de `spawn`, `error` e `exit`;
  - retorno de erro claro ao tentar iniciar relays sem radios.
- Resultado da revisao seguinte: os relays passaram a ter estados funcionais mais proximos da realidade de execucao.

## Revisao 12 - Atualizacao funcional da interface
- Problema: mesmo com backend melhor, a tela continuaria presa ao ultimo snapshot recebido se um relay caisse depois.
- Risco: o usuario interpretar a interface como valida quando o processo real ja mudou de estado.
- Correcao aplicada:
  - criacao de endpoint leve `get-runtime-state` no Electron;
  - polling periodico no renderer para atualizar resumo e status;
  - normalizacao das radios carregadas no bootstrap para remover ruidos como espacos extras nas fontes.
- Resultado final: o app ficou mais preparado para testes manuais funcionais, com estado visual menos enganoso.

## Validacoes executadas neste ciclo funcional
- `npm run build`

## Pendencias para teste manual deste ciclo funcional
- validar migracao automatica do arquivo de configuracoes legado
- validar importacao real do `live_streams.sii`
- validar sync para o ETS2 com backup criado corretamente
- validar iniciar/parar relays observando mudanca de estado na UI
- validar falha real de relay consultando logs quando uma radio nao responder

## Revisao 13 - Cadastro assistido por catalogo
- Problema: o fluxo de adicionar radio dependia de o usuario descobrir manualmente uma URL de stream direto, o que e tecnico demais para a proposta do produto.
- Risco: usuario desistir logo no principal caso de uso por nao saber diferenciar site de radio e link bruto de audio.
- Correcao aplicada:
  - integracao de busca com o catalogo `Radio Browser` no processo principal do Electron;
  - modelagem de filtros por nome, pais, idioma e tag;
  - mapeamento dos resultados para um formato simples consumido pelo renderer.
- Resultado da revisao seguinte: o app passou a oferecer um caminho guiado de descoberta e selecao de radios sem exigir conhecimento tecnico de streams.

## Revisao 14 - Preenchimento automatico e modo manual assistido
- Problema: mesmo com busca, ainda era preciso amarrar a experiencia final para o usuario confirmar e salvar sem se perder.
- Risco: a busca existir, mas o usuario nao entender como ela vira uma radio editavel dentro do app.
- Correcao aplicada:
  - criacao de modal de busca com resultados acionaveis;
  - preenchimento automatico do editor lateral ao escolher uma radio do catalogo;
  - callout didatico no modo manual explicando quando usar busca e quando usar URL direta.
- Resultado da revisao seguinte: a entrada principal ficou mais amigavel, enquanto o formulario manual continuou disponivel como opcao avancada.

## Revisao 15 - Confiabilidade do fluxo de apoio
- Problema: abrir o site da radio e testar o stream eram acoes de apoio importantes, mas precisavam acontecer de forma segura e coerente com Electron.
- Risco: o renderer tentar abrir links de forma inadequada ou a validacao do stream ficar opaca para o usuario.
- Correcao aplicada:
  - criacao de ponte `openExternal` via `preload` e `shell.openExternal`;
  - validacao dedicada da URL do stream antes do salvamento;
  - padronizacao das mensagens de retorno para sucesso, timeout e erro.
- Resultado final: o fluxo de descoberta, conferencia e entrada manual ficou mais robusto e mais explicavel para testes manuais.

## Validacoes executadas neste ciclo de busca assistida
- `npm run build`

## Pendencias para teste manual deste ciclo
- validar abertura do modal de busca e carregamento inicial dos filtros
- validar busca por nome simples, como uma radio conhecida
- validar filtro por pais, idioma e tag em combinacoes diferentes
- validar preenchimento automatico do editor ao escolher uma radio do catalogo
- validar abertura do site da radio no navegador externo
- validar botao `Testar stream` com um link valido e com um link invalido

## Revisao 16 - Robustez do fluxo de busca
- Problema: os filtros de pais vinham vazios, a busca podia aparentar travamento e a interface nao explicava claramente os estados de carregamento e erro.
- Risco: o usuario concluir que os dropdowns estavam quebrados e que o botao de busca nao funcionava, mesmo quando o backend ainda estava tentando responder.
- Correcao aplicada:
  - correcao do mapeamento de `countrycodes` do Radio Browser;
  - adicao de timeout nas chamadas HTTP do catalogo;
  - criacao de estados visuais separados para carregando filtros, buscando, sem resultados e erro;
  - protecao contra repeticao ruim do carregamento dos filtros quando uma tentativa falha.
- Resultado final: a busca ficou mais previsivel, com melhor feedback visual e sem a sensacao de travamento silencioso.

## Validacoes executadas nesta correcao da busca
- execucao direta do servico do catalogo com cenarios reais:
  - `rock` no Brasil
  - `news` nos Estados Unidos
  - `pop` na Alemanha
- `npm run build`

## Revisao 17 - Fluxo automatico de persistencia e sync
- Problema: adicionar, editar ou excluir radios ainda exigia etapas manuais extras, o que fazia o usuario acreditar que terminou quando o ETS2 ainda nao tinha sido atualizado.
- Risco: radio salva no app, mas ausente no jogo por falta de sincronizacao manual posterior.
- Correcao aplicada:
  - sincronizacao automatica do `live_streams.sii` logo apos adicionar, editar ou excluir uma radio;
  - retorno de aviso claro quando a lista do app muda, mas o sync automatico falha;
  - atualizacao das mensagens do app para refletir esse novo comportamento.
- Resultado da revisao seguinte: o fluxo passou a combinar melhor com a expectativa do usuario iniciante, reduzindo esquecimentos operacionais.

## Revisao 18 - Exclusao segura e menos redundancia
- Problema: a exclusao por checkbox abria margem para erro e o app tinha controles redundantes para o relay.
- Risco: excluir a radio errada e gerar confusao por ter dois pontos de controle para ligar ou desligar a mesma coisa.
- Correcao aplicada:
  - troca da exclusao em lote por exclusao da radio selecionada com popup central de confirmacao;
  - remocao do acesso redundante de runtime pela navegacao principal;
  - manutencao do card ET2 como unico controle visivel para ligar e desligar os relays.
- Resultado da revisao seguinte: a interface ficou mais direta e alinhada ao fluxo real do produto.

## Revisao 19 - Ajuste visual do controle ET2
- Problema: o card ET2 ainda usava um marcador circular simples, que comunicava pouco a acao de energia do sistema.
- Risco: o usuario nao perceber imediatamente que o card lateral era o controle principal de ligar e desligar.
- Correcao aplicada:
  - substituicao do marcador por um icone de energia no proprio card ET2;
  - ajuste dos estilos `on/off` para reforcar visualmente o estado atual dos relays.
- Resultado final: o ponto principal de controle ficou mais intuitivo e mais consistente com a funcao que exerce.

## Validacoes executadas neste ciclo de fluxo automatico
- `npm run build`

## Revisao 20 - Editor lateral contextual
- Problema: o editor lateral ficava sempre exposto, o que enfraquecia o sentido do botao `Nova radio manual` e deixava a tela mais pesada visualmente.
- Risco: o usuario nao entender quando o painel realmente entrou em uso e sentir que a lista e o editor competiam o tempo todo por atencao.
- Correcao aplicada:
  - transformacao do editor em painel contextual;
  - exibicao do editor apenas quando existe selecao ativa ou criacao manual em andamento;
  - criacao de estado ocioso com placeholder e animacao suave de entrada.
- Resultado final: o fluxo visual ficou mais claro e o painel lateral passou a aparecer com mais intencao durante a interacao.

## Validacoes executadas neste ciclo do editor contextual
- `npm run build:renderer`

## Revisao 21 - Painel lateral colapsavel real
- Problema: mesmo contextual, o editor ainda reservava espaco e dependia de um botao extra no rodape para ser fechado.
- Risco: a interface parecer inchada, com a tabela perdendo area util sem necessidade e com acoes demais concentradas no final do painel.
- Correcao aplicada:
  - transformacao do editor em coluna colapsavel real;
  - recolhimento completo da largura da coluna quando o painel esta fechado;
  - animacao de entrada e saida com `fade` e `slide`;
  - substituicao do fechamento por um `X` discreto no cabecalho.
- Resultado final: a tabela recupera o espaco quando o editor nao esta em uso e a interacao fica mais proxima de um drawer profissional de desktop.

## Validacoes executadas neste refinamento do painel colapsavel
- `npm run build:renderer`

## Revisao 22 - Diagnostico automatico de ambiente e telemetria leve
- Problema: o app dependia de caminhos padrao para ETS2 e `ffmpeg`, sem mostrar um diagnostico claro para o usuario, e ainda nao havia visibilidade do uso de memoria e do estado tecnico dos relays.
- Risco: erros de ambiente so aparecerem tarde demais e dificuldade para investigar travamentos, lentidao ou configuracoes incompletas.
- Correcao aplicada:
  - criacao de deteccao automatica de caminhos comuns para ETS2 e `ffmpeg`;
  - persistencia automatica dos caminhos encontrados quando a instalacao comum e localizada;
  - exposicao do diagnostico de ambiente no bootstrap e na tela de configuracoes;
  - adicao de telemetria leve com memoria do processo principal, processos `ffmpeg`, relays ativos, relays com erro e ultimo tempo de start.
- Resultado da revisao seguinte: o app passou a explicar melhor o proprio estado tecnico e a configuracao do ambiente antes do usuario entrar em fluxos mais sensiveis.

## Revisao 23 - Suavizacao do pico ao iniciar relays
- Problema: o `RelayService` iniciava todos os processos do `ffmpeg` praticamente ao mesmo tempo, gerando um pico forte de CPU, memoria, rede e escrita de logs.
- Risco: travamentos perceptiveis no computador, sensacao de congelamento e dificuldade para entender se o app estava funcionando ou nao.
- Correcao aplicada:
  - substituicao do start em massa por inicializacao em lotes;
  - inclusao de metrica de startup em andamento e duracao da ultima inicializacao;
  - bloqueio temporario do botao principal durante a acao de ligar ou desligar relays para evitar disparos duplicados.
- Resultado da revisao seguinte: a inicializacao ficou mais controlada e a interface ganhou dados para explicar o que esta acontecendo durante o start.

## Revisao 24 - Integracao visual do diagnostico tecnico
- Problema: mesmo com backend mais inteligente, a interface ainda nao refletia o novo estado do ambiente e do custo de execucao do app.
- Risco: o usuario continuar operando no escuro, sem saber se o app encontrou o ETS2, se o `ffmpeg` esta disponivel ou se os relays ainda estao iniciando.
- Correcao aplicada:
  - adicao de card lateral de status do ambiente;
  - adicao de card lateral de telemetria logo abaixo da navegacao;
  - criacao de blocos de diagnostico dentro de `Settings`;
  - inclusao de microcopy especifica para estados de verificacao, atencao, telemetria ociosa e start em andamento.
- Resultado final: o app ficou mais explicativo, com melhor transparência tecnica e base mais forte para os proximos testes manuais de performance e estabilidade.

## Validacoes executadas neste ciclo de diagnostico e performance
- `npm run build`
- `node --check electron/main.cjs`
- `node --check electron/relay-service.cjs`
- `node --check electron/preload.cjs`

## Revisao 25 - Correcao do falso negativo de ambiente e telemetria
- Problema: a interface passou a mostrar ETS2 e `ffmpeg` como ausentes mesmo quando os caminhos reais existiam no sistema, e a telemetria ficava vazia.
- Risco: o usuario perder confianca no diagnostico do app e tomar decisoes erradas com base em um estado visual incorreto.
- Correcao aplicada:
  - recarregamento do diagnostico de ambiente no bootstrap e tambem nas consultas periodicas de runtime;
  - propagacao de `environment` e `telemetry` nas respostas importantes do Electron;
  - estados visuais de `verificando` no lugar de cair direto em `not found` quando os dados ainda nao chegaram ao renderer.
- Resultado da revisao seguinte: a UI ficou mais honesta sobre quando esta conferindo o ambiente e quando realmente encontrou um problema.

## Revisao 26 - Relay on demand
- Problema: mesmo em lotes, iniciar um `ffmpeg` por radio ainda causava ondas de lentidao, porque o custo de centenas de processos continuava existindo.
- Risco: reduzir apenas o pico inicial, mas continuar degradando a experiencia do computador sempre que novos lotes fossem disparados.
- Correcao aplicada:
  - substituicao do modelo antigo por listeners HTTP locais leves, um por porta;
  - criacao do processo `ffmpeg` apenas quando o jogo realmente requisita aquela radio;
  - encerramento automatico da sessao quando o jogo para de consumir o stream;
  - separacao conceitual entre `relay preparado` e `stream realmente ativo`.
- Resultado da revisao seguinte: a carga de CPU e memoria passou a depender muito mais do uso real da radio no jogo do que do tamanho total da lista cadastrada.

## Revisao 27 - Novos estados e resumo operacional
- Problema: com relay on demand, os textos antigos da interface continuavam implicando que todos os relays estavam ativos ao mesmo tempo.
- Risco: a interface ensinar o comportamento errado do sistema, mesmo com a arquitetura nova funcionando corretamente.
- Correcao aplicada:
  - inclusao de novos estados como `aguardando o jogo`;
  - criacao de resumo operacional para relays preparados versus streams ativos;
  - ampliacao da telemetria para mostrar listeners preparados alem de processos `ffmpeg` ativos.
- Resultado final: a linguagem da UI ficou alinhada com o novo fluxo tecnico e mais didatica para testes manuais.

## Validacoes executadas neste ciclo on demand
- `npm run build`
- `node --check electron/main.cjs`
- `node --check electron/relay-service.cjs`
- `node --check electron/preload.cjs`

## Revisao 28 - Diagnostico consolidado em Settings
- Problema: o card lateral de ambiente passou a competir com o bloco ET2 e com a telemetria, quebrando a hierarquia visual da sidebar.
- Risco: a barra lateral ficar carregada demais e o usuario perder o foco do que e operacional versus o que e configuracao.
- Correcao aplicada:
  - remocao do card de ambiente da sidebar;
  - consolidacao do resumo de status e dos detalhes de diagnostico dentro da tela de `Settings`;
  - manutencao da telemetria leve como unico bloco tecnico persistente na lateral.
- Resultado da revisao seguinte: a sidebar ficou mais limpa e o diagnostico passou a aparecer no lugar mais contextual da interface.

## Revisao 29 - ffmpeg embarcado no instalador
- Problema: o `ffmpeg` continuava sendo uma dependencia externa sensivel, apesar de ser obrigatorio para o funcionamento do produto.
- Risco: usuario instalar o app, mas falhar no primeiro uso por nao ter o executavel no caminho esperado.
- Correcao aplicada:
  - criacao da pasta `vendor/ffmpeg` no projeto;
  - copia do `ffmpeg.exe` existente para dentro dessa pasta;
  - configuracao de `extraResources` no `electron-builder` para embarcar o binario no app empacotado;
  - ajuste da deteccao de ambiente para priorizar o `ffmpeg` interno do proprio app antes dos caminhos manuais e da auto deteccao externa.
- Resultado final: o build portatil passou a sair com o `ffmpeg` incluido dentro de `resources/vendor/ffmpeg/ffmpeg.exe`, reduzindo bastante a chance de erro de instalacao.

## Validacoes executadas neste ciclo de empacotamento
- `npm run build`
- verificacao direta de `dist-electron/win-unpacked/resources/vendor/ffmpeg/ffmpeg.exe`

## Revisao 30 - Tray e tema acessivel
- Problema: o aplicativo ainda se comportava como janela comum no Windows e nao permitia personalizacao basica de cores e contraste.
- Risco: o usuario precisava manter a janela ocupando espaco enquanto jogava, e pessoas com preferencia visual diferente ficavam presas ao tema padrao.
- Correcao aplicada:
  - criacao de bandeja do sistema no processo principal do Electron;
  - regra de minimizar para a bandeja, com clique no icone para reabrir;
  - manutencao do `X` como fechamento real do app;
  - persistencia de um tema configuravel no `settings.json`;
  - aplicacao das cores dinamicamente via variaveis CSS na interface.
- Resultado final: o app ficou mais natural para uso junto com o jogo e ganhou uma base de acessibilidade/aparencia sem precisar duplicar estilos em varios componentes.

## Validacoes executadas neste ciclo de tray e tema
- `npm run build`
- `node --check electron/main.cjs`
- `node --check electron/storage.cjs`

## Revisao 31 - Persistencia do onboarding e propostas de icone
- Problema: o popup de boas-vindas reaparecia em toda abertura porque o estado era mantido apenas na memoria do React, sem persistencia nas configuracoes.
- Risco: experiencia repetitiva e cansativa, alem de passar a sensacao de que o app nao lembra preferencias basicas do usuario.
- Correcao aplicada:
  - inclusao da flag `hasCompletedWelcome` no `settings.json`;
  - leitura dessa flag no bootstrap da interface para abrir o onboarding so na primeira vez;
  - salvamento da confirmacao ao clicar em continuar.
- Resultado final: o popup de boas-vindas agora respeita o historico do usuario e nao volta a abrir em toda inicializacao.

## Revisao 32 - Conjunto inicial de icones
- Problema: o app ainda nao tinha identidade visual propria para bandeja, executavel e empacotamento.
- Risco: uso do icone padrao do Electron e perda de reconhecimento visual do produto.
- Correcao aplicada:
  - geracao de cinco propostas de icone em `.png` transparente;
  - criacao de uma prancha de comparacao para facilitar a escolha visual.
- Resultado final: o projeto passou a ter um conjunto inicial de direcoes visuais pronto para selecao e posterior integracao no build.

## Validacoes executadas neste ciclo de onboarding e icones
- `npm run build:renderer`
- `node --check electron/storage.cjs`
- `node --check electron/main.cjs`

## Revisao 33 - Integracao do icone oficial
- Problema: o projeto ainda usava o icone padrao do Electron no build e um icone gerado por codigo na bandeja, mesmo ja tendo um logo final aprovado.
- Risco: identidade visual inconsistente entre tray, janela e executavel, alem de reduzir a sensacao de produto finalizado.
- Correcao aplicada:
  - integracao do arquivo `assets/icons/ETS2-Radio-Relay-Logo.png` no tray e na janela principal;
  - geracao de uma versao `.ico` valida do mesmo logo para o empacotamento do Windows;
  - configuracao do `electron-builder` para usar esse `.ico` no build.
- Resultado final: o build voltou a passar e o app agora tem um icone oficial consistente para bandeja e executavel.

## Validacoes executadas neste ciclo de integracao do icone
- `npm run build`
- `node --check electron/main.cjs`

## Revisao 34 - Cor separada para grades e bordas
- Problema: a personalizacao visual ainda nao permitia controlar diretamente a cor das linhas estruturais da interface, como bordas de cards, grades e divisorias.
- Risco: o usuario conseguia trocar a cor de destaque, mas continuava preso a uma malha visual derivada automaticamente, o que limitava acessibilidade e ajuste fino do tema.
- Correcao aplicada:
  - inclusao da propriedade `gridColor` no tema salvo em configuracoes;
  - novo controle em `Settings` para grades e bordas;
  - separacao das variaveis `--line` e `--line-strong` para passarem a usar essa nova cor.
- Resultado final: a estrutura visual da interface agora pode ser ajustada independentemente da cor de destaque principal.

## Validacoes executadas neste ciclo de grades e bordas
- `npm run build:renderer`
- `node --check electron/storage.cjs`

## Revisao 35 - Telemetria opcional e suporte na barra lateral
- Problema: a telemetria ficava sempre visivel, ocupando espaco fixo na lateral, e o projeto ainda nao tinha um ponto dedicado para apoio/doacao.
- Risco: excesso de informacao tecnica para usuarios que querem apenas usar o app, alem de falta de um espaco de suporte ao projeto na interface.
- Correcao aplicada:
  - inclusao da preferencia persistida `showTelemetry`;
  - criacao de um toggle ON/OFF para a telemetria;
  - exibicao colapsada do card tecnico quando a telemetria estiver desligada;
  - inclusao de um card lateral de apoio com botao de doacao via PayPal.
- Resultado final: a barra lateral ficou mais flexivel, permitindo esconder a telemetria sem perder o controle, e ganhou uma area clara de apoio ao projeto.

## Revisao 36 - Tema com mais controle real
- Problema: a acessibilidade ainda permitia ajustar poucas cores, o que limitava a diferenca entre identidade visual, preenchimento de paineis e legibilidade do texto.
- Risco: usuarios poderiam montar temas com destaque bonito, mas ainda sem controle suficiente sobre leitura e contraste estrutural.
- Correcao aplicada:
  - inclusao das cores `surfaceColor`, `textColor` e `mutedTextColor`;
  - criacao de presets de tema para agilizar a personalizacao;
  - uso dessas novas cores na geracao das variaveis CSS principais.
- Resultado final: a personalizacao ficou mais madura, com melhor separacao entre fundo, paineis, bordas, destaque e textos.

## Revisao 37 - Distribuicao e documentacao inicial
- Problema: o projeto ainda tinha um README muito curto e o build do Windows estava focado apenas no formato portatil.
- Risco: pouca clareza para novos usuarios no GitHub e preparacao incompleta para distribuicao em formatos diferentes.
- Correcao aplicada:
  - reescrita do `README.md` em ingles e portugues;
  - ajuste do `electron-builder` para gerar build portatil e instalador NSIS.
- Resultado final: o projeto ficou mais apresentavel para publicacao e mais pronto para testes externos e distribuicao.

## Revisao 38 - Temas aplicados de ponta a ponta
- Problema: a tela principal ainda usava varias cores fixas, o que fazia os presets parecerem incompletos e passava a sensacao de que o tema nao estava sendo aplicado de verdade.
- Risco: o usuario mudar cores em `Settings`, mas continuar vendo toolbar, tabela e selecao de linhas presas a uma paleta antiga.
- Correcao aplicada:
  - troca dos hardcodes principais por variaveis de tema na toolbar, tabela, chips, busca e paginação;
  - criacao de novas variaveis derivadas para chips e estados de linha;
  - inclusao de novos presets prontos para acelerar testes visuais.
- Resultado final: os temas agora afetam de forma muito mais consistente a pagina principal e a personalizacao ficou mais crivel.

## Revisao 39 - Link final de apoio e preparacao do repositório
- Problema: o botao de apoio ainda usava um link generico do PayPal e o repositório nao tinha automacao de CI/release no GitHub.
- Risco: o apoio ao projeto levar o usuario para uma pagina errada e a distribuicao continuar dependente demais de passos manuais na maquina local.
- Correcao aplicada:
  - troca do link generico pelo link real de doacao;
  - criacao das workflows `CI` e `Release` em `.github/workflows`;
  - adicao de checklist de release em `docs/release-checklist.md`;
  - atualizacao do README com o fluxo de publicacao.
- Resultado final: o repositório passou a ter um caminho claro para validar o projeto automaticamente e publicar builds de distribuicao com mais previsibilidade.

## Revisao 40 - Tres passadas finais antes do push
- Revisao 1 - boas praticas:
  - conferi se a pipeline ficou separada por responsabilidade: uma workflow para validar e outra para publicar.
  - resultado: a separacao ficou clara e mais facil de manter do que uma workflow unica.
- Revisao 2 - busca por bugs:
  - conferi se a workflow de release tentaria publicar release sem tag.
  - resultado: a publicacao ficou protegida por `startsWith(github.ref, 'refs/tags/')`, e disparos manuais passam a gerar artefato sem release publica automatica.
- Revisao 3 - corner cases e polish:
  - conferi se a documentacao do fluxo de release explicava os passos principais de versao, tag e checklist.
  - resultado: o README e a checklist ficaram suficientes para orientar uma publicacao inicial sem depender de memoria ou passos informais.

## Revisao 41 - Renderer preparado para ambiente empacotado
- Problema: o renderer estava sendo gerado com caminhos absolutos como `/assets/...`, o que funciona em servidor web, mas quebra no Electron instalado em `file://`.
- Risco: o app abrir com janela vazia ou sem CSS/JS, mesmo com o build aparentemente "passando" na pipeline.
- Correcao aplicada:
  - configuracao do `Vite` com `base: "./"` para gerar caminhos relativos;
  - remocao da dependencia de Google Fonts no `index.html` para evitar recurso remoto no app desktop;
  - troca da fonte principal por uma stack local segura para Windows e ambientes offline;
  - criacao do script `scripts/verify-release-build.cjs` para validar o `dist/index.html` antes do empacotamento;
  - integracao dessa validacao no `npm run build`, na `CI` e na workflow de `Release`.
- Resultado final: a release agora trata o renderer como artefato de desktop e nao mais como build apenas de desenvolvimento web.

## Validacoes executadas neste ciclo de hardening de release
- `npm run build:renderer`
- `npm run build`

## Revisao 42 - Exclusao em lote restaurada e release 0.2.0 preparada
- Revisao 1 - boas praticas:
  - conferi se a tela separa corretamente a radio ativa para edicao da lista de radios marcadas para exclusao.
  - resultado: `selectedIndex` ficou responsavel pela edicao e `checkedStationKeys` pela exclusao em lote, reduzindo acoplamento entre fluxos diferentes.
- Revisao 2 - busca por bugs:
  - conferi se a restauracao dos checkboxes poderia quebrar o fluxo de busca de catalogo ou gerar conflitos de tipo no frontend.
  - resultado: o tratamento do erro da busca foi separado do payload generico do app e o `TypeScript` voltou a ficar limpo.
- Revisao 3 - corner cases e polish:
  - conferi se as radios marcadas permanecem coerentes depois de salvar, excluir ou atualizar a lista.
  - resultado: a lista marcada agora e filtrada automaticamente quando a colecao de radios muda, evitando referencias antigas na interface.

## Correcao aplicada neste ciclo
- restauracao da selecao multipla por checkbox na tabela de radios;
- confirmacao de exclusao em lote reutilizando o backend existente de `deleteStations`;
- ajuste do texto de contagem para refletir radios marcadas, nao apenas uma radio ativa;
- troca de `replaceAll` por `split().join()` nas traducoes para manter compatibilidade com o alvo atual do TypeScript;
- preparacao da versao `0.2.0` no `package.json` e no `package-lock.json`;
- ativacao de `signAndEditExecutable` para permitir que o executavel do Windows receba o icone oficial.

## Validacoes executadas neste ciclo da 0.2.0
- `npx tsc --noEmit`
- `npm run build:renderer`

## Limitacao encontrada na maquina local
- o empacotamento completo com `electron-builder` continua bloqueado localmente por permissao do Windows ao extrair arquivos com link simbolico durante a etapa `winCodeSign`.
- impacto: a confirmacao final do icone no atalho nao conseguiu ser fechada localmente, mas a configuracao da release ficou preparada para a pipeline baseada em tag no GitHub.
