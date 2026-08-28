# Rede Fantasma

Minigame da Nova Aurora em estilo cyberpunk no qual o jogador restaura o Wi‑Fi estendendo um pulso diretamente do ponto A ao ponto B através de três labirintos de dificuldade crescente: normal, difícil e crítico. A trilha nasce ancorada na origem, cresce a cada movimento e nunca perde a cauda. Tudo funciona no navegador sem requisições externas durante a partida.

## Jogar localmente

Requer Node.js 22.13 ou mais recente.

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

Para conferir a versão de produção:

```bash
npm test
```

## Como jogar

- Estenda a rota com as setas ou `WASD`.
- Alcance diretamente o ponto **B** sem sair da placa, tocar na própria rota ou atingir os módulos de circuito.
- A trilha permanece presa à **ORIGEM** e somente cresce.
- Não existem checkpoints, relés nem paradas intermediárias.
- A geração aumenta a folga nas bordas dos corredores e evita usar um pequeno quadrado isolado como o primeiro módulo solto da placa.
- A extensão real da rota cresce com a dificuldade: a geração busca aproximadamente 30 células no primeiro circuito, 58 no segundo e 78 no terceiro, mantendo a mesma velocidade de movimento.
- Os painéis PCB usam textura renderizada em resolução dupla, trilhas presas a uma grade de meio pixel e vias alinhadas para evitar linhas tortas ou curvas acidentais.
- A missão começa com sete barras de conexão. Cada colisão consome uma barra, toca o efeito de erro e reinicia a mesma placa após 3 segundos. O primeiro labirinto recuperou a tela “Sincronizando placa” de 2 segundos; as transições seguintes preservam a preparação visual de 1,5 segundo.
- Entre labirintos, a transição dura 2,5 segundos: o tabuleiro concluído permanece desfocado por 1 segundo com o retângulo de progresso e, em seguida, o próximo tabuleiro aparece desfocado por 1,5 segundo antes de liberar os controles. O aviso final de **3/3 labirintos concluídos** permanece por 4 segundos; depois, a tela completa da última fase — cabeçalho, mapa concluído, placa, controles e barras de conexão — permanece exatamente no lugar enquanto as janelas de malware surgem repentinamente por cima e deixam uma cascata de cópias pretas e verde-limão repetindo “Restauração completa”. A imagem congela e cede lugar a um terminal Linux preto no qual cada barra de carregamento progride de 0% a 100% antes de novos comandos aparecerem.
- Durante o minigame, as sete vidas aparecem como colunas retangulares estreitas sobre uma linha de base. A altura cresce de 5 px a 34 px da esquerda para a direita, enquanto as barras ativas percorrem um gradiente do verde-limão `#00ff1e` ao branco. Um globo de rede branco ocupa o espaço restante do painel e completa a leitura visual da conexão.
- No painel Linux final, a antiga lista de status foi substituída por dois fragmentos criptografados interativos, compactos e quase quadrados. Cada caixa aceita apenas um clique, percorre letras aleatórias e então trava definitivamente em **N** ou **O**; depois, as duas piscam em fases opostas, alternando entre fundo preto com letra verde-limão e fundo verde-limão com letra preta.
- A tela do minigame fica travada à altura visível do navegador: cabeçalho, placa completa e painel inferior são dimensionados juntos para dispensar rolagem vertical.
- O topo do minigame identifica o progresso apenas pelos marcadores **1**, **2** e **3**; as telas de sincronização e reinicialização usam tipografia monoespaçada de sistema com pulsos e falhas digitais próprias.
- Pressione `Espaço` para pausar, `R` para repetir a mesma placa e `M` para ligar/desligar o som.
- No celular, use o direcional exibido abaixo do mapa.

### Labirintos

- **Normal — Rota de acesso:** campo lógico 11 × 7, malha visual 21 × 13, velocidade constante de 140 px/s, até 20 conjuntos PCB robustos e uma grande rotatória quase quadrada.
- **Difícil — Núcleo blindado:** campo lógico 13 × 8, malha visual 25 × 15, a mesma velocidade constante de 140 px/s, até 31 conjuntos PCB, vários tetrominós de espessura dupla e duas grandes rotatórias quase quadradas.
- **Crítico — Matriz extrema:** campo lógico 15 × 9, malha visual 29 × 17, a mesma velocidade constante de 140 px/s, até 40 conjuntos PCB, quatro CPUs e três grandes rotatórias quase quadradas.

Cada mapa sorteia a origem e o destino em posições distantes de duas bordas diferentes. A saída sempre aponta para dentro da placa e a rota A→B é validada antes do mapa ser aceito, mantendo o percurso livre de bloqueios. Ao redor da origem existe uma baia reservada de cinco células de largura por cinco de profundidade, e rotatórias CPU também são impedidas de nascer nessa área. A saída A permanece amplamente livre antes da primeira curva; o defletor físico é colocado no primeiro espaço seguro encontrado a partir de duas células depois da baia protegida. A trilha percorre toda a fase a 140 px/s, sem aceleração de lançamento nem mudança entre níveis. Nenhum trecho contínuo da solução pode ultrapassar duas seções da grade. Depois que a área principal é aberta, o gerador acrescenta de uma a quatro ramificações laterais curtas que terminam sem reencontrar outro corredor, formando becos sem saída reais sem comprometer a rota validada. Cada ciclo ocupa uma região lógica de 3 × 3 células e forma uma grande volta quase quadrada ao redor de um chip CPU central. A rota é convertida para uma malha visual com células intermediárias e o espaço ao redor dela é ampliado proceduralmente. O resultado preserva campo aberto suficiente para reagir, mas oferece mais decisões, desvios e caminhos falsos.

Quatro painéis formam uma moldura fechada ao redor da placa. Dentro dela, cada obstáculo permanece como uma peça reconhecível: tetrominós I, O, T, L, J, S e Z; pentominó P; barramentos longos; painéis 3 × 2; cotovelos; derivações; blocos entalhados; e núcleos 3 × 3. Não existem peças de uma, duas ou três células. Alguns tetrominós são ampliados em 2 × 2 por célula, e o catálogo também inclui painéis PCB compactos e grossos. Pequenos chanfros de 45° aparecem somente em cantos externos selecionados. Toda cadeia de peças que compartilha uma borda é consolidada em um único corpo PCB: margens, chanfros e linhas internas desaparecem em todos os contatos, mesmo em conjuntos grandes. Somente peças realmente separadas preservam o vão escuro entre si. Os oito padrões PCB — trilho, cotovelo, chip, barramento, derivação, escada, canal e ilha — acrescentam linhas paralelas, pads circulares, resistores e componentes internos. Junções luminosas agora cruzam cada contato real entre peças do mesmo conjunto, enquanto a textura de fundo usa mais trilhas, componentes, pads e pequenos ramais terminados para reforçar a aparência de uma placa conectada.

A trilha luminosa usa corpo de 4 px e cabeça de 5 px na escala lógica do canvas. A colisão acompanha esse perfil fino, enquanto os módulos preservam uma margem de segurança ao redor da rota solucionável. A trilha nasce exatamente na borda do servidor de origem, na direção indicada pela seta interna. A fase termina no primeiro contato entre a borda da cabeça e a caixa do servidor objetivo; o último segmento é recortado matematicamente nesse contato e nunca atravessa o interior do destino.

O cursor é ocultado durante a inicialização animada e enquanto um labirinto está ativo. Ele reaparece automaticamente no menu, nas transições entre fases, na tela de falha e na conclusão da missão.

As três placas são geradas juntas no início de cada missão. Repetir uma fase reaproveita exatamente a mesma placa; abortar ou concluir a missão e iniciar novamente descarta o conjunto anterior e gera três novas placas.

O gerador foi calibrado por amostragem de quadros: a referência e lotes de mapas aleatórios foram normalizados para a mesma resolução e comparados por cor, tamanho dos componentes e distribuição das silhuetas. O perfil de cor resultante fica codificado em `REFERENCE_FRAME_PROFILE`, enquanto a ocupação foi ajustada para preencher o campo com peças robustas sem bloquear a rota. A textura de placa-mãe é pré-renderizada a 1,5× da escala lógica e combina planos de máscara de solda, malha fina, 84 feixes de trilhas paralelas, 210 vias metalizadas, 44 pegadas de componentes com pinos, códigos serigrafados e granulação controlada. As superfícies dos obstáculos agora são minimalistas: não possuem linhas de varredura, módulos comuns recebem somente uma trilha, barramentos largos recebem no máximo duas, as vias são bem espaçadas e os grandes agrupamentos mantêm no máximo dez conexões internas. Todos esses detalhes, inclusive pinos e inscrições dos CPUs, usam `#579b75`, um verde claro derivado da parede `#23533d`, sem realces brancos. As rotatórias lógicas continuam criando alternativas de percurso ao redor dos CPUs quadrados, mas não recebem contorno escuro nem faixa tracejada semelhante a uma estrada. A imagem de referência não é carregada, copiada nem incluída no jogo. O fundo, as trilhas e todos os obstáculos continuam sendo desenhados proceduralmente no canvas e funcionam totalmente offline.

Os pontos de origem e objetivo são classificados em quatro regiões invisíveis — superior esquerda, superior direita, inferior esquerda e inferior direita. Depois que a origem ocupa uma região, o objetivo é obrigatoriamente escolhido entre as outras três e continua usando uma borda diferente. Nenhuma cor ou divisão visual dessas regiões aparece durante a partida. O marcador de origem possui um halo adicional mais intenso para ser identificado imediatamente.

Antes da inicialização existe um portal escuro de ativação: o sistema permanece parado até o operador clicar em **“clique aqui para iniciar”**. Só então uma central segura quase em tela cheia, com moldura de circuito, identidade RF ampliada, indicadores AES-256, telemetria do uplink e confirmação destacada de acesso, simula BIOS, montagem do núcleo local, detecção do Wi-Fi, falha do gateway, carregamento dos labirintos e autenticação. A abertura pode ser pulada e respeita a preferência do sistema por movimento reduzido.

O movimento usa `requestAnimationFrame`, acompanha a taxa de atualização da tela e suporta animação a 120 Hz em monitores compatíveis. A colisão é subdividida em amostras de até 1,5 px para evitar atravessar paredes mesmo quando a taxa de quadros varia.

Depois do terceiro labirinto, o cartão **3/3 labirintos concluídos** pisca sem exibir barra de progresso. Em seguida, uma grande janela de malware entra rapidamente pela lateral e ricocheteia nas quatro bordas como o logotipo de um DVD. Seu movimento usa o relógio de animação da tela e velocidades constantes de 120% da largura e 92% da altura por segundo. A janela líder deixa uma trilha densa de cópias perfeitamente alinhadas a cada 52 ms, alternando entre preto e verde-limão `#00ff1e`; cada cópia permanece estática para evitar pausas, recuperação de tempo perdido ou despejo de backlog. Os pop-ups usam moldura chanfrada rígida, barra de título `RESTORE_NET.EXE`, controles clássicos de janela e tipografia ampliada. Após o congelamento existe um apagão preto de 1,2 segundo; só então o terminal Linux aparece. No terminal, o progresso usa números naturais de `0%` a `100%`, sem zeros à esquerda. As linhas novas nascem na borda inferior, empurram o histórico para cima e o buffer ampliado permite que o fluxo alcance também a borda superior, como em um terminal real. As barras de carregamento surgem em intervalos maiores e aleatórios, sempre depois de várias linhas comuns, com operações variáveis da `NOVA_AURORA_NET`, endereços, setores, gateways, nós e identificadores gerados dinamicamente. O painel de conclusão ocupa uma coluna preta ampliada e fica centralizado nos dois eixos, funcionando como um console de acesso seguro com handshake online, selo de autenticação, progresso das três rotas, telemetria final, checksum e varredura luminosa. Na parte inferior, um globo terrestre 3D em wireframe é projetado proceduralmente no canvas em vista superior, com o polo norte visível na camada frontal e uma rotação lenta. A circunferência luminosa independente foi removida para que o limite visual seja formado pela própria malha e não pareça uma esfera solta dentro de outra. Para evitar travamentos, a malha é agrupada em quatro camadas de profundidade, limitada a 30 quadros por segundo e renderizada a no máximo 1,5× a densidade da tela; a preferência por movimento reduzido o mantém estático. O indicador de sete conexões funciona como um único instrumento de segurança: moldura chanfrada, malha discreta, beacon de status, trilho segmentado, barras com brilho escalonado e nó do globo enquadrado. O PNG fornecido continua preservado byte por byte, ampliado a 124% e separado dez pixels da última barra.

## Áudio local

Os cinco efeitos em `public/audio` são arquivos MP3 locais. As faixas originais são efeitos gratuitos do Mixkit, usados sob a Mixkit Sound Effects Free License. A lista detalhada está em [`public/audio/SOURCES.md`](public/audio/SOURCES.md).

## Estrutura principal

- `app/page.tsx`: lógica, estados, desenho do mapa e controles do jogo.
- `app/globals.css`: interface responsiva e direção visual.
- `public/audio`: ambiente e efeitos MP3.
- `public/og.png`: capa local do projeto.
- `tests/rendered-html.test.mjs`: validações da introdução, das fases, dos obstáculos, da rota A–B completa e dos áudios.
