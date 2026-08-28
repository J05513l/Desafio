import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile, stat } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("renderiza o portal de ativação antes da introdução da Rede Fantasma", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html[^>]+lang="pt-BR"/i);
  assert.match(html, /<title>Rede Fantasma — Restaure o Wi-Fi<\/title>/i);
  assert.match(html, /INICIAR PROTOCOLO DE RESTAURAÇÃO DE REDE/);
  assert.match(html, /clique aqui para iniciar/);
  assert.doesNotMatch(html, /Restaure a<br/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
});

test("mantém dificuldade crescente, sete conexões, movimento contínuo e arquivos locais", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(page, /type Screen = "protocol" \| "intro"/);
  assert.match(page, /useState<Screen>\("protocol"\)/);
  assert.match(page, /INICIAR PROTOCOLO DE RESTAURAÇÃO DE REDE/);
  assert.match(page, /clique aqui para iniciar/);
  assert.match(page, /onClick=\{enterProtocol\}/);
  assert.match(page, /const returnToProtocol = useCallback/);
  assert.match(page, /setScreen\("protocol"\)/);
  assert.match(page, /onClick=\{returnToProtocol\}>\[ ESC \] SAIR/);
  assert.match(page, /event\.key === "Escape" && screen === "victory"[\s\S]*?returnToProtocol\(\)/);
  assert.doesNotMatch(page, /returnToIntro/);
  assert.match(css, /\.protocol-gate/);
  assert.match(css, /protocol-title-flicker/);
  assert.match(page, /INICIAR PROTOCOLO/);
  assert.match(page, /root@nova-aurora:~#/);
  assert.match(page, /ERR_0x7A/);
  assert.match(page, /RECOVERY_TARGET/);
  assert.doesNotMatch(page, /<span>REDE_<br \/>FANTASMA<\/span>/);
  assert.match(page, /\.\/INICIAR_PROTOCOLO/);
  assert.doesNotMatch(page, /Restaure a<br \/>/);
  assert.match(css, /\.intro-commandbar/);
  assert.match(css, /@keyframes mission-command-scan/);
  assert.match(page, /CANAL DE INICIALIZAÇÃO SEGURA/);
  assert.match(page, /AES-256/);
  assert.match(page, /IDENTIDADE DO OPERADOR CONFIRMADA/);
  assert.match(page, /className="boot-route"/);
  assert.match(page, /CHAVE EFÊMERA ATIVA/);
  assert.match(css, /@keyframes boot-packet-transfer/);
  assert.match(css, /width: min\(1180px, 96vw\)/);
  assert.match(css, /height: min\(86vh, 720px\)/);
  assert.match(css, /\.system-entry-topline/);
  assert.match(css, /\.system-entry-telemetry/);
  assert.match(css, /\.access-granted-status/);
  const templateIds = [
    "rail",
    "elbow",
    "chip",
    "bus",
    "tee",
    "stair",
    "channel",
    "island",
  ];

  for (const template of templateIds) {
    assert.match(page, new RegExp(`id: "${template}"`));
  }
  assert.match(page, /columns: 11/);
  assert.match(page, /rows: 7/);
  assert.match(page, /code: "CENÁRIO NORMAL"/);
  assert.match(page, /minimumSolutionCells: 28/);
  assert.match(page, /minimumLoopSolutionCells: 24/);
  assert.match(page, /targetSolutionCells: 30/);
  assert.match(page, /componentTarget: 20/);
  assert.match(page, /wallThickness: 26/);
  assert.match(page, /columns: 13/);
  assert.match(page, /rows: 8/);
  assert.match(page, /componentTarget: 38/);
  assert.match(page, /code: "CENÁRIO DIFÍCIL"/);
  assert.match(page, /minimumSolutionCells: 60/);
  assert.match(page, /minimumLoopSolutionCells: 54/);
  assert.match(page, /targetSolutionCells: 62/);
  assert.match(page, /wallThickness: 24/);
  assert.match(page, /columns: 16/);
  assert.match(page, /rows: 9/);
  assert.match(page, /componentTarget: 58/);
  assert.match(page, /code: "CENÁRIO CRÍTICO"/);
  assert.match(page, /minimumSolutionCells: 94/);
  assert.match(page, /minimumLoopSolutionCells: 84/);
  assert.match(page, /targetSolutionCells: 98/);
  assert.match(page, /wallThickness: 18/);
  assert.match(page, /const tracks = crossSize >= 44 \? 2 : 1/);
  assert.match(page, /context\.imageSmoothingEnabled = false/);
  assert.match(page, /aria-label="Fase 1"><b>1<\/b><\/span>/);
  assert.match(page, /aria-label="Fase 2"><b>2<\/b><\/span>/);
  assert.match(page, /aria-label="Fase 3"><b>3<\/b><\/span>/);
  assert.match(page, /<header className="game-topbar"><div className="phase-track"/);
  assert.doesNotMatch(page, /<header className="game-topbar"><div className="brand-mark"/);
  assert.doesNotMatch(page, /LABIRINTO ALEATÓRIO/);
  assert.doesNotMatch(page, /<b>0[1-3]<\/b> (?:NORMAL|DIFÍCIL|CRÍTICO)/);
  assert.match(page, /const SNAKE_SPEED = 140/);
  assert.doesNotMatch(page, /speed: \d+/);
  assert.match(page, /remainingDistance = SNAKE_SPEED \* Math\.min\(deltaSeconds, MAX_FRAME_DELTA\)/);
  assert.doesNotMatch(page, /VELOCIDADE <b>\+26%/);
  for (const shape of ["tetromino-i", "tetromino-o", "tetromino-t", "tetromino-l", "tetromino-j", "tetromino-s", "tetromino-z", "pentomino-p", "large-i", "large-o", "large-t", "large-l", "large-j", "large-s", "large-z", "pcb-bus-6", "pcb-panel-6", "pcb-elbow-7", "pcb-tee-7", "pcb-notch-8", "pcb-core-9"]) {
    assert.match(page, new RegExp(`id: "${shape}"`));
  }
  assert.doesNotMatch(page, /id: "(?:triomino-i|triomino-l|domino|single)"/, "o catálogo não deve conter peças menores que quatro células");
  assert.match(page, /function enlargeShape/);
  assert.match(page, /MEGA_TETRIS_SHAPES/);
  assert.match(page, /CHUNKY_PCB_SHAPES/);
  for (const shape of ["mega-pcb-panel", "mega-pcb-notch", "mega-pcb-corner"]) assert.match(page, new RegExp(`id: "${shape}"`));
  assert.match(page, /type MazeSet = Record<PhaseNumber, MazeLayout>/);
  assert.match(page, /function generateMazeSet/);
  assert.match(page, /const mazeSetRef = useRef<MazeSet \| null>\(null\)/);
  assert.match(page, /mazeSetRef\.current = generateMazeSet\(\)/);
  assert.match(page, /const maze = mazeSetRef\.current\[phase\]/);
  assert.match(page, /MAX_CONNECTIONS = 7/);
  assert.match(page, /Use <strong>WASD<\/strong> ou as <strong>setas no canto inferior direito do teclado<\/strong>/);
  assert.match(page, /<kbd>W<\/kbd><kbd>A<\/kbd><kbd>S<\/kbd><kbd>D<\/kbd>/);
  assert.match(page, /<kbd>↑<\/kbd><kbd>←<\/kbd><kbd>↓<\/kbd><kbd>→<\/kbd>/);
  assert.match(css, /\.key-cluster kbd:nth-child\(1\) \{[\s\S]*?grid-column: 2;[\s\S]*?grid-row: 1;/);
  assert.match(css, /\.key-cluster kbd:nth-child\(2\) \{[\s\S]*?grid-column: 1;[\s\S]*?grid-row: 2;/);
  assert.match(css, /\.key-cluster kbd:nth-child\(4\) \{[\s\S]*?grid-column: 3;[\s\S]*?grid-row: 2;/);
  assert.match(page, /Conduza o sinal de A até B sem tocar nas paredes PCB/);
  assert.doesNotMatch(page, /<small>ROTAS<\/small>|<small>CONEXÕES<\/small>|<small>RENDER<\/small>|<small>TOPOLOGIA<\/small>/);
  assert.match(css, /\.mission-controls/);
  assert.match(css, /\.boot-route > b::before \{[\s\S]*?right: 58px;/);
  assert.match(css, /@keyframes boot-packet-transfer \{[\s\S]*?left: calc\(100% - 76px\)/);
  assert.match(page, /CONNECTION BAR · 0\/\{MAX_CONNECTIONS\}/);
  assert.match(page, /FIRST_ENTRY_DELAY_MS = 2_000/);
  assert.match(page, /Sincronizando placa…/);
  assert.match(page, /RETRY_DELAY_MS = 3_000/);
  assert.match(page, /COMPLETED_MAZE_BLUR_MS = 1_000/);
  assert.match(page, /NEXT_MAZE_BLUR_MS = 1_500/);
  assert.match(page, /COMPLETION_DELAY_MS = 4_000/);
  assert.match(page, /SPAWN_CLEARANCE_LENGTH = 5/);
  assert.match(page, /SPAWN_CLEARANCE_HALF_WIDTH = 3/);
  assert.match(page, /const minimumDeflectorDistance = Math\.max\([\s\S]*?SPAWN_CLEARANCE_LENGTH \+ 2/);
  assert.match(page, /startPhase\(current\.phase, RETRY_DELAY_MS, "retry"\)/);
  assert.match(page, /startPhase\(1, FIRST_ENTRY_DELAY_MS, "entry"\)/);
  assert.match(page, /CONNECTION BAR/);
  assert.doesNotMatch(page, /GERAR NOVA PLACA/);
  assert.match(page, /path: \[DEFAULT_START\]/);
  assert.match(page, /current\.path = \[head, \.\.\.current\.path\]/);
  assert.doesNotMatch(page, /current\.path\.pop\(\)/);
  assert.match(page, /generateMazeLayout/);
  assert.match(page, /carveMaze/);
  assert.match(page, /countInitialStraightSteps/);
  assert.equal(page.match(/minimumInitialStraightSteps: 1/g)?.length, 2);
  assert.equal(page.match(/maximumInitialStraightSteps: 1/g)?.length, 2);
  assert.match(page, /minimumInitialStraightSteps: 2/);
  assert.match(page, /maximumInitialStraightSteps: 2/);
  assert.doesNotMatch(page, /launchAssist|INITIAL_RESPONSE_MS/);
  assert.match(page, /function selectMazeEndpoints/);
  assert.match(page, /type EndpointRegion = "upper-left" \| "upper-right" \| "lower-left" \| "lower-right"/);
  assert.match(page, /function getEndpointRegion/);
  assert.match(page, /endpoint\.edge === start\.edge/);
  assert.match(page, /endpoint\.region === start\.region/);
  assert.match(page, /startRegion: endpoints\.start\.region/);
  assert.match(page, /goalRegion: endpoints\.goal\.region/);
  assert.match(page, /endpoints\.start\.inwardDirection/);
  assert.match(page, /measureStraightRuns/);
  assert.equal(page.match(/maximumStraightRunSteps: 2/g)?.length, 2);
  assert.match(page, /maximumStraightRunSteps: 3/);
  assert.match(page, /const deflectorCell = deflectorDistance <= maximumDeflectorDistance/);
  assert.match(page, /const minimumDeflectorDistance = Math\.max\([\s\S]*?SPAWN_CLEARANCE_LENGTH \+ 2/);
  assert.match(page, /if \(!protectedCells\.has\(renderCellIndex\(column, row\)\)\) break/);
  assert.match(page, /const forcedBlockedCells = new Set<number>\(deflectorCell === null \? \[\] : \[deflectorCell\]\)/);
  assert.match(page, /id: "start-deflector"/);
  assert.match(page, /entryDirection: maze\.initialDirection/);
  assert.match(page, /function drawEntryArrow/);
  assert.match(page, /drawEntryArrow\(context, runtime\.startServer, runtime\.entryDirection\)/);
  assert.match(page, /const halo = context\.createRadialGradient\(0, 0, 2, 0, 0, haloRadius\)/);
  assert.match(page, /context\.shadowBlur = 26 \* emphasis/);
  assert.match(page, /drawPad\(context, runtime\.startServer, "#aaff63", 0\.65 \+ pulse \* 0\.35, 1\.55\)/);
  assert.match(page, /function boardUnit/);
  assert.match(page, /BOARD_TEXTURE_SCALE = 2/);
  assert.match(page, /cluster < 104/);
  assert.match(page, /index < 260/);
  assert.match(page, /index < 56/);
  assert.match(page, /index < 360/);
  assert.match(page, /context\.drawImage\(getBoardLayer\(runtime\), 0, 0, canvas\.width, canvas\.height\)/);
  assert.match(page, /const labels = \["R", "C", "U", "D", "J", "TP"\]/);
  assert.match(page, /const dockBounds = edge === "top"/);
  assert.match(page, /drawServer\(context, runtime\.goal, runtime\.goalEdge\)/);
  assert.match(page, /drawServer\(context, runtime\.startServer, runtime\.startEdge\)/);
  assert.match(page, /setScreen\("transition"\)/);
  assert.match(page, /screen !== "transition"/);
  assert.match(page, /completedPhase < 3 \? COMPLETED_MAZE_BLUR_MS : COMPLETION_DELAY_MS/);
  assert.match(page, /startPhase\(\(completedPhase \+ 1\) as PhaseNumber, NEXT_MAZE_BLUR_MS, "entry"\)/);
  assert.match(page, /\{snapshot\.phase\}\/3<\/b> LABIRINTOS CONCLUÍDOS/);
  assert.match(page, /snapshot\.phase < 3 && <i/);
  assert.match(page, /snapshot\.phase === 3 \? "final-completion-card"/);
  assert.doesNotMatch(page, /INICIAR LABIRINTO|Segmento restaurado|O próximo labirinto/);
  assert.match(page, /type VictoryStage = "swarm" \| "freeze" \| "blackout" \| "terminal"/);
  assert.match(page, /VIRUS_SWARM_DURATION_MS = 5_200/);
  assert.match(page, /VIRUS_FREEZE_DURATION_MS = 420/);
  assert.match(page, /VIRUS_BLACKOUT_DURATION_MS = 1_200/);
  assert.match(page, /VIRUS_LEADER_WIDTH = 34/);
  assert.match(page, /VIRUS_LEADER_HEIGHT = 30/);
  assert.match(page, /VIRUS_TRAIL_LIMIT = 104/);
  assert.match(page, /className=\{`virus-display virus-stage-\$\{victoryStage\}`\}/);
  assert.match(page, /const malwareActive = screen === "victory" && \(victoryStage === "swarm" \|\| victoryStage === "freeze"\)/);
  assert.match(page, /screen === "transition" \|\| malwareActive/);
  assert.doesNotMatch(page, /lastMazeFrame|toDataURL\("image\/png"\)/);
  assert.match(page, /className="virus-spread-field"/);
  assert.match(page, /className=\{`virus-block virus-trail-block virus-block-tone-\$\{block\.tone\}`\}/);
  assert.match(css, /content: "RESTORE_NET\.EXE"/);
  assert.match(css, /content: "— {2}□ {2}×"/);
  assert.match(page, /createVirusLeaderMotion/);
  assert.match(page, /createVirusTrailBlock/);
  assert.match(page, /VIRUS_LEADER_SPEED_X = 120/);
  assert.match(page, /VIRUS_LEADER_SPEED_Y = 92/);
  assert.match(page, /leader\.velocityX \*= -1/);
  assert.match(page, /leader\.velocityY \*= -1/);
  assert.match(page, /requestAnimationFrame\(moveLeader\)/);
  assert.match(page, /VIRUS_TRAIL_TICK_MS = 52/);
  assert.match(page, /window\.setTimeout\(stampTrail, VIRUS_TRAIL_TICK_MS\)/);
  assert.match(page, /window\.clearTimeout\(trailTimer\)/);
  assert.match(page, /createVirusTrailBlock\(id, virusLeaderMotionRef\.current\)/);
  assert.doesNotMatch(page, /spawnAccumulator|spawnCascadeFrame|VIRUS_CASCADE_LIMIT/);
  assert.match(page, /className="virus-block virus-leader virus-block-tone-0"/);
  assert.match(page, />RESTAURAÇÃO COMPLETA<\/span>/);
  assert.doesNotMatch(page, /virus-breach-banner|PROCESSO AUTORREPLICANTE DETECTADO|className="virus-grid"/);
  assert.match(page, /setVictoryStage\("freeze"\)/);
  assert.match(page, /setVictoryStage\("blackout"\)/);
  assert.match(page, /setVictoryStage\("terminal"\)/);
  assert.match(page, /className="victory-blackout"/);
  assert.match(page, /className="terminal-blackout"/);
  assert.match(page, /className="terminal-workspace"/);
  assert.match(page, /className="terminal-success-panel"/);
  assert.match(page, /className="terminal-success-head"/);
  assert.match(page, /className="terminal-success-seal"/);
  assert.match(page, /className="terminal-success-progress"/);
  assert.match(page, /className="terminal-success-foot"/);
  assert.match(page, /function LetterRevealBox/);
  assert.match(page, /<LetterRevealBox finalLetter="N" slot=\{1\} \/>/);
  assert.match(page, /<LetterRevealBox finalLetter="O" slot=\{2\} \/>/);
  assert.match(page, /DECRYPT_REVEAL_TICKS = 20/);
  assert.match(page, /DECRYPT_TICK_MS = 52/);
  assert.match(page, /Math\.random\(\) \* DECRYPT_ALPHABET\.length/);
  assert.match(page, /CLIQUE PARA REVELAR/);
  assert.match(page, /if \(revealState !== "idle"\) return/);
  assert.match(page, /disabled=\{revealState !== "idle"\}/);
  assert.doesNotMatch(page, /Clique para decodificar novamente/);
  assert.doesNotMatch(page, /<dt>CONEXÃO<\/dt>|<dt>AMEAÇAS<\/dt>|<dt>STATUS<\/dt>/);
  assert.match(page, /function WireframeEarth/);
  assert.match(page, /className="terminal-earth-stage"/);
  assert.match(page, /className="terminal-earth-canvas"/);
  assert.match(page, /timestamp \* 0\.000105/);
  assert.match(page, /EARTH_FRAME_INTERVAL_MS = 1_000 \/ 30/);
  assert.match(page, /EARTH_AXIS_TILT = 0\.52/);
  assert.match(page, /EARTH_MAX_PIXEL_RATIO = 1\.5/);
  assert.match(page, /Array\.from\(\{ length: 4 \}, \(\) => new Path2D\(\)\)/);
  assert.doesNotMatch(page, /context\.strokeStyle = "rgba\(116, 255, 222, \.9\)"/);
  assert.match(page, /timestamp - lastRenderedAt < EARTH_FRAME_INTERVAL_MS/);
  assert.match(page, /window\.requestAnimationFrame\(renderEarth\)/);
  assert.match(page, /prefers-reduced-motion: reduce/);
  assert.match(css, /\.terminal-earth-stage/);
  assert.match(css, /\.terminal-earth-canvas/);
  assert.match(css, /\.terminal-decrypt-grid \{[\s\S]*?grid-template-columns: repeat\(2, clamp\(104px, 9\.5vw, 128px\)\)[\s\S]*?justify-content: center/);
  assert.match(css, /\.terminal-decrypt-box\.decrypt-scrambling > i/);
  assert.match(css, /@keyframes terminal-decrypt-scan/);
  assert.match(css, /@keyframes terminal-decrypt-box-flash/);
  assert.match(css, /@keyframes terminal-decrypt-letter-flash/);
  assert.match(css, /\.terminal-decrypt-box:disabled \{[\s\S]*?cursor: default/);
  assert.match(css, /\.terminal-decrypt-box\.decrypt-revealed:nth-child\(2\)[\s\S]*?animation-delay: -0\.45s/);
  assert.match(css, /\.terminal-decrypt-box > strong \{[\s\S]*?font-size: clamp\(42px, 4\.2vw, 58px\)/);
  assert.match(page, /Parabéns, operador/);
  assert.match(page, /Dois fragmentos criptografados ainda aguardam validação manual/);
  assert.match(css, /\.terminal-workspace \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\) clamp\(420px, 42vw, 760px\)/);
  assert.match(css, /\.terminal-workspace \{[\s\S]*?gap: clamp\(24px, 2\.6vw, 48px\)[\s\S]*?padding: 0 clamp\(54px, 5vw, 96px\) 24px 20px/);
  assert.match(page, /const TERMINAL_LINE_LIMIT = 48/);
  assert.match(css, /\.terminal-stream \{[\s\S]*?justify-content: flex-end[\s\S]*?padding: 6px 20px/);
  assert.match(css, /\.terminal-success-panel \{[\s\S]*?width: 100%[\s\S]*?height: min\(82dvh, 760px\)[\s\S]*?align-self: center[\s\S]*?justify-self: center/);
  assert.match(page, /className="terminal-stream"/);
  assert.match(page, /createTerminalLine/);
  assert.match(page, /createTerminalLoadingLine/);
  assert.match(page, /function createTerminalLoadingTask/);
  assert.match(page, /NOVA_AURORA_NET :: autenticando gateway NA-GW-\{node\}/);
  assert.match(page, /NOVA_AURORA_NET :: aplicando rota segura via 10\.42\.\{octet\}\.1/);
  assert.match(page, /let linesUntilLoading = 12 \+ Math\.floor\(Math\.random\(\) \* 7\)/);
  assert.match(page, /linesUntilLoading = 15 \+ Math\.floor\(Math\.random\(\) \* 11\)/);
  assert.match(page, /const task = createTerminalLoadingTask\(\)/);
  assert.doesNotMatch(page, /id % 7 === 0/);
  assert.match(page, /text: `\[\$\{bar\}\] \$\{progress\}% {2}\$\{task\}`/);
  assert.doesNotMatch(page, /String\(progress\)\.padStart\(3, "0"\)/);
  assert.match(page, /placeLine\(createTerminalLoadingLine\(id, progress, task\)\)/);
  assert.match(page, /if \(progress >= 100\)/);
  assert.match(page, /window\.setTimeout\(advanceLoading, 85 \+ Math\.random\(\) \* 210\)/);
  assert.match(page, /window\.setTimeout\(appendLine, 320 \+ Math\.random\(\) \* 380\)/);
  assert.match(page, /stutterDelay \? 380 \+ Math\.random\(\) \* 920 : 45 \+ Math\.random\(\) \* 125/);
  assert.match(css, /--malware-lime: #00ff1e/);
  assert.match(css, /\.virus-display \{[\s\S]*?position: fixed[\s\S]*?z-index: 50[\s\S]*?background: transparent/);
  assert.doesNotMatch(css, /@keyframes virus-block-signal|--block-duration/);
  assert.doesNotMatch(css, /@keyframes virus-block-reveal|@keyframes virus-block-spread|@keyframes virus-block-stutter|clip-path: inset\(0 100% 0 0\)|scale\(1\.12\)/);
  assert.match(css, /@keyframes terminal-loading-line/);
  assert.match(css, /@keyframes terminal-power-on/);
  assert.match(css, /@keyframes terminal-cursor/);
  assert.match(css, /@keyframes terminal-success-scan/);
  assert.match(css, /@keyframes terminal-success-beacon/);
  assert.match(css, /\.virus-stage-freeze[\s\S]*?animation-play-state: paused !important/);
  assert.doesNotMatch(page, /A · ORIGEM|B · DESTINO/);
  assert.match(page, /buildPanelGroups/);
  assert.match(page, /if \(groups\.length === 0\)/);
  assert.match(page, /groups\.length === 0[\s\S]*?variant\.tiles\.length === 5[\s\S]*?variant\.id !== "tetromino-o"/);
  assert.match(page, /const gap = phase === 3[\s\S]*?2\.1 \+ \(groupIndex % 3\) \* 0\.2[\s\S]*?3\.4 \+ \(groupIndex % 3\) \* 0\.3/);
  assert.match(page, /!groupCells\.has\(neighbor\)\) remaining\.delete\(neighbor\)/);
  assert.match(page, /buildPanelAssemblyIds/);
  assert.match(page, /const bodyCells = assemblyCells\.get\(assemblyId\)/);
  assert.match(page, /const assemblyId = tile\.assemblyId \?\? groupId/);
  assert.match(page, /REFERENCE_FRAME_PROFILE/);
  assert.match(page, /measuredMedianRgb: \[32, 74, 54\]/);
  assert.match(page, /const OBSTACLE_WALL_HEX = "#23533d"/);
  assert.match(page, /const OBSTACLE_DETAIL_HEX = "#579b75"/);
  assert.match(page, /const OBSTACLE_DETAIL_RGB = "87, 155, 117"/);
  assert.match(page, /renderColumns = config\.columns \* 2 - 1/);
  assert.match(page, /shapeUseCount/);
  assert.match(page, /placedCells/);
  assert.match(page, /drawConnectedObstacleBodies/);
  assert.match(page, /context\.lineCap = "butt"/);
  assert.match(page, /context\.lineJoin = "miter"/);
  assert.doesNotMatch(page, /context\.lineTo\(seamX, leftCenter\.y\)/);
  assert.doesNotMatch(page, /let connectionsDrawn = 0/);
  assert.match(page, /standardObstacles\.forEach\(\(obstacle\) => drawObstacleDetails/);
  assert.match(page, /function drawObstacleSurfaceTexture/);
  assert.match(page, /drawObstacleSurfaceTexture\(context, connectedObstacles, runtime\.phase\)/);
  assert.match(page, /function snapTextureCoordinate/);
  assert.match(page, /context\.imageSmoothingEnabled = false/);
  assert.match(page, /const traceCount = 12 \+ phase \* 3/);
  assert.match(page, /context\.fillRect\(0, crispY, BOARD_WIDTH, 0\.5\)/);
  assert.match(page, /for \(let y = 20 \+ phase \* 2; y < BOARD_HEIGHT - 12; y \+= 42\)/);
  assert.match(page, /Math\.round\(\(40 \+ boardUnit\(seed \+ 3\) \* 64\) \/ 8\) \* 8/);
  assert.match(page, /tetrisGroups\.forEach\(\(tiles\) => drawTetrisGroupDetails/);
  assert.doesNotMatch(page, /drawRoundaboutGuide/);
  assert.doesNotMatch(page, /rgba\(126, 219, 168, \.026\)/);
  assert.match(page, /const tracks = crossSize >= 44 \? 2 : 1/);
  assert.match(page, /const padSpacing = profileIndex % 2 === 0 \? 84 : 104/);
  assert.doesNotMatch(page, /rgba\((?:171, 246, 203|151, 234, 187|191, 255, 216|174, 245, 205|214, 255, 229|225, 255, 236)/);
  assert.match(page, /function carveDeadEndBranches/);
  assert.match(page, /carveDeadEndBranches\([\s\S]*?phase \+ 1/);
  assert.match(page, /cluster < 104/);
  assert.match(page, /cluster % 3 === 0/);
  assert.match(page, /cpuObstacles\.forEach\(\(obstacle\) => drawCpuObstacle/);
  assert.match(page, /addRoundaboutLoops/);
  assert.match(page, /roundedRectanglePoints/);
  assert.match(page, /chamferedRectanglePoints/);
  assert.match(page, /points: chamferedRectanglePoints\(bounds, 5, corners\)/);
  assert.match(page, /randomAxisSizes/);
  assert.match(page, /cpu-core/);
  assert.match(page, /roundRect/);
  assert.match(page, /requestAnimationFrame/);
  assert.match(page, /bootComplete/);
  assert.match(page, /screen === "game" \|\| malwareActive \? "cursor-hidden" : ""/);
  assert.match(page, /CARREGANDO PROTOCOLO LABIRINTO/);
  assert.match(page, /SENTINELA PCB \/\/ NOVA AURORA/);
  assert.match(page, /MONITORAMENTO ATIVO/);
  assert.match(page, /PCB CORE/);
  assert.match(page, /AES-256/);
  assert.match(page, /IDS-01/);
  assert.match(page, /MITM/);
  assert.match(page, /BOTNET/);
  assert.match(page, /CVE-07/);
  assert.equal(page.match(/className="security-link link-[a-d]"/g)?.length, 4);
  assert.equal(page.match(/className="node-anchor"/g)?.length, 4);
  assert.match(css, /@keyframes system-entry-exit/);
  assert.match(css, /\.system-booting,[\s\S]*?\.cursor-hidden \* \{[\s\S]*?cursor: none !important/);
  assert.match(css, /@keyframes terminal-lock/);
  assert.match(css, /@keyframes boot-fill/);
  assert.match(css, /@keyframes gate-fill/);
  assert.match(css, /\.start-gate-overlay h2 \{[\s\S]*?font-family: var\(--font-geist-mono\)[\s\S]*?letter-spacing: 0\.075em[\s\S]*?text-transform: uppercase/);
  assert.match(css, /\.start-gate-overlay\.retry-gate h2 \{[\s\S]*?animation: retry-title-glitch/);
  assert.match(css, /@keyframes gate-title-signal/);
  assert.match(css, /@keyframes retry-title-glitch/);
  assert.match(css, /@keyframes security-sweep/);
  assert.match(css, /@keyframes security-scanline/);
  assert.match(css, /\.core-lock/);
  assert.match(css, /\.security-metrics/);
  assert.match(css, /\.node-anchor \{[\s\S]*?left: 100%/);
  assert.match(css, /\.security-link \{[\s\S]*?width: 47%/);
  assert.match(css, /\.connection-system/);
  assert.match(css, /\.connection-system \{[\s\S]*?clip-path: polygon\(0 0, calc\(100% - 8px\) 0/);
  assert.match(css, /\.connection-system > div span::before/);
  assert.match(css, /\.connection-system > i::before,[\s\S]*?\.connection-system > i::after/);
  assert.match(css, /grid-template-columns: repeat\(7, minmax\(10px, 18px\)\) 46px/);
  assert.match(css, /\.connection-system > i \{[\s\S]*?gap: 6px/);
  assert.match(css, /\.connection-system em:nth-child\(7\) \{ height: 34px; color: #fff; \}/);
  assert.match(page, /className="connection-globe"/);
  assert.doesNotMatch(page, /connection-globe-meridians|connection-globe-latitudes/);
  assert.match(css, /\.connection-globe \{[\s\S]*?width: 42px[\s\S]*?height: 42px[\s\S]*?grid-column: 8[\s\S]*?justify-self: start[\s\S]*?margin-left: 4px[\s\S]*?background: url\("\/assets\/connection-globe-reference\.png"\) center \/ 124% no-repeat[\s\S]*?mix-blend-mode: screen/);
  assert.match(css, /\.connection-globe::before/);
  assert.match(css, /\.connection-globe::after/);
  assert.match(css, /@keyframes connection-beacon/);
  assert.match(css, /@keyframes connection-bar-pulse/);
  assert.match(css, /@keyframes final-completion-flash/);
  assert.match(page, /className="control-deck"[\s\S]*?className="connection-system"[\s\S]*?className="keyboard-hints"/);
  assert.doesNotMatch(page, /hud-panel mission-panel|hud-panel telemetry-panel|ProgressRing/);
  assert.match(css, /\.start-gate-overlay \{[\s\S]*?backdrop-filter: blur\(2px\)/);
  assert.match(css, /width: min\(1180px, 96vw\)/, "a introdução do sistema deve ocupar mais espaço");
  assert.match(css, /width: min\(1360px, 100%\)/, "o menu principal deve ser amplo");
  assert.equal(css.match(/max-width: 1840px/g)?.length, 2, "a barra e o minigame devem compartilhar a nova largura máxima");
  assert.match(css, /\.game-layout \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(css, /\.game-page \{[\s\S]*?height: 100dvh[\s\S]*?overflow: hidden/);
  assert.match(css, /\.game-layout \{[\s\S]*?width: min\(100%, calc\(167dvh - 330px\)\)/);
  assert.match(page, /<section className="game-layout">/);
  assert.doesNotMatch(css, /phase-layout-/);
  assert.match(css, /\.board-column \{[\s\S]*?height: 100%[\s\S]*?flex-direction: column/);
  assert.match(css, /\.radar \{[\s\S]*?height: 340px/);
  assert.match(css, /\.control-deck \{[\s\S]*?height: 74px[\s\S]*?min-height: 74px/);
  assert.match(css, /\.control-deck \{[\s\S]*?grid-template-columns: minmax\(240px, 330px\) 1fr auto/);
  assert.match(page, /MAX_MOVE_SAMPLE = 1\.5/);
  assert.match(page, /TRACE_RADIUS = 2/);
  assert.match(page, /SNAKE_HEAD_RADIUS = 5/);
  assert.match(page, /SERVER_WIDTH = 44/);
  assert.match(page, /SERVER_HEIGHT = 40/);
  assert.match(page, /startServer: maze\.startServer/);
  assert.match(page, /context\.lineWidth = 4/);
  assert.match(page, /const goalContact = findGoalContactPoint\(previousHead, proposedHead, current\.goal\)/);
  assert.doesNotMatch(page, /current\.path\[0\] = current\.goal/);
  assert.match(page, /boardLayerCache = new WeakMap/);
  assert.doesNotMatch(page, /setInterval/);
  assert.doesNotMatch(page, /new Image\(\)|pcb-map\.png/);
  assert.doesNotMatch(css, /pcb-map\.png/);

  const mapUrl = new URL("../public/pcb-map.png", import.meta.url);
  await assert.rejects(access(mapUrl), "a imagem de referência não deve fazer parte do mapa");

  const audioFiles = [
    "terminal-ambience.mp3",
    "packet-collected.mp3",
    "system-error.mp3",
    "stage-complete.mp3",
    "ui-select.mp3",
  ];
  for (const file of audioFiles) {
    const url = new URL(`../public/audio/${file}`, import.meta.url);
    await access(url);
    assert.ok((await stat(url)).size > 1000, `${file} deve conter áudio`);
  }
  const connectionGlobe = await readFile(new URL("../public/assets/connection-globe-reference.png", import.meta.url));
  assert.equal(createHash("sha256").update(connectionGlobe).digest("hex"), "c24cbafd86ad493677808cec90358401fc4f89b0e81bd5aeee3a6c37b78b582c");
});

test("gera mapas cercados, abertos, variados e solucionáveis", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const start = page.indexOf("type Point");
  const end = page.indexOf("function drawBoardBackground");
  assert.ok(start >= 0 && end > start, "a seção pura do gerador deve estar disponível");

  const source = `${page.slice(start, end)}\nglobalThis.__generateMazeLayout = generateMazeLayout;\nglobalThis.__collidesWithObstacles = collidesWithObstacles;\nglobalThis.__touchesGoal = touchesGoal;\nglobalThis.__findGoalContactPoint = findGoalContactPoint;\nglobalThis.__buildPanelAssemblyIds = buildPanelAssemblyIds;`;
  const javascript = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText;
  Function(javascript)();

  const generate = globalThis.__generateMazeLayout;
  const collides = globalThis.__collidesWithObstacles;
  const touchesGoal = globalThis.__touchesGoal;
  const findGoalContactPoint = globalThis.__findGoalContactPoint;
  const buildPanelAssemblyIds = globalThis.__buildPanelAssemblyIds;
  assert.equal(typeof generate, "function");
  assert.equal(touchesGoal({ x: 27, y: 0 }, { x: 0, y: 0 }), true, "a borda da cabeça deve concluir a fase ao tocar a caixa objetivo");
  assert.equal(touchesGoal({ x: 27.01, y: 0 }, { x: 0, y: 0 }), false, "a fase não deve terminar antes do contato com a caixa");
  assert.deepEqual(findGoalContactPoint({ x: 30, y: 0 }, { x: 26, y: 0 }, { x: 0, y: 0 }), { x: 27, y: 0 }, "o traço deve parar quando a cabeça toca a borda da caixa objetivo");
  const joinedAssemblyIds = buildPanelAssemblyIds([{ id: "a", cells: [0] }, { id: "b", cells: [1] }], 2);
  const separateAssemblyIds = buildPanelAssemblyIds([{ id: "a", cells: [0] }, { id: "b", cells: [3] }], 2);
  const chainedAssemblyIds = buildPanelAssemblyIds([{ id: "a", cells: [0] }, { id: "b", cells: [1] }, { id: "c", cells: [2] }, { id: "d", cells: [4] }], 5);
  assert.equal(joinedAssemblyIds[0], joinedAssemblyIds[1], "peças vizinhas escolhidas para um conjunto devem formar um único corpo");
  assert.notEqual(separateAssemblyIds[0], separateAssemblyIds[1], "peças distantes devem continuar separadas");
  assert.equal(new Set(chainedAssemblyIds.slice(0, 3)).size, 1, "cadeias vizinhas devem formar um único corpo sem limite de tamanho");
  assert.notEqual(chainedAssemblyIds[2], chainedAssemblyIds[3], "uma peça sem contato deve preservar seu próprio corpo");
  const randomizedStartEdges = new Set();
  const randomizedGoalEdges = new Set();
  const randomizedStartPositions = new Set();
  const randomizedGoalPositions = new Set();
  const randomizedStartRegions = new Set();
  const randomizedGoalRegions = new Set();
  const originalRandom = Math.random;
  let randomState = 0x4e4f5641;
  Math.random = () => {
    randomState = (Math.imul(randomState, 1_664_525) + 1_013_904_223) >>> 0;
    return randomState / 4_294_967_296;
  };
  try {
    for (let run = 0; run < 40; run += 1) {
      const first = generate(1);
      const second = generate(2);
      const third = generate(3);
      assert.ok(first.obstacles.length >= 115 && first.obstacles.length <= 140, "o primeiro mapa deve preencher a matriz 11×7 sem fechar a baia de lançamento");
      assert.ok(second.obstacles.length >= 140 && second.obstacles.length <= 190, "o segundo mapa deve equilibrar a matriz 13×8 com a rota ampliada e mais peças PCB");
      assert.ok(third.obstacles.length >= 200 && third.obstacles.length <= 280, "o terceiro mapa deve preservar a maior população de obstáculos ao redor da rota mais longa");
      assert.ok(first.solutionLength >= 28, "o primeiro percurso deve continuar substancial sem exigir uma rota excessivamente longa");
      assert.ok(second.solutionLength >= 60, "o segundo percurso deve crescer de forma perceptível após as rotatórias");
      assert.ok(third.solutionLength >= 84, "o terceiro percurso deve ser claramente o mais longo");
      assert.ok(first.solutionLength < second.solutionLength && second.solutionLength < third.solutionLength, "a extensão das rotas deve aumentar a cada nível");
      assert.ok(first.obstacles.length < second.obstacles.length && second.obstacles.length < third.obstacles.length, "a densidade de placas deve aumentar a cada nível");
      assert.equal(first.solutionPath.length, first.solutionLength, "a geometria da solução do primeiro mapa deve estar disponível");
      assert.equal(second.solutionPath.length, second.solutionLength, "a geometria da solução do segundo mapa deve estar disponível");
      assert.equal(third.solutionPath.length, third.solutionLength, "a geometria da solução do terceiro mapa deve estar disponível");
      assert.ok(new Set(first.obstacles.map((obstacle) => obstacle.templateId)).size >= 9, "o primeiro labirinto deve usar os 8 padrões e o núcleo CPU");
      assert.ok(new Set(second.obstacles.map((obstacle) => obstacle.templateId)).size >= 9, "o segundo labirinto deve usar os 8 padrões e o núcleo CPU");
      assert.ok(new Set(third.obstacles.map((obstacle) => obstacle.templateId)).size >= 9, "o terceiro labirinto deve usar os 8 padrões e o núcleo CPU");
      assert.ok(first.obstacles.filter((obstacle) => !obstacle.id.startsWith("tetris-")).every((obstacle) => Math.min(obstacle.bounds.width, obstacle.bounds.height) >= 25), "os painéis estruturais do primeiro labirinto devem ser robustos");
      assert.ok(second.obstacles.filter((obstacle) => !obstacle.id.startsWith("tetris-")).every((obstacle) => Math.min(obstacle.bounds.width, obstacle.bounds.height) >= 23), "os painéis estruturais do segundo labirinto devem ser robustos");
      const firstTetrisTiles = first.obstacles.filter((obstacle) => obstacle.id.startsWith("tetris-") && obstacle.kind === "module");
      const secondTetrisTiles = second.obstacles.filter((obstacle) => obstacle.id.startsWith("tetris-") && obstacle.kind === "module");
      const thirdTetrisTiles = third.obstacles.filter((obstacle) => obstacle.id.startsWith("tetris-") && obstacle.kind === "module");
      const firstGroups = new Set(firstTetrisTiles.map((obstacle) => obstacle.id.replace(/-tile-\d+$/, ""))).size;
      const secondGroups = new Set(secondTetrisTiles.map((obstacle) => obstacle.id.replace(/-tile-\d+$/, ""))).size;
      const thirdGroups = new Set(thirdTetrisTiles.map((obstacle) => obstacle.id.replace(/-tile-\d+$/, ""))).size;
      assert.equal(firstGroups, 20, "o primeiro mapa deve usar vinte conjuntos PCB sem invadir a baia de lançamento");
      assert.ok(secondGroups >= 22 && secondGroups <= 38, "o segundo mapa deve manter muitos conjuntos PCB ao redor da rota ampliada");
      assert.ok(thirdGroups >= 33 && thirdGroups <= 58, "o terceiro mapa deve manter muitos conjuntos PCB sem apagar o percurso crítico e seus becos sem saída");
      assert.ok(first.deadEndBranches <= 2, "o primeiro mapa normal deve limitar as distrações por becos sem saída");
      assert.ok(second.deadEndBranches >= 1, "o segundo mapa deve acrescentar becos sem saída reais");
      assert.ok(third.deadEndBranches >= 4, "o terceiro mapa deve acrescentar vários becos sem saída reais");
      for (const tiles of [firstTetrisTiles, secondTetrisTiles, thirdTetrisTiles]) {
        const leadingFeature = tiles.filter((obstacle) => obstacle.id.includes("-group-0-tile-"));
        assert.ok(leadingFeature.length >= 5, "o primeiro módulo deve evitar o pequeno quadrado compacto");
      }
      const assemblyGroups = (tiles) => {
        const assemblies = new Map();
        tiles.forEach((obstacle) => {
          const groupId = obstacle.id.replace(/-tile-\d+$/, "");
          const groups = assemblies.get(obstacle.assemblyId) ?? new Set();
          groups.add(groupId);
          assemblies.set(obstacle.assemblyId, groups);
        });
        return assemblies;
      };
      const firstAssemblies = assemblyGroups(firstTetrisTiles);
      const secondAssemblies = assemblyGroups(secondTetrisTiles);
      const thirdAssemblies = assemblyGroups(thirdTetrisTiles);
      const countNarrowSeams = (tiles) => {
        let seams = 0;
        for (let leftIndex = 0; leftIndex < tiles.length; leftIndex += 1) {
          for (let rightIndex = leftIndex + 1; rightIndex < tiles.length; rightIndex += 1) {
            const left = tiles[leftIndex];
            const right = tiles[rightIndex];
            if (left.assemblyId === right.assemblyId) continue;
            const horizontalGap = Math.max(left.bounds.x, right.bounds.x)
              - Math.min(left.bounds.x + left.bounds.width, right.bounds.x + right.bounds.width);
            const verticalGap = Math.max(left.bounds.y, right.bounds.y)
              - Math.min(left.bounds.y + left.bounds.height, right.bounds.y + right.bounds.height);
            const verticalOverlap = Math.min(left.bounds.y + left.bounds.height, right.bounds.y + right.bounds.height)
              - Math.max(left.bounds.y, right.bounds.y);
            const horizontalOverlap = Math.min(left.bounds.x + left.bounds.width, right.bounds.x + right.bounds.width)
              - Math.max(left.bounds.x, right.bounds.x);
            if ((horizontalGap > 0 && horizontalGap < 12 && verticalOverlap > 4)
              || (verticalGap > 0 && verticalGap < 12 && horizontalOverlap > 4)) seams += 1;
          }
        }
        return seams;
      };
      assert.ok([...firstAssemblies.values()].some((groups) => groups.size > 1), "o primeiro mapa deve conter conjuntos PCB sem emendas");
      assert.ok([...secondAssemblies.values()].some((groups) => groups.size > 1), "o segundo mapa deve conter conjuntos PCB sem emendas");
      assert.ok([...thirdAssemblies.values()].some((groups) => groups.size > 1), "o terceiro mapa deve conter conjuntos PCB sem emendas");
      assert.ok([...firstAssemblies.values()].some((groups) => groups.size === 1), "o primeiro mapa deve preservar peças separadas");
      assert.ok([...secondAssemblies.values()].some((groups) => groups.size === 1), "o segundo mapa deve preservar peças separadas");
      assert.ok([...thirdAssemblies.values()].some((groups) => groups.size === 1), "o terceiro mapa deve preservar peças separadas");
      assert.equal(countNarrowSeams(firstTetrisTiles), 0, "o primeiro mapa não deve exibir frestas entre peças de um conjunto");
      assert.equal(countNarrowSeams(secondTetrisTiles), 0, "o segundo mapa não deve exibir frestas entre peças de um conjunto");
      assert.equal(countNarrowSeams(thirdTetrisTiles), 0, "o terceiro mapa não deve exibir frestas entre peças de um conjunto");
      const firstGroupSizes = new Map();
      const secondGroupSizes = new Map();
      const thirdGroupSizes = new Map();
      firstTetrisTiles.forEach((obstacle) => {
        const id = obstacle.id.replace(/-tile-\d+$/, "");
        firstGroupSizes.set(id, (firstGroupSizes.get(id) ?? 0) + 1);
      });
      secondTetrisTiles.forEach((obstacle) => {
        const id = obstacle.id.replace(/-tile-\d+$/, "");
        secondGroupSizes.set(id, (secondGroupSizes.get(id) ?? 0) + 1);
      });
      thirdTetrisTiles.forEach((obstacle) => {
        const id = obstacle.id.replace(/-tile-\d+$/, "");
        thirdGroupSizes.set(id, (thirdGroupSizes.get(id) ?? 0) + 1);
      });
      assert.ok([...firstGroupSizes.values()].every((size) => size >= 4), "o primeiro mapa não deve conter peças minúsculas");
      assert.ok([...secondGroupSizes.values()].every((size) => size >= 4), "o segundo mapa não deve conter peças minúsculas");
      assert.ok([...thirdGroupSizes.values()].every((size) => size >= 4), "o terceiro mapa não deve conter peças minúsculas");
      assert.ok(firstTetrisTiles.some((obstacle) => obstacle.points.length > 4), "o primeiro mapa deve ter pequenos chanfros nas bordas expostas");
      assert.ok(secondTetrisTiles.some((obstacle) => obstacle.points.length > 4), "o segundo mapa deve ter pequenos chanfros nas bordas expostas");
      assert.ok(thirdTetrisTiles.some((obstacle) => obstacle.points.length > 4), "o terceiro mapa deve ter pequenos chanfros nas bordas expostas");
      const firstShapeIds = new Set(firstTetrisTiles.map((obstacle) => obstacle.id.match(/^tetris-(.+)-group-\d+-tile-/)?.[1]));
      const secondShapeIds = new Set(secondTetrisTiles.map((obstacle) => obstacle.id.match(/^tetris-(.+)-group-\d+-tile-/)?.[1]));
      const thirdShapeIds = new Set(thirdTetrisTiles.map((obstacle) => obstacle.id.match(/^tetris-(.+)-group-\d+-tile-/)?.[1]));
      assert.ok(firstShapeIds.size >= 8, "o primeiro mapa deve mostrar ao menos oito silhuetas diferentes");
      assert.ok(secondShapeIds.size >= 12, "o segundo mapa deve mostrar ao menos doze silhuetas diferentes");
      assert.ok(thirdShapeIds.size >= 12, "o terceiro mapa deve preservar ao menos doze silhuetas diferentes ao redor da rota ampliada");
      const firstLargeGroups = [...new Set(firstTetrisTiles.map((obstacle) => obstacle.id.replace(/-tile-\d+$/, "")))].filter((id) => id.startsWith("tetris-large-") || id.startsWith("tetris-mega-")).length;
      const secondLargeGroups = [...new Set(secondTetrisTiles.map((obstacle) => obstacle.id.replace(/-tile-\d+$/, "")))].filter((id) => id.startsWith("tetris-large-") || id.startsWith("tetris-mega-")).length;
      const thirdLargeGroups = [...new Set(thirdTetrisTiles.map((obstacle) => obstacle.id.replace(/-tile-\d+$/, "")))].filter((id) => id.startsWith("tetris-large-") || id.startsWith("tetris-mega-")).length;
      assert.ok(firstLargeGroups >= 3, "o primeiro mapa deve conter várias peças grandes");
      assert.ok(secondLargeGroups >= 3, "o segundo mapa deve conter várias peças grandes");
      assert.ok(thirdLargeGroups >= 8, "o terceiro mapa deve conter muitas peças grandes");
      assert.ok([...firstShapeIds].some((id) => id?.startsWith("mega-")), "o primeiro mapa deve conter um tetrominó de espessura dupla");
      assert.ok([...secondShapeIds].filter((id) => id?.startsWith("mega-")).length >= 2, "o segundo mapa deve conter vários tetrominós de espessura dupla");
      assert.ok([...thirdShapeIds].filter((id) => id?.startsWith("mega-")).length >= 3, "o terceiro mapa deve conter vários tetrominós de espessura dupla");
      assert.ok(firstTetrisTiles.length >= 72, "o primeiro mapa deve preencher os grandes vazios sem fechar a baia de lançamento");
      assert.ok(secondTetrisTiles.length >= 110, "o segundo mapa deve preencher os grandes vazios sem fechar o campo");
      assert.ok(thirdTetrisTiles.length >= 160, "o terceiro mapa deve preencher a matriz expandida sem fechar o campo");
      assert.ok(firstTetrisTiles.length / (21 * 13) >= 0.38 && firstTetrisTiles.length / (21 * 13) <= 0.55, "o primeiro mapa deve equilibrar o percurso ampliado, as peças e a baia de lançamento");
      assert.ok(secondTetrisTiles.length / (25 * 15) >= 0.35 && secondTetrisTiles.length / (25 * 15) <= 0.55, "o segundo mapa deve equilibrar a rota mais longa com peças e espaço aberto");
      assert.ok(thirdTetrisTiles.length / (31 * 17) >= 0.33 && thirdTetrisTiles.length / (31 * 17) <= 0.52, "o terceiro mapa deve preencher a matriz ampliada ao redor do percurso crítico");
      assert.ok(firstTetrisTiles.every((obstacle) => obstacle.bounds.width >= 24), "as peças do primeiro mapa devem permanecer grossas");
      assert.ok(secondTetrisTiles.every((obstacle) => obstacle.bounds.width >= 19.5), "as peças do segundo mapa devem permanecer grossas");
      assert.ok(thirdTetrisTiles.every((obstacle) => obstacle.bounds.width >= 16.5), "as peças do terceiro mapa ampliado devem permanecer legíveis");
      assert.equal(first.roundabouts.length, 1, "o primeiro labirinto deve ter uma rotatória retangular");
      assert.equal(second.roundabouts.length, 2, "o segundo labirinto deve ter duas rotatórias retangulares");
      assert.ok(third.roundabouts.length >= 1 && third.roundabouts.length <= 3, "o terceiro labirinto deve combinar rotatórias retangulares com a rota extrema sempre que houver espaço seguro");
      assert.ok(first.obstacles.filter((obstacle) => obstacle.kind === "cpu").length >= 1, "o primeiro labirinto deve ter um CPU");
      assert.ok(second.obstacles.filter((obstacle) => obstacle.kind === "cpu").length >= 2, "o segundo labirinto deve ter dois CPUs");
      assert.ok(third.obstacles.filter((obstacle) => obstacle.kind === "cpu").length >= 4, "o terceiro labirinto deve ter pelo menos quatro CPUs entre rotatórias e núcleos embarcados");
      assert.ok(first.obstacles.filter((obstacle) => obstacle.kind === "module").length >= 72, "o primeiro mapa deve ter blocos de placa-mãe variados sem fechar os becos sem saída");
      assert.ok(second.obstacles.filter((obstacle) => obstacle.kind === "module").length >= 110, "o segundo mapa deve ter blocos de placa-mãe variados");
      assert.ok(third.obstacles.filter((obstacle) => obstacle.kind === "module").length >= 160, "o terceiro mapa deve ter muitos blocos de placa-mãe variados");
      assert.ok(first.obstacles.filter((obstacle) => obstacle.id.startsWith("cpu-roundabout")).every((obstacle) => obstacle.bounds.width >= 45), "o CPU principal do primeiro labirinto deve ser grande");
      assert.ok(second.obstacles.filter((obstacle) => obstacle.id.startsWith("cpu-roundabout")).every((obstacle) => obstacle.bounds.width >= 38), "os CPUs principais do segundo labirinto devem ser grandes");
      assert.ok(third.obstacles.filter((obstacle) => obstacle.id.startsWith("cpu-roundabout")).every((obstacle) => obstacle.bounds.width >= 30), "os CPUs principais do terceiro labirinto devem ser legíveis");
      assert.ok(first.corridorWidth.min >= 32 && first.corridorWidth.max > first.corridorWidth.min, "os corredores do primeiro labirinto devem continuar amplos e variados");
      assert.ok(second.corridorWidth.min >= 28 && second.corridorWidth.max > second.corridorWidth.min, "os corredores do segundo labirinto devem variar de largura");
      assert.ok(third.corridorWidth.min >= 24 && third.corridorWidth.max > third.corridorWidth.min, "os corredores do terceiro labirinto devem variar de largura");
      assert.ok(first.roundabouts.every((roundabout) => roundabout.width >= 130 && roundabout.height >= 130), "a primeira rotatória deve ocupar uma grande área quadrada");
      assert.ok(second.roundabouts.every((roundabout) => roundabout.width >= 112 && roundabout.height >= 112), "as rotatórias do segundo labirinto devem ser grandes");
      assert.ok(third.roundabouts.every((roundabout) => roundabout.width >= 92 && roundabout.height >= 92), "as rotatórias do terceiro labirinto devem permanecer grandes");
      assert.ok([...first.roundabouts, ...second.roundabouts, ...third.roundabouts].every((roundabout) => {
        const ratio = roundabout.width / roundabout.height;
        return ratio >= 0.8 && ratio <= 1.25 && roundabout.radius <= 6;
      }), "as rotatórias devem ser quase quadradas e ter cantos discretamente arredondados");

      for (const maze of [first, second, third]) {
        randomizedStartEdges.add(maze.startEdge);
        randomizedGoalEdges.add(maze.goalEdge);
        randomizedStartRegions.add(maze.startRegion);
        randomizedGoalRegions.add(maze.goalRegion);
        randomizedStartPositions.add(`${maze.startEdge}:${Math.round(maze.startServer.x)}:${Math.round(maze.startServer.y)}`);
        randomizedGoalPositions.add(`${maze.goalEdge}:${Math.round(maze.goal.x)}:${Math.round(maze.goal.y)}`);
        assert.notEqual(maze.startEdge, maze.goalEdge, "origem e destino devem ocupar bordas diferentes");
        assert.notEqual(maze.startRegion, maze.goalRegion, "origem e destino nunca devem compartilhar a mesma região do tabuleiro");
        const inwardDirections = {
          top: { x: 0, y: 1 },
          right: { x: -1, y: 0 },
          bottom: { x: 0, y: -1 },
          left: { x: 1, y: 0 },
        };
        assert.deepEqual(maze.initialDirection, inwardDirections[maze.startEdge], "a trilha deve sempre nascer apontada para dentro da placa");
        const ids = new Set(maze.obstacles.map((obstacle) => obstacle.id));
        for (const border of ["border-top", "border-bottom", "border-left", "border-right"]) assert.ok(ids.has(border), `${border} deve cercar o mapa`);
        const firstMove = { x: maze.start.x + maze.initialDirection.x * 4, y: maze.start.y + maze.initialDirection.y * 4 };
        assert.equal(collides(firstMove, maze.obstacles, 9), false, "a saída de A deve começar em um corredor aberto");
        const perpendicular = { x: -maze.initialDirection.y, y: maze.initialDirection.x };
        for (const forwardOffset of [4, 24, 48, 72, 96]) {
          for (const sideOffset of [-32, -24, 24, 32]) {
            const clearancePoint = {
              x: maze.start.x + maze.initialDirection.x * forwardOffset + perpendicular.x * sideOffset,
              y: maze.start.y + maze.initialDirection.y * forwardOffset + perpendicular.y * sideOffset,
            };
            assert.equal(collides(clearancePoint, maze.obstacles, 5), false, "a origem deve ter espaço lateral para o jogador reagir");
          }
        }
        assert.deepEqual(maze.solutionPath[0], maze.start, "a solução deve começar exatamente no ponto A");
        assert.deepEqual(maze.solutionPath.at(-1), maze.goal, "a solução deve terminar exatamente no ponto B");
        const expectedStart = {
          x: maze.startServer.x + maze.initialDirection.x * 22,
          y: maze.startServer.y + maze.initialDirection.y * 20,
        };
        assert.deepEqual(maze.start, expectedStart, "a trilha deve nascer exatamente na borda de saída da caixa inicial");
        const firstDirection = {
          x: Math.sign(maze.solutionPath[1].x - maze.solutionPath[0].x),
          y: Math.sign(maze.solutionPath[1].y - maze.solutionPath[0].y),
        };
        const safeStraightSteps = maze === first ? 2 : 1;
        const firstTurnDirection = {
          x: Math.sign(maze.solutionPath[safeStraightSteps + 1].x - maze.solutionPath[safeStraightSteps].x),
          y: Math.sign(maze.solutionPath[safeStraightSteps + 1].y - maze.solutionPath[safeStraightSteps].y),
        };
        for (let index = 1; index < safeStraightSteps; index += 1) {
          const safeDirection = {
            x: Math.sign(maze.solutionPath[index + 1].x - maze.solutionPath[index].x),
            y: Math.sign(maze.solutionPath[index + 1].y - maze.solutionPath[index].y),
          };
          assert.deepEqual(safeDirection, firstDirection, "a saída segura deve permanecer reta até o ponto de reação definido");
        }
        assert.notDeepEqual(firstTurnDirection, firstDirection, "a rota deve curvar logo depois da curta saída segura");
        const initialRunDistance = Math.hypot(
          maze.solutionPath[1].x - maze.solutionPath[0].x,
          maze.solutionPath[1].y - maze.solutionPath[0].y,
        );
        let longestStraightRun = 1;
        let currentStraightRun = 1;
        let previousDirection = firstDirection;
        for (let index = 2; index < maze.solutionPath.length; index += 1) {
          const direction = {
            x: Math.sign(maze.solutionPath[index].x - maze.solutionPath[index - 1].x),
            y: Math.sign(maze.solutionPath[index].y - maze.solutionPath[index - 1].y),
          };
          if (direction.x === previousDirection.x && direction.y === previousDirection.y) currentStraightRun += 1;
          else currentStraightRun = 1;
          longestStraightRun = Math.max(longestStraightRun, currentStraightRun);
          previousDirection = direction;
        }
        assert.ok(longestStraightRun <= (maze === first ? 3 : 2), "nenhuma parte da rota deve formar uma reta longa demais para a dificuldade atual");
        let straightContinuationBlocked = false;
        const maximumRayDistance = maze.startEdge === "top" || maze.startEdge === "bottom" ? 486 : 812;
        for (let offset = initialRunDistance * 1.01; offset <= maximumRayDistance; offset += 1) {
          const point = {
            x: maze.start.x + firstDirection.x * offset,
            y: maze.start.y + firstDirection.y * offset,
          };
          if (collides(point, maze.obstacles, 5)) {
            straightContinuationBlocked = true;
            break;
          }
        }
        assert.equal(straightContinuationBlocked, true, "continuar reto depois da baia de lançamento deve ser fisicamente bloqueado");
        for (let index = 0; index < maze.solutionPath.length - 1; index += 1) {
          const from = maze.solutionPath[index];
          const to = maze.solutionPath[index + 1];
          const distance = Math.hypot(to.x - from.x, to.y - from.y);
          for (let offset = 0; offset <= distance; offset += 1.5) {
            const ratio = distance === 0 ? 0 : offset / distance;
            const point = { x: from.x + (to.x - from.x) * ratio, y: from.y + (to.y - from.y) * ratio };
            assert.equal(collides(point, maze.obstacles, 12), false, "toda a rota A–B deve manter folga confortável ao redor da trilha");
          }
        }
        for (const roundabout of maze.roundabouts) {
          const laneSamples = [
            { x: roundabout.x + roundabout.width / 2, y: roundabout.y },
            { x: roundabout.x + roundabout.width, y: roundabout.y + roundabout.height / 2 },
            { x: roundabout.x + roundabout.width / 2, y: roundabout.y + roundabout.height },
            { x: roundabout.x, y: roundabout.y + roundabout.height / 2 },
          ];
          assert.ok(laneSamples.every((point) => !collides(point, maze.obstacles, 9)), "a pista ao redor do CPU deve permanecer aberta");
        }
      }
    }
    assert.equal(randomizedStartEdges.size, 4, "a origem deve variar entre as quatro bordas");
    assert.equal(randomizedGoalEdges.size, 4, "o destino deve variar entre as quatro bordas");
    assert.equal(randomizedStartRegions.size, 4, "a origem deve variar entre as quatro regiões invisíveis");
    assert.equal(randomizedGoalRegions.size, 4, "o destino deve variar entre as quatro regiões invisíveis");
    assert.ok(randomizedStartPositions.size >= 16, "a origem deve variar de posição, não apenas trocar de lado");
    assert.ok(randomizedGoalPositions.size >= 16, "o destino deve variar de posição, não apenas trocar de lado");
  } finally {
    Math.random = originalRandom;
    delete globalThis.__generateMazeLayout;
    delete globalThis.__collidesWithObstacles;
    delete globalThis.__touchesGoal;
    delete globalThis.__findGoalContactPoint;
    delete globalThis.__buildPanelAssemblyIds;
  }
});
