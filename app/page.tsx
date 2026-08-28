"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

type Point = { x: number; y: number };
type Direction = Point;
type BoardEdge = "top" | "right" | "bottom" | "left";
type EndpointRegion = "upper-left" | "upper-right" | "lower-left" | "lower-right";
type PhaseNumber = 1 | 2 | 3;
type Screen = "protocol" | "intro" | "game" | "transition" | "gameover" | "victory";
type VictoryStage = "swarm" | "freeze" | "blackout" | "terminal";
type RuntimeStatus = "idle" | "running" | "paused" | "finished";
type StartGate = { kind: "entry" | "retry"; delayMs: number };
type TerminalLine = { id: number; kind: "prompt" | "output" | "warning" | "loading"; text: string };
type VirusBlock = {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  tone: 0 | 1;
};

type VirusLeaderMotion = {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  tone: 0 | 1;
  entered: boolean;
};

type WallProfile = {
  id: string;
  label: string;
};

type TetrisShape = {
  id: string;
  tiles: Point[];
};

type ObstacleKind = "border" | "panel" | "module" | "cpu";

type Obstacle = {
  id: string;
  templateId: string;
  label: string;
  points: Point[];
  bounds: { x: number; y: number; width: number; height: number };
  accent: string;
  detailSeed: number;
  kind: ObstacleKind;
  assemblyId?: string;
  cornerRadius?: number;
};

type PanelGroup = {
  id: string;
  cells: number[];
};

type Roundabout = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
};

type Runtime = {
  phase: PhaseNumber;
  path: Point[];
  start: Point;
  startServer: Point;
  startEdge: BoardEdge;
  goal: Point;
  goalEdge: BoardEdge;
  entryDirection: Direction;
  direction: Direction;
  queuedDirection: Direction;
  obstacles: Obstacle[];
  roundabouts: Roundabout[];
  corridorWidth: { min: number; max: number };
  travelled: number;
  solutionLength: number;
  status: RuntimeStatus;
};

type MazeCell = {
  visited: boolean;
  walls: [boolean, boolean, boolean, boolean];
};

type MazeLayout = {
  obstacles: Obstacle[];
  start: Point;
  startServer: Point;
  startEdge: BoardEdge;
  startRegion: EndpointRegion;
  goal: Point;
  goalEdge: BoardEdge;
  goalRegion: EndpointRegion;
  initialDirection: Direction;
  solutionPath: Point[];
  solutionLength: number;
  roundabouts: Roundabout[];
  corridorWidth: { min: number; max: number };
  deadEndBranches: number;
};

type MazeSet = Record<PhaseNumber, MazeLayout>;

type ChamferCorners = {
  topLeft: boolean;
  topRight: boolean;
  bottomRight: boolean;
  bottomLeft: boolean;
};

const BOARD_WIDTH = 812;
const BOARD_HEIGHT = 486;
const BOARD_TEXTURE_SCALE = 2;
const TRACE_RADIUS = 2;
const GOAL_PAD_RADIUS = 12;
const SNAKE_HEAD_RADIUS = 5;
const SERVER_WIDTH = 44;
const SERVER_HEIGHT = 40;
const MAX_FRAME_DELTA = 1 / 30;
const MAX_MOVE_SAMPLE = 1.5;
const SNAKE_SPEED = 140;
const SELF_COLLISION_SKIP = 16;
const MAX_CONNECTIONS = 7;
const FIRST_ENTRY_DELAY_MS = 2_000;
const RETRY_DELAY_MS = 3_000;
const COMPLETED_MAZE_BLUR_MS = 1_000;
const NEXT_MAZE_BLUR_MS = 1_500;
const COMPLETION_DELAY_MS = 4_000;
const VIRUS_SWARM_DURATION_MS = 5_200;
const VIRUS_FREEZE_DURATION_MS = 420;
const VIRUS_BLACKOUT_DURATION_MS = 1_200;
const VIRUS_LEADER_WIDTH = 34;
const VIRUS_LEADER_HEIGHT = 30;
const VIRUS_LEADER_SPEED_X = 120;
const VIRUS_LEADER_SPEED_Y = 92;
const VIRUS_TRAIL_TICK_MS = 52;
const VIRUS_TRAIL_LIMIT = 104;
const TERMINAL_LINE_LIMIT = 48;
const EARTH_FRAME_INTERVAL_MS = 1_000 / 30;
const EARTH_AXIS_TILT = 0.52;
const EARTH_MAX_PIXEL_RATIO = 1.5;
const SPAWN_CLEARANCE_LENGTH = 5;
const SPAWN_CLEARANCE_HALF_WIDTH = 3;
const MAZE_BOUNDS = { x: 4, y: 4, width: 804, height: 478 };
const DEFAULT_START_SERVER: Point = { x: 768, y: 48 };
const DEFAULT_START: Point = { x: DEFAULT_START_SERVER.x - SERVER_WIDTH / 2, y: DEFAULT_START_SERVER.y };
const DEFAULT_GOAL: Point = { x: 44, y: 438 };
const DEFAULT_DIRECTION: Direction = { x: -1, y: 0 };

function createVirusLeaderMotion(): VirusLeaderMotion {
  return {
    x: -VIRUS_LEADER_WIDTH / 2,
    y: 18,
    velocityX: VIRUS_LEADER_SPEED_X,
    velocityY: VIRUS_LEADER_SPEED_Y,
    tone: 0,
    entered: false,
  };
}

function createVirusTrailBlock(id: number, leader: VirusLeaderMotion): VirusBlock {
  return {
    id,
    x: leader.x,
    y: leader.y,
    width: VIRUS_LEADER_WIDTH,
    height: VIRUS_LEADER_HEIGHT,
    tone: id % 2 as 0 | 1,
  };
}

const TERMINAL_BOOT_LINES: TerminalLine[] = [
  { id: 0, kind: "output", text: "Nova Aurora Secure Linux 6.12.9-rf (tty1)" },
  { id: 1, kind: "output", text: "nova-aurora login: root (automatic login)" },
  { id: 2, kind: "warning", text: "[  !!  ] RESTORE.EXE perdeu o controle do processo" },
  { id: 3, kind: "prompt", text: "root@nova-aurora:/opt/rede-fantasma# _" },
];

const TERMINAL_COMMANDS = [
  "systemctl isolate emergency.target",
  "ip link set wlan0 down",
  "journalctl -k --no-pager -n 64",
  "ss -antup | grep ESTAB",
  "ps aux --sort=-%cpu | head",
  "modprobe ghost_net force=1",
  "nmap -sS 10.42.{octet}.0/24",
  "sha256sum /var/cache/restore/{token}.bin",
  "mount -o remount,ro /sys/firmware",
  "kill -STOP {pid}",
];

const TERMINAL_OUTPUTS = [
  "[  OK  ] cloned packet stream {token}",
  "kernel: NETDEV WATCHDOG: wlan0 queue timed out",
  "ghost_net: duplicate node mounted at /dev/rf-{token}",
  "audit: pid={pid} uid=0 terminal=tty1 result=OVERRIDDEN",
  "segfault at 0x{token} ip 0x0000000000{token}",
  "route cache poisoned: 10.42.{octet}.1 -> ff:ff:ff:ff:ff:ff",
  "[ WARN ] restoration process spawned another instance",
  "checksum mismatch; accepting corrupted block {token}",
];

const TERMINAL_LOADING_TASKS = [
  "NOVA_AURORA_NET :: autenticando gateway NA-GW-{node}",
  "NOVA_AURORA_NET :: reconstruindo rota 10.42.{octet}.0/24",
  "NOVA_AURORA_NET :: sincronizando núcleo RF-{token}",
  "NOVA_AURORA_NET :: verificando enlace do setor {sector}",
  "NOVA_AURORA_NET :: restaurando tabela de vizinhança",
  "NOVA_AURORA_NET :: isolando nó fantasma {token}",
  "NOVA_AURORA_NET :: negociando túnel AES-256",
  "NOVA_AURORA_NET :: validando DNS nova-aurora.local",
  "NOVA_AURORA_NET :: reindexando malha Wi-Fi {sector}",
  "NOVA_AURORA_NET :: aplicando rota segura via 10.42.{octet}.1",
  "NOVA_AURORA_NET :: recuperando fragmento de backbone {node}",
  "NOVA_AURORA_NET :: confirmando handshake do uplink {token}",
];

function createTerminalLoadingTask() {
  const template = TERMINAL_LOADING_TASKS[Math.floor(Math.random() * TERMINAL_LOADING_TASKS.length)];
  const token = Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0").toUpperCase();
  const octet = 10 + Math.floor(Math.random() * 230);
  const node = 1 + Math.floor(Math.random() * 48);
  const sector = String.fromCharCode(65 + Math.floor(Math.random() * 8));
  return template
    .replaceAll("{token}", token)
    .replaceAll("{octet}", String(octet))
    .replaceAll("{node}", String(node).padStart(2, "0"))
    .replaceAll("{sector}", sector);
}

function createTerminalLine(id: number): TerminalLine {
  const token = Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0");
  const pid = 1000 + Math.floor(Math.random() * 8999);
  const octet = 10 + Math.floor(Math.random() * 230);
  const isPrompt = id % 3 === 0;
  const template = isPrompt
    ? TERMINAL_COMMANDS[Math.floor(Math.random() * TERMINAL_COMMANDS.length)]
    : TERMINAL_OUTPUTS[Math.floor(Math.random() * TERMINAL_OUTPUTS.length)];
  const text = template
    .replaceAll("{token}", token)
    .replaceAll("{pid}", String(pid))
    .replaceAll("{octet}", String(octet));
  return {
    id,
    kind: isPrompt ? "prompt" : id % 5 === 0 ? "warning" : "output",
    text: isPrompt ? `root@nova-aurora:/opt/rede-fantasma# ${text}` : text,
  };
}

function createTerminalLoadingLine(id: number, progress: number, task: string): TerminalLine {
  const filled = Math.round(progress / 5);
  const bar = `${"█".repeat(filled)}${"░".repeat(20 - filled)}`;
  return { id, kind: "loading", text: `[${bar}] ${progress}%  ${task}` };
}

const REFERENCE_FRAME_PROFILE = {
  measuredMedianRgb: [32, 74, 54],
  panelGradient: [[35, 83, 61], [29, 70, 52], [22, 57, 43]],
} as const;
const OBSTACLE_WALL_HEX = "#23533d";
const OBSTACLE_DETAIL_HEX = "#579b75";
const OBSTACLE_DETAIL_RGB = "87, 155, 117";

const PHASES = {
  1: {
    number: 1 as const,
    code: "CENÁRIO NORMAL",
    name: "Rota de acesso",
    columns: 11,
    rows: 7,
    wallThickness: 26,
    minimumSolutionCells: 28,
    minimumLoopSolutionCells: 24,
    targetSolutionCells: 30,
    minimumInitialStraightSteps: 2,
    maximumInitialStraightSteps: 2,
    maximumStraightRunSteps: 3,
    roundaboutCount: 1,
    componentTarget: 20,
    largePieceTarget: 5,
    megaPieceTarget: 2,
    embeddedCpuCount: 1,
    deadEndTarget: 2,
    axisVariance: 0.08,
    minimumCorridor: 32,
    targetOccupancy: [0.68, 0.74],
    description: "Uma placa 11×7 mais aberta, com vinte conjuntos PCB e uma rotatória CPU.",
  },
  2: {
    number: 2 as const,
    code: "CENÁRIO DIFÍCIL",
    name: "Núcleo blindado",
    columns: 13,
    rows: 8,
    wallThickness: 24,
    minimumSolutionCells: 60,
    minimumLoopSolutionCells: 54,
    targetSolutionCells: 62,
    minimumInitialStraightSteps: 1,
    maximumInitialStraightSteps: 1,
    maximumStraightRunSteps: 2,
    roundaboutCount: 2,
    componentTarget: 38,
    largePieceTarget: 11,
    megaPieceTarget: 5,
    embeddedCpuCount: 2,
    deadEndTarget: 4,
    axisVariance: 0.08,
    minimumCorridor: 28,
    targetOccupancy: [0.79, 0.85],
    description: "Uma placa 13×8 densa, com trinta e oito conjuntos PCB, percurso prolongado e duas rotatórias.",
  },
  3: {
    number: 3 as const,
    code: "CENÁRIO CRÍTICO",
    name: "Matriz extrema",
    columns: 16,
    rows: 9,
    wallThickness: 18,
    minimumSolutionCells: 94,
    minimumLoopSolutionCells: 84,
    targetSolutionCells: 98,
    minimumInitialStraightSteps: 1,
    maximumInitialStraightSteps: 1,
    maximumStraightRunSteps: 2,
    roundaboutCount: 3,
    componentTarget: 58,
    largePieceTarget: 18,
    megaPieceTarget: 9,
    embeddedCpuCount: 3,
    deadEndTarget: 7,
    axisVariance: 0.025,
    minimumCorridor: 24,
    targetOccupancy: [0.86, 0.92],
    description: "O circuito máximo: uma matriz 16×9, cinquenta e oito conjuntos PCB, rota extrema e até três rotatórias CPU.",
  },
};

const WALL_PROFILES: WallProfile[] = [
  { id: "rail", label: "PAREDE TRILHO" },
  { id: "elbow", label: "PAREDE COTOVELO" },
  { id: "chip", label: "PAREDE CHIP" },
  { id: "bus", label: "PAREDE BARRAMENTO" },
  { id: "tee", label: "PAREDE DERIVAÇÃO" },
  { id: "stair", label: "PAREDE ESCADA" },
  { id: "channel", label: "PAREDE CANAL" },
  { id: "island", label: "PAREDE ILHA" },
];

const TETRIS_SHAPES: TetrisShape[] = [
  { id: "tetromino-i", tiles: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }] },
  { id: "tetromino-o", tiles: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }] },
  { id: "tetromino-t", tiles: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 1 }] },
  { id: "tetromino-l", tiles: [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 1, y: 2 }] },
  { id: "tetromino-j", tiles: [{ x: 1, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 2 }, { x: 0, y: 2 }] },
  { id: "tetromino-s", tiles: [{ x: 1, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }] },
  { id: "tetromino-z", tiles: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 }] },
  { id: "pentomino-p", tiles: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 0, y: 2 }] },
  { id: "large-i", tiles: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 }, { x: 5, y: 0 }, { x: 6, y: 0 }] },
  { id: "large-o", tiles: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 }] },
  { id: "large-t", tiles: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 }, { x: 2, y: 1 }, { x: 2, y: 2 }] },
  { id: "large-l", tiles: [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 0, y: 3 }, { x: 0, y: 4 }, { x: 1, y: 4 }, { x: 2, y: 4 }, { x: 3, y: 4 }] },
  { id: "large-j", tiles: [{ x: 3, y: 0 }, { x: 3, y: 1 }, { x: 3, y: 2 }, { x: 3, y: 3 }, { x: 0, y: 4 }, { x: 1, y: 4 }, { x: 2, y: 4 }, { x: 3, y: 4 }] },
  { id: "large-s", tiles: [{ x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 }, { x: 5, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }] },
  { id: "large-z", tiles: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 2, y: 1 }, { x: 3, y: 1 }, { x: 4, y: 1 }, { x: 5, y: 1 }] },
  { id: "pcb-bus-6", tiles: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 }, { x: 5, y: 0 }] },
  { id: "pcb-panel-6", tiles: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }] },
  { id: "pcb-elbow-7", tiles: [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 0, y: 3 }, { x: 1, y: 3 }, { x: 2, y: 3 }, { x: 3, y: 3 }] },
  { id: "pcb-tee-7", tiles: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 }, { x: 2, y: 1 }, { x: 2, y: 2 }] },
  { id: "pcb-notch-8", tiles: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 0, y: 2 }, { x: 1, y: 2 }] },
  { id: "pcb-core-9", tiles: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 }] },
];

function normalizeShapeTiles(tiles: Point[]) {
  const minimumX = Math.min(...tiles.map((tile) => tile.x));
  const minimumY = Math.min(...tiles.map((tile) => tile.y));
  return tiles
    .map((tile) => ({ x: tile.x - minimumX, y: tile.y - minimumY }))
    .sort((a, b) => a.y - b.y || a.x - b.x);
}

function rotateShapeTiles(tiles: Point[]) {
  return normalizeShapeTiles(tiles.map((tile) => ({ x: -tile.y, y: tile.x })));
}

function createShapeVariants(shape: TetrisShape) {
  const variants: TetrisShape[] = [];
  let tiles = normalizeShapeTiles(shape.tiles);
  for (let turn = 0; turn < 4; turn += 1) {
    const key = tiles.map((tile) => `${tile.x},${tile.y}`).join(";");
    if (!variants.some((variant) => variant.tiles.map((tile) => `${tile.x},${tile.y}`).join(";") === key)) {
      variants.push({ id: shape.id, tiles });
    }
    tiles = rotateShapeTiles(tiles);
  }
  return variants;
}

function enlargeShape(shape: TetrisShape) {
  return {
    id: `mega-${shape.id}`,
    tiles: shape.tiles.flatMap((tile) => [
      { x: tile.x * 2, y: tile.y * 2 },
      { x: tile.x * 2 + 1, y: tile.y * 2 },
      { x: tile.x * 2, y: tile.y * 2 + 1 },
      { x: tile.x * 2 + 1, y: tile.y * 2 + 1 },
    ]),
  };
}

const MEGA_TETRIS_SHAPES = TETRIS_SHAPES.slice(0, 7).map(enlargeShape);
const CHUNKY_PCB_SHAPES: TetrisShape[] = [
  { id: "mega-pcb-panel", tiles: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }] },
  { id: "mega-pcb-notch", tiles: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }] },
  { id: "mega-pcb-corner", tiles: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 0, y: 2 }, { x: 1, y: 2 }] },
];
const PANEL_SHAPE_VARIANTS = [...TETRIS_SHAPES, ...MEGA_TETRIS_SHAPES, ...CHUNKY_PCB_SHAPES].flatMap(createShapeVariants);

const ACCENTS = ["#58c890", "#43b77f", "#6bd7a0", "#3ea976"];

const INITIAL_RUNTIME: Runtime = {
  phase: 1,
  path: [DEFAULT_START],
  start: DEFAULT_START,
  startServer: DEFAULT_START_SERVER,
  startEdge: "right",
  goal: DEFAULT_GOAL,
  goalEdge: "left",
  entryDirection: DEFAULT_DIRECTION,
  direction: DEFAULT_DIRECTION,
  queuedDirection: DEFAULT_DIRECTION,
  obstacles: [],
  roundabouts: [],
  corridorWidth: { min: 0, max: 0 },
  travelled: 0,
  solutionLength: 0,
  status: "idle",
};

const distanceBetween = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

function touchesGoal(head: Point, goal: Point) {
  return Math.abs(head.x - goal.x) <= SERVER_WIDTH / 2 + SNAKE_HEAD_RADIUS
    && Math.abs(head.y - goal.y) <= SERVER_HEIGHT / 2 + SNAKE_HEAD_RADIUS;
}

function findGoalContactPoint(from: Point, to: Point, goal: Point) {
  if (touchesGoal(from, goal)) return from;
  const deltaX = to.x - from.x;
  const deltaY = to.y - from.y;
  const bounds = {
    minX: goal.x - SERVER_WIDTH / 2 - SNAKE_HEAD_RADIUS,
    maxX: goal.x + SERVER_WIDTH / 2 + SNAKE_HEAD_RADIUS,
    minY: goal.y - SERVER_HEIGHT / 2 - SNAKE_HEAD_RADIUS,
    maxY: goal.y + SERVER_HEIGHT / 2 + SNAKE_HEAD_RADIUS,
  };
  let contactRatio = 0;
  let exitRatio = 1;
  for (const [origin, delta, minimum, maximum] of [
    [from.x, deltaX, bounds.minX, bounds.maxX],
    [from.y, deltaY, bounds.minY, bounds.maxY],
  ] as const) {
    if (Math.abs(delta) < 0.0001) {
      if (origin < minimum || origin > maximum) return null;
      continue;
    }
    const first = (minimum - origin) / delta;
    const second = (maximum - origin) / delta;
    contactRatio = Math.max(contactRatio, Math.min(first, second));
    exitRatio = Math.min(exitRatio, Math.max(first, second));
    if (contactRatio > exitRatio) return null;
  }
  if (contactRatio < 0 || contactRatio > 1) return null;
  return {
    x: from.x + deltaX * contactRatio,
    y: from.y + deltaY * contactRatio,
  };
}

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const next = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[next]] = [copy[next], copy[index]];
  }
  return copy;
}

function pointInsidePolygon(point: Point, polygon: Point[]) {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const a = polygon[index];
    const b = polygon[previous];
    const intersects =
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y || 1) + a.x;
    if (intersects) inside = !inside;
  }
  return inside;
}

function collidesWithObstacles(point: Point, obstacles: Obstacle[], radius: number) {
  const samples = [{ x: 0, y: 0 }];
  for (let index = 0; index < 8; index += 1) {
    const angle = (Math.PI * 2 * index) / 8;
    samples.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
  }
  return obstacles.some((obstacle) => {
    if (
      point.x + radius < obstacle.bounds.x ||
      point.x - radius > obstacle.bounds.x + obstacle.bounds.width ||
      point.y + radius < obstacle.bounds.y ||
      point.y - radius > obstacle.bounds.y + obstacle.bounds.height
    ) return false;
    return samples.some((sample) => pointInsidePolygon({ x: point.x + sample.x, y: point.y + sample.y }, obstacle.points));
  });
}

const CARVE_DIRECTIONS = [
  { column: 0, row: -1, wall: 0, opposite: 2 },
  { column: 1, row: 0, wall: 1, opposite: 3 },
  { column: 0, row: 1, wall: 2, opposite: 0 },
  { column: -1, row: 0, wall: 3, opposite: 1 },
] as const;

function carveDeadEndBranches(
  protectedCells: Set<number>,
  route: number[],
  logicalColumns: number,
  renderColumns: number,
  renderRows: number,
  targetBranches: number,
  forcedBlockedCells: Set<number>,
) {
  const renderCellIndex = (column: number, row: number) => row * renderColumns + column;
  const renderedRoute: number[] = [];
  route.forEach((cell, index) => {
    const column = cell % logicalColumns;
    const row = Math.floor(cell / logicalColumns);
    renderedRoute.push(renderCellIndex(column * 2, row * 2));
    const next = route[index + 1];
    if (next === undefined) return;
    const nextColumn = next % logicalColumns;
    const nextRow = Math.floor(next / logicalColumns);
    renderedRoute.push(renderCellIndex(column + nextColumn, row + nextRow));
  });
  const anchors = shuffle(renderedRoute.slice(5, -5));
  let branchesCreated = 0;

  for (const anchorCell of anchors) {
    if (branchesCreated >= targetBranches) break;
    const anchorColumn = anchorCell % renderColumns;
    const anchorRow = Math.floor(anchorCell / renderColumns);
    const branchLength = 2;

    for (const direction of shuffle([...CARVE_DIRECTIONS])) {
      const branch: number[] = [];
      let valid = true;
      for (let step = 1; step <= branchLength; step += 1) {
        const column = anchorColumn + direction.column * step;
        const row = anchorRow + direction.row * step;
        if (column <= 0 || column >= renderColumns - 1 || row <= 0 || row >= renderRows - 1) {
          valid = false;
          break;
        }
        const cell = renderCellIndex(column, row);
        if (protectedCells.has(cell) || forcedBlockedCells.has(cell)) {
          valid = false;
          break;
        }
        branch.push(cell);
      }
      if (!valid) continue;

      const touchesAnotherCorridor = branch.some((cell, branchIndex) => {
        const column = cell % renderColumns;
        const row = Math.floor(cell / renderColumns);
        const neighbors = [
          column > 0 ? cell - 1 : -1,
          column < renderColumns - 1 ? cell + 1 : -1,
          row > 0 ? cell - renderColumns : -1,
          row < renderRows - 1 ? cell + renderColumns : -1,
        ];
        return neighbors.some((neighbor) => protectedCells.has(neighbor)
          && !(branchIndex === 0 && neighbor === anchorCell));
      });
      if (touchesAnotherCorridor) continue;

      branch.forEach((cell) => protectedCells.add(cell));
      branchesCreated += 1;
      break;
    }
  }
  return branchesCreated;
}

type MazeEndpoint = {
  index: number;
  edge: BoardEdge;
  region: EndpointRegion;
  inwardDirection: Direction;
};

function getEndpointRegion(index: number, columns: number, rows: number): EndpointRegion {
  const column = index % columns;
  const row = Math.floor(index / columns);
  const horizontal = column < columns / 2 ? "left" : "right";
  const vertical = row < rows / 2 ? "upper" : "lower";
  return `${vertical}-${horizontal}` as EndpointRegion;
}

function selectMazeEndpoints(columns: number, rows: number) {
  const endpointCandidates = [
    ...Array.from({ length: columns - 2 }, (_, offset) => ({
      index: offset + 1,
      edge: "top" as const,
      inwardDirection: { x: 0, y: 1 },
    })),
    ...Array.from({ length: rows - 2 }, (_, offset) => ({
      index: (offset + 1) * columns + columns - 1,
      edge: "right" as const,
      inwardDirection: { x: -1, y: 0 },
    })),
    ...Array.from({ length: columns - 2 }, (_, offset) => ({
      index: (rows - 1) * columns + offset + 1,
      edge: "bottom" as const,
      inwardDirection: { x: 0, y: -1 },
    })),
    ...Array.from({ length: rows - 2 }, (_, offset) => ({
      index: (offset + 1) * columns,
      edge: "left" as const,
      inwardDirection: { x: 1, y: 0 },
    })),
  ];
  const endpoints: MazeEndpoint[] = endpointCandidates.map((endpoint) => ({
    ...endpoint,
    region: getEndpointRegion(endpoint.index, columns, rows),
  }));
  const start = shuffle(endpoints)[0];
  const startColumn = start.index % columns;
  const startRow = Math.floor(start.index / columns);
  const minimumSeparation = Math.floor((columns + rows) * 0.55);
  const distantGoals = endpoints.filter((endpoint) => {
    if (endpoint.edge === start.edge || endpoint.index === start.index || endpoint.region === start.region) return false;
    const column = endpoint.index % columns;
    const row = Math.floor(endpoint.index / columns);
    return Math.abs(column - startColumn) + Math.abs(row - startRow) >= minimumSeparation;
  });
  const fallbackGoals = endpoints.filter((endpoint) => (
    endpoint.edge !== start.edge
    && endpoint.index !== start.index
    && endpoint.region !== start.region
  ));
  const goal = shuffle(distantGoals.length ? distantGoals : fallbackGoals)[0];
  return { start, goal };
}

function carveMaze(
  columns: number,
  rows: number,
  startIndex: number,
  initialStraightSteps = 0,
  maximumStraightRunSteps = Number.POSITIVE_INFINITY,
  forcedInitialDirection?: Direction,
) {
  const cells: MazeCell[] = Array.from({ length: columns * rows }, () => ({
    visited: false,
    walls: [true, true, true, true],
  }));
  const stack = [startIndex];
  const lockedInitialCells = new Set<number>();
  const arrivalDirections: Array<{ column: number; row: number } | undefined> = Array(columns * rows);
  const straightRunLengths = Array(columns * rows).fill(0) as number[];
  cells[startIndex].visited = true;

  const connect = (currentIndex: number, direction: (typeof CARVE_DIRECTIONS)[number]) => {
    const column = currentIndex % columns;
    const row = Math.floor(currentIndex / columns);
    const nextIndex = (row + direction.row) * columns + column + direction.column;
    cells[currentIndex].walls[direction.wall] = false;
    cells[nextIndex].walls[direction.opposite] = false;
    cells[nextIndex].visited = true;
    const previousDirection = arrivalDirections[currentIndex];
    const continuesStraight = previousDirection?.column === direction.column
      && previousDirection.row === direction.row;
    arrivalDirections[nextIndex] = { column: direction.column, row: direction.row };
    straightRunLengths[nextIndex] = continuesStraight ? straightRunLengths[currentIndex] + 1 : 1;
    stack.push(nextIndex);
    return nextIndex;
  };

  if (initialStraightSteps > 0) {
    const startColumn = startIndex % columns;
    const startRow = Math.floor(startIndex / columns);
    const straightCandidates = shuffle(CARVE_DIRECTIONS.filter((direction) => {
      if (
        forcedInitialDirection
        && (direction.column !== forcedInitialDirection.x || direction.row !== forcedInitialDirection.y)
      ) return false;
      const endColumn = startColumn + direction.column * initialStraightSteps;
      const endRow = startRow + direction.row * initialStraightSteps;
      if (endColumn < 0 || endColumn >= columns || endRow < 0 || endRow >= rows) return false;
      return CARVE_DIRECTIONS.some((turn) => {
        if (turn.column * direction.column + turn.row * direction.row !== 0) return false;
        const turnColumn = endColumn + turn.column;
        const turnRow = endRow + turn.row;
        return turnColumn >= 0 && turnColumn < columns && turnRow >= 0 && turnRow < rows;
      });
    }));
    const straightDirection = straightCandidates[0];
    if (straightDirection) {
      let currentIndex = startIndex;
      for (let step = 0; step < initialStraightSteps; step += 1) {
        lockedInitialCells.add(currentIndex);
        currentIndex = connect(currentIndex, straightDirection);
      }
      lockedInitialCells.add(currentIndex);
      const endColumn = currentIndex % columns;
      const endRow = Math.floor(currentIndex / columns);
      const turnCandidates = shuffle(CARVE_DIRECTIONS.filter((turn) => {
        if (turn.column * straightDirection.column + turn.row * straightDirection.row !== 0) return false;
        const turnColumn = endColumn + turn.column;
        const turnRow = endRow + turn.row;
        return turnColumn >= 0 && turnColumn < columns && turnRow >= 0 && turnRow < rows
          && !cells[turnRow * columns + turnColumn].visited;
      }));
      if (turnCandidates[0]) connect(currentIndex, turnCandidates[0]);
    }
  }

  while (stack.length) {
    const currentIndex = stack[stack.length - 1];
    if (lockedInitialCells.has(currentIndex)) {
      stack.pop();
      continue;
    }
    const column = currentIndex % columns;
    const row = Math.floor(currentIndex / columns);
    const candidates = shuffle(CARVE_DIRECTIONS.filter((direction) => {
      const previousDirection = arrivalDirections[currentIndex];
      const continuesStraight = previousDirection?.column === direction.column
        && previousDirection.row === direction.row;
      if (continuesStraight && straightRunLengths[currentIndex] >= maximumStraightRunSteps) return false;
      const nextColumn = column + direction.column;
      const nextRow = row + direction.row;
      return nextColumn >= 0 && nextColumn < columns && nextRow >= 0 && nextRow < rows && !cells[nextRow * columns + nextColumn].visited;
    }));

    if (!candidates.length) {
      stack.pop();
      continue;
    }

    connect(currentIndex, candidates[0]);
  }

  return cells;
}

function findMazePath(cells: MazeCell[], columns: number, startIndex: number, goalIndex: number) {
  const queue = [startIndex];
  const parents = new Map<number, number>();
  const visited = new Set([startIndex]);

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const currentIndex = queue[cursor];
    if (currentIndex === goalIndex) break;
    const column = currentIndex % columns;
    const row = Math.floor(currentIndex / columns);
    CARVE_DIRECTIONS.forEach((direction) => {
      if (cells[currentIndex].walls[direction.wall]) return;
      const nextIndex = (row + direction.row) * columns + column + direction.column;
      if (visited.has(nextIndex)) return;
      visited.add(nextIndex);
      parents.set(nextIndex, currentIndex);
      queue.push(nextIndex);
    });
  }

  const path = [goalIndex];
  while (path[0] !== startIndex) {
    const parent = parents.get(path[0]);
    if (parent === undefined) return [];
    path.unshift(parent);
  }
  return path;
}

function countInitialStraightSteps(path: number[], columns: number) {
  if (path.length < 2) return 0;
  const firstDirection = {
    x: path[1] % columns - path[0] % columns,
    y: Math.floor(path[1] / columns) - Math.floor(path[0] / columns),
  };
  let steps = 1;
  for (let index = 2; index < path.length; index += 1) {
    const direction = {
      x: path[index] % columns - path[index - 1] % columns,
      y: Math.floor(path[index] / columns) - Math.floor(path[index - 1] / columns),
    };
    if (direction.x !== firstDirection.x || direction.y !== firstDirection.y) break;
    steps += 1;
  }
  return steps;
}

function measureStraightRuns(path: number[], columns: number, maximumStraightRunSteps: number) {
  if (path.length < 2) return { longest: 0, excess: 0 };
  const runLengths: number[] = [];
  let currentRun = 1;
  let previousDirection = {
    x: path[1] % columns - path[0] % columns,
    y: Math.floor(path[1] / columns) - Math.floor(path[0] / columns),
  };

  for (let index = 2; index < path.length; index += 1) {
    const direction = {
      x: path[index] % columns - path[index - 1] % columns,
      y: Math.floor(path[index] / columns) - Math.floor(path[index - 1] / columns),
    };
    if (direction.x === previousDirection.x && direction.y === previousDirection.y) {
      currentRun += 1;
      continue;
    }
    runLengths.push(currentRun);
    currentRun = 1;
    previousDirection = direction;
  }
  runLengths.push(currentRun);

  return {
    longest: Math.max(...runLengths),
    excess: runLengths.reduce((sum, length) => sum + Math.max(0, length - maximumStraightRunSteps), 0),
  };
}

function openRoundabout(cells: MazeCell[], columns: number, column: number, row: number) {
  const index = (columnOffset: number, rowOffset: number) => (row + rowOffset) * columns + column + columnOffset;
  const topLeft = index(0, 0);
  const topMiddle = index(1, 0);
  const topRight = index(2, 0);
  const middleLeft = index(0, 1);
  const center = index(1, 1);
  const middleRight = index(2, 1);
  const bottomLeft = index(0, 2);
  const bottomMiddle = index(1, 2);
  const bottomRight = index(2, 2);
  const connect = (from: number, to: number, wall: 0 | 1 | 2 | 3, opposite: 0 | 1 | 2 | 3) => {
    cells[from].walls[wall] = false;
    cells[to].walls[opposite] = false;
  };

  cells[center].walls = [true, true, true, true];
  cells[topMiddle].walls[2] = true;
  cells[middleRight].walls[3] = true;
  cells[bottomMiddle].walls[0] = true;
  cells[middleLeft].walls[1] = true;

  connect(topLeft, topMiddle, 1, 3);
  connect(topMiddle, topRight, 1, 3);
  connect(topRight, middleRight, 2, 0);
  connect(middleRight, bottomRight, 2, 0);
  connect(bottomRight, bottomMiddle, 3, 1);
  connect(bottomMiddle, bottomLeft, 3, 1);
  connect(bottomLeft, middleLeft, 0, 2);
  connect(middleLeft, topLeft, 0, 2);
  return [topLeft, topMiddle, topRight, middleLeft, center, middleRight, bottomLeft, bottomMiddle, bottomRight];
}

function addRoundaboutLoops(
  cells: MazeCell[],
  columns: number,
  rows: number,
  startIndex: number,
  goalIndex: number,
  count: number,
  minimumPathLength: number,
  maximumStraightRunSteps = Number.POSITIVE_INFINITY,
) {
  const candidates = shuffle(Array.from({ length: (columns - 2) * (rows - 2) }, (_, index) => ({
    column: index % (columns - 2),
    row: Math.floor(index / (columns - 2)),
  })));
  const selected: Array<{ column: number; row: number; cells: number[] }> = [];
  const startColumn = startIndex % columns;
  const startRow = Math.floor(startIndex / columns);
  let path = findMazePath(cells, columns, startIndex, goalIndex);

  for (const candidate of candidates) {
    if (selected.length >= count) break;
    if (selected.some((loop) => Math.abs(loop.column - candidate.column) <= 2 && Math.abs(loop.row - candidate.row) <= 2)) continue;
    if (candidate.row === 0 || candidate.column + 2 === columns - 1) continue;
    const loopCenterDistance = Math.abs(candidate.column + 1 - startColumn) + Math.abs(candidate.row + 1 - startRow);
    if (loopCenterDistance <= 2) continue;
    const indexes = Array.from({ length: 9 }, (_, index) =>
      (candidate.row + Math.floor(index / 3)) * columns + candidate.column + index % 3);
    if (indexes.includes(startIndex) || indexes.includes(goalIndex)) continue;
    const previousWalls = indexes.map((index) => [...cells[index].walls] as MazeCell["walls"]);
    openRoundabout(cells, columns, candidate.column, candidate.row);
    const nextPath = findMazePath(cells, columns, startIndex, goalIndex);
    if (
      nextPath.length < minimumPathLength
      || measureStraightRuns(nextPath, columns, maximumStraightRunSteps).longest > maximumStraightRunSteps
    ) {
      indexes.forEach((index, position) => { cells[index].walls = previousWalls[position]; });
      continue;
    }
    path = nextPath;
    selected.push({ ...candidate, cells: indexes });
  }

  return { selected, path };
}

function randomAxisSizes(count: number, total: number, variance: number, minimumSize: number) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const weights = Array.from({ length: count }, () => 1 - variance + Math.random() * variance * 2);
    const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
    const sizes = weights.map((weight) => total * weight / weightTotal);
    if (Math.min(...sizes) >= minimumSize) return sizes;
  }
  return Array.from({ length: count }, () => total / count);
}

function axisOffsets(sizes: number[]) {
  const offsets = [0];
  sizes.forEach((size) => offsets.push(offsets[offsets.length - 1] + size));
  return offsets;
}

function rectanglePoints(bounds: Obstacle["bounds"]) {
  return [
    { x: bounds.x, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
    { x: bounds.x, y: bounds.y + bounds.height },
  ];
}

function chamferedRectanglePoints(bounds: Obstacle["bounds"], cut: number, corners: ChamferCorners) {
  const amount = Math.min(cut, bounds.width * 0.22, bounds.height * 0.22);
  const points: Point[] = [];
  if (corners.topLeft) points.push({ x: bounds.x + amount, y: bounds.y });
  else points.push({ x: bounds.x, y: bounds.y });
  if (corners.topRight) {
    points.push({ x: bounds.x + bounds.width - amount, y: bounds.y });
    points.push({ x: bounds.x + bounds.width, y: bounds.y + amount });
  } else points.push({ x: bounds.x + bounds.width, y: bounds.y });
  if (corners.bottomRight) {
    points.push({ x: bounds.x + bounds.width, y: bounds.y + bounds.height - amount });
    points.push({ x: bounds.x + bounds.width - amount, y: bounds.y + bounds.height });
  } else points.push({ x: bounds.x + bounds.width, y: bounds.y + bounds.height });
  if (corners.bottomLeft) {
    points.push({ x: bounds.x + amount, y: bounds.y + bounds.height });
    points.push({ x: bounds.x, y: bounds.y + bounds.height - amount });
  } else points.push({ x: bounds.x, y: bounds.y + bounds.height });
  if (corners.topLeft) points.push({ x: bounds.x, y: bounds.y + amount });
  return points;
}

function roundedRectanglePoints(bounds: Obstacle["bounds"], radius: number) {
  const points: Point[] = [];
  const corners = [
    { x: bounds.x + bounds.width - radius, y: bounds.y + radius, start: -Math.PI / 2 },
    { x: bounds.x + bounds.width - radius, y: bounds.y + bounds.height - radius, start: 0 },
    { x: bounds.x + radius, y: bounds.y + bounds.height - radius, start: Math.PI / 2 },
    { x: bounds.x + radius, y: bounds.y + radius, start: Math.PI },
  ];
  corners.forEach((corner) => {
    for (let step = 0; step <= 3; step += 1) {
      const angle = corner.start + step * Math.PI / 6;
      points.push({ x: corner.x + Math.cos(angle) * radius, y: corner.y + Math.sin(angle) * radius });
    }
  });
  return points;
}

function buildPanelGroups(
  blockedCells: number[],
  columns: number,
  rows: number,
  componentTarget: number,
  largePieceTarget: number,
  megaPieceTarget: number,
) {
  const remaining = new Set(blockedCells);
  const groups: PanelGroup[] = [];
  const shapeUseCount = new Map<string, number>();
  const placedCells: number[] = [];

  while (remaining.size && groups.length < componentTarget) {
    const groupsLeft = componentTarget - groups.length;
    const idealSize = Math.max(4, Math.min(7, Math.round(remaining.size / (groupsLeft * 1.35))));
    const prioritizeMegaPiece = groups.filter((group) => group.id.startsWith("mega-")).length < megaPieceTarget;
    const prioritizeLargePiece = groups.filter((group) => group.id.startsWith("large-")).length < largePieceTarget;
    const variants = shuffle(PANEL_SHAPE_VARIANTS).sort((a, b) => {
      const aDistance = Math.abs(a.tiles.length - idealSize);
      const bDistance = Math.abs(b.tiles.length - idealSize);
      const aUses = shapeUseCount.get(a.id) ?? 0;
      const bUses = shapeUseCount.get(b.id) ?? 0;
      return aUses - bUses || aDistance - bDistance || b.tiles.length - a.tiles.length;
    });
    let selected: { id: string; cells: number[] } | undefined;

    const seedIndexes = shuffle([...remaining]);
    if (placedCells.length) {
      seedIndexes.sort((a, b) => {
        const distanceFromPlaced = (cell: number) => {
          const column = cell % columns;
          const row = Math.floor(cell / columns);
          return Math.min(...placedCells.map((placed) =>
            Math.abs(placed % columns - column) + Math.abs(Math.floor(placed / columns) - row)));
        };
        return distanceFromPlaced(b) - distanceFromPlaced(a);
      });
    }

    const variantPasses = groups.length === 0
      ? [
        variants.filter((variant) => variant.tiles.length === 5),
        variants.filter((variant) => variant.id !== "tetromino-o"),
      ]
      : prioritizeMegaPiece
        ? [variants.filter((variant) => variant.id.startsWith("mega-")), variants]
        : prioritizeLargePiece
          ? [variants.filter((variant) => variant.id.startsWith("large-")), variants]
          : [variants];
    for (const variantPass of variantPasses) {
      for (const seedIndex of seedIndexes) {
        const seedColumn = seedIndex % columns;
        const seedRow = Math.floor(seedIndex / columns);
        for (const variant of variantPass) {
          for (const anchor of variant.tiles) {
            const originColumn = seedColumn - anchor.x;
            const originRow = seedRow - anchor.y;
            const cells = variant.tiles.map((tile) =>
              (originRow + tile.y) * columns + originColumn + tile.x);
            const insideBoard = variant.tiles.every((tile) =>
              originColumn + tile.x >= 0 &&
              originColumn + tile.x < columns &&
              originRow + tile.y >= 0 &&
              originRow + tile.y < rows);
            if (!insideBoard || cells.some((cell) => !remaining.has(cell))) continue;
            selected = { id: variant.id, cells };
            break;
          }
          if (selected) break;
        }
        if (selected) break;
      }
      if (selected) break;
    }

    if (!selected) break;
    const group = selected;
    group.cells.forEach((cell) => remaining.delete(cell));
    if (groups.length === 0) {
      const groupCells = new Set(group.cells);
      group.cells.forEach((cell) => {
        const column = cell % columns;
        const neighbors = [
          column > 0 ? cell - 1 : -1,
          column < columns - 1 ? cell + 1 : -1,
          cell - columns,
          cell + columns,
        ];
        neighbors.forEach((neighbor) => {
          if (neighbor >= 0 && neighbor < columns * rows && !groupCells.has(neighbor)) remaining.delete(neighbor);
        });
      });
    }
    placedCells.push(...group.cells);
    groups.push(group);
    shapeUseCount.set(group.id, (shapeUseCount.get(group.id) ?? 0) + 1);
  }

  return groups;
}

function buildPanelAssemblyIds(groups: PanelGroup[], columns: number) {
  const cellOwners = new Map<number, number>();
  groups.forEach((group, groupIndex) => group.cells.forEach((cell) => cellOwners.set(cell, groupIndex)));
  const adjacentPairs = new Map<string, [number, number]>();
  groups.forEach((group, groupIndex) => {
    group.cells.forEach((cell) => {
      const column = cell % columns;
      const neighbors = [column < columns - 1 ? cell + 1 : -1, cell + columns];
      neighbors.forEach((neighbor) => {
        const neighborGroup = cellOwners.get(neighbor);
        if (neighborGroup === undefined || neighborGroup === groupIndex) return;
        const pair = [Math.min(groupIndex, neighborGroup), Math.max(groupIndex, neighborGroup)] as [number, number];
        adjacentPairs.set(`${pair[0]}-${pair[1]}`, pair);
      });
    });
  });

  const parents = groups.map((_, index) => index);
  const find = (index: number): number => parents[index] === index ? index : (parents[index] = find(parents[index]));
  for (const [left, right] of adjacentPairs.values()) {
    const leftRoot = find(left);
    const rightRoot = find(right);
    if (leftRoot === rightRoot) continue;
    parents[rightRoot] = leftRoot;
  }

  return groups.map((_, index) => `pcb-assembly-${find(index)}`);
}

function generateMazeLayout(phase: PhaseNumber): MazeLayout {
  const config = PHASES[phase];
  const endpoints = selectMazeEndpoints(config.columns, config.rows);
  const startIndex = endpoints.start.index;
  const goalIndex = endpoints.goal.index;
  let bestCells: MazeCell[] = [];
  let bestPath: number[] = [];
  let loopResult: ReturnType<typeof addRoundaboutLoops> = { selected: [], path: [] };
  let bestScore = Number.NEGATIVE_INFINITY;

  for (let attempt = 0; attempt < 240; attempt += 1) {
    const cells = carveMaze(
      config.columns,
      config.rows,
      startIndex,
      config.minimumInitialStraightSteps,
      config.maximumStraightRunSteps,
      endpoints.start.inwardDirection,
    );
    const path = findMazePath(cells, config.columns, startIndex, goalIndex);
    const candidateLoops = path.length >= config.minimumSolutionCells
      ? addRoundaboutLoops(
        cells,
        config.columns,
        config.rows,
        startIndex,
        goalIndex,
        config.roundaboutCount,
        config.minimumLoopSolutionCells,
        config.maximumStraightRunSteps,
      )
      : { selected: [], path };
    const initialStraightSteps = countInitialStraightSteps(candidateLoops.path, config.columns);
    const straightRuns = measureStraightRuns(
      candidateLoops.path,
      config.columns,
      config.maximumStraightRunSteps,
    );
    const score = candidateLoops.selected.length * 100_000
      - Math.abs(candidateLoops.path.length - config.targetSolutionCells)
      - Math.max(0, config.minimumInitialStraightSteps - initialStraightSteps) * 10_000
      - Math.max(0, initialStraightSteps - config.maximumInitialStraightSteps) * 10_000
      - straightRuns.excess * 5_000
      - Math.max(0, straightRuns.longest - config.maximumStraightRunSteps) * 2_000;
    if (score > bestScore) {
      bestScore = score;
      bestCells = cells;
      bestPath = candidateLoops.path;
      loopResult = candidateLoops;
    }
    if (
      candidateLoops.selected.length === config.roundaboutCount
      && Math.abs(candidateLoops.path.length - config.targetSolutionCells) <= 2
      && initialStraightSteps >= config.minimumInitialStraightSteps
      && initialStraightSteps <= config.maximumInitialStraightSteps
      && straightRuns.longest <= config.maximumStraightRunSteps
    ) break;
  }

  if (!bestCells.length) {
    bestCells = carveMaze(
      config.columns,
      config.rows,
      startIndex,
      config.minimumInitialStraightSteps,
      config.maximumStraightRunSteps,
      endpoints.start.inwardDirection,
    );
    bestPath = findMazePath(bestCells, config.columns, startIndex, goalIndex);
    loopResult = addRoundaboutLoops(
      bestCells,
      config.columns,
      config.rows,
      startIndex,
      goalIndex,
      config.roundaboutCount,
      0,
      config.maximumStraightRunSteps,
    );
    bestPath = loopResult.path;
  }

  const wallThickness = config.wallThickness;
  const innerX = MAZE_BOUNDS.x + wallThickness;
  const innerY = MAZE_BOUNDS.y + wallThickness;
  const innerWidth = MAZE_BOUNDS.width - wallThickness * 2;
  const innerHeight = MAZE_BOUNDS.height - wallThickness * 2;
  const renderColumns = config.columns * 2 - 1;
  const renderRows = config.rows * 2 - 1;
  const columnWidths = randomAxisSizes(
    renderColumns,
    innerWidth,
    config.axisVariance,
    config.minimumCorridor,
  );
  const rowHeights = randomAxisSizes(
    renderRows,
    innerHeight,
    config.axisVariance,
    config.minimumCorridor,
  );
  const columnOffsets = axisOffsets(columnWidths);
  const rowOffsets = axisOffsets(rowHeights);
  const renderColumnCenters = columnWidths.map((width, index) => innerX + columnOffsets[index] + width / 2);
  const renderRowCenters = rowHeights.map((height, index) => innerY + rowOffsets[index] + height / 2);
  const columnCenters = Array.from({ length: config.columns }, (_, index) => renderColumnCenters[index * 2]);
  const rowCenters = Array.from({ length: config.rows }, (_, index) => renderRowCenters[index * 2]);
  const startServer = {
    x: columnCenters[startIndex % config.columns],
    y: rowCenters[Math.floor(startIndex / config.columns)],
  };
  const goal = {
    x: columnCenters[goalIndex % config.columns],
    y: rowCenters[Math.floor(goalIndex / config.columns)],
  };
  const nextIndex = bestPath[1] ?? startIndex - 1;
  const pathInitialDirection = {
    x: Math.sign((nextIndex % config.columns) - (startIndex % config.columns)),
    y: Math.sign(Math.floor(nextIndex / config.columns) - Math.floor(startIndex / config.columns)),
  };
  const initialDirection = pathInitialDirection.x || pathInitialDirection.y
    ? pathInitialDirection
    : endpoints.start.inwardDirection;
  const start = {
    x: startServer.x + initialDirection.x * SERVER_WIDTH / 2,
    y: startServer.y + initialDirection.y * SERVER_HEIGHT / 2,
  };
  const borderWalls: Array<{ id: string; bounds: Obstacle["bounds"] }> = [
    { id: "border-top", bounds: { x: MAZE_BOUNDS.x, y: MAZE_BOUNDS.y, width: MAZE_BOUNDS.width, height: wallThickness } },
    { id: "border-bottom", bounds: { x: MAZE_BOUNDS.x, y: MAZE_BOUNDS.y + MAZE_BOUNDS.height - wallThickness, width: MAZE_BOUNDS.width, height: wallThickness } },
    { id: "border-left", bounds: { x: MAZE_BOUNDS.x, y: MAZE_BOUNDS.y, width: wallThickness, height: MAZE_BOUNDS.height } },
    { id: "border-right", bounds: { x: MAZE_BOUNDS.x + MAZE_BOUNDS.width - wallThickness, y: MAZE_BOUNDS.y, width: wallThickness, height: MAZE_BOUNDS.height } },
  ];
  const profiles = shuffle(WALL_PROFILES);
  const obstacles: Obstacle[] = borderWalls.map((wall, index) => {
    const profile = profiles[index % profiles.length];
    return {
      id: wall.id,
      templateId: profile.id,
      label: profile.label,
      points: rectanglePoints(wall.bounds),
      bounds: wall.bounds,
      accent: ACCENTS[(index + phase) % ACCENTS.length],
      detailSeed: Math.floor(Math.random() * 10_000),
      kind: "border",
    };
  });

  const renderCellIndex = (column: number, row: number) => row * renderColumns + column;
  const protectedCells = new Set<number>();
  bestPath.forEach((cellIndex, pathIndex) => {
    const column = cellIndex % config.columns;
    const row = Math.floor(cellIndex / config.columns);
    const renderColumn = column * 2;
    const renderRow = row * 2;
    protectedCells.add(renderCellIndex(renderColumn, renderRow));
    const nextCell = bestPath[pathIndex + 1];
    if (nextCell !== undefined) {
      const nextColumn = nextCell % config.columns;
      const nextRow = Math.floor(nextCell / config.columns);
      protectedCells.add(renderCellIndex(column + nextColumn, row + nextRow));
    }
  });

  loopResult.selected.forEach((loop) => {
    const ring = [
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 1 },
      { x: 2, y: 2 }, { x: 1, y: 2 }, { x: 0, y: 2 }, { x: 0, y: 1 },
    ];
    ring.forEach((point, index) => {
      const next = ring[(index + 1) % ring.length];
      const column = (loop.column + point.x) * 2;
      const row = (loop.row + point.y) * 2;
      const nextColumn = (loop.column + next.x) * 2;
      const nextRow = (loop.row + next.y) * 2;
      protectedCells.add(renderCellIndex(column, row));
      protectedCells.add(renderCellIndex((column + nextColumn) / 2, (row + nextRow) / 2));
    });
    protectedCells.add(renderCellIndex((loop.column + 1) * 2, (loop.row + 1) * 2));
  });

  const startRenderColumn = (startIndex % config.columns) * 2;
  const startRenderRow = Math.floor(startIndex / config.columns) * 2;
  const initialStraightSteps = countInitialStraightSteps(bestPath, config.columns);
  const minimumDeflectorDistance = Math.max(
    initialStraightSteps * 2 + 1,
    SPAWN_CLEARANCE_LENGTH + 2,
  );
  const maximumDeflectorDistance = initialDirection.x > 0
    ? renderColumns - 1 - startRenderColumn
    : initialDirection.x < 0
      ? startRenderColumn
      : initialDirection.y > 0
        ? renderRows - 1 - startRenderRow
        : startRenderRow;
  let deflectorDistance = minimumDeflectorDistance;
  while (deflectorDistance <= maximumDeflectorDistance) {
    const column = startRenderColumn + initialDirection.x * deflectorDistance;
    const row = startRenderRow + initialDirection.y * deflectorDistance;
    if (!protectedCells.has(renderCellIndex(column, row))) break;
    deflectorDistance += 1;
  }
  const deflectorColumn = startRenderColumn + initialDirection.x * deflectorDistance;
  const deflectorRow = startRenderRow + initialDirection.y * deflectorDistance;
  const deflectorCell = deflectorDistance <= maximumDeflectorDistance
    ? renderCellIndex(deflectorColumn, deflectorRow)
    : null;
  const forcedBlockedCells = new Set<number>(deflectorCell === null ? [] : [deflectorCell]);
  const perpendicularDirection = { x: -initialDirection.y, y: initialDirection.x };
  for (let forward = 0; forward <= SPAWN_CLEARANCE_LENGTH; forward += 1) {
    for (let lateral = -SPAWN_CLEARANCE_HALF_WIDTH; lateral <= SPAWN_CLEARANCE_HALF_WIDTH; lateral += 1) {
      const column = startRenderColumn + initialDirection.x * forward + perpendicularDirection.x * lateral;
      const row = startRenderRow + initialDirection.y * forward + perpendicularDirection.y * lateral;
      if (column < 0 || column >= renderColumns || row < 0 || row >= renderRows) continue;
      const cell = renderCellIndex(column, row);
      if (cell !== deflectorCell) protectedCells.add(cell);
    }
  }

  const renderCellCount = renderColumns * renderRows;
  const targetOccupancy = config.targetOccupancy[0]
    + Math.random() * (config.targetOccupancy[1] - config.targetOccupancy[0]);
  const targetBlockedCells = Math.floor(renderCellCount * targetOccupancy);
  while (renderCellCount - protectedCells.size > targetBlockedCells) {
    const frontier = new Set<number>();
    protectedCells.forEach((cell) => {
      const column = cell % renderColumns;
      const row = Math.floor(cell / renderColumns);
      if (column > 0 && !protectedCells.has(cell - 1) && !forcedBlockedCells.has(cell - 1)) frontier.add(cell - 1);
      if (column < renderColumns - 1 && !protectedCells.has(cell + 1) && !forcedBlockedCells.has(cell + 1)) frontier.add(cell + 1);
      if (row > 0 && !protectedCells.has(cell - renderColumns) && !forcedBlockedCells.has(cell - renderColumns)) frontier.add(cell - renderColumns);
      if (row < renderRows - 1 && !protectedCells.has(cell + renderColumns) && !forcedBlockedCells.has(cell + renderColumns)) frontier.add(cell + renderColumns);
    });
    if (!frontier.size) break;
    const cellsNeeded = renderCellCount - protectedCells.size - targetBlockedCells;
    shuffle([...frontier]).slice(0, cellsNeeded).forEach((cell) => protectedCells.add(cell));
  }

  const deadEndBranches = carveDeadEndBranches(
    protectedCells,
    bestPath,
    config.columns,
    renderColumns,
    renderRows,
    config.deadEndTarget,
    forcedBlockedCells,
  );

  const blockedCells = Array.from({ length: renderCellCount }, (_, index) => index)
    .filter((index) => !protectedCells.has(index) && !forcedBlockedCells.has(index));
  const panelGroups = buildPanelGroups(
    blockedCells,
    renderColumns,
    renderRows,
    config.componentTarget,
    config.largePieceTarget,
    config.megaPieceTarget,
  );
  const assemblyIds = buildPanelAssemblyIds(panelGroups, renderColumns);
  const assemblyCells = new Map<string, Set<number>>();
  panelGroups.forEach((group, groupIndex) => {
    const assemblyId = assemblyIds[groupIndex];
    const cells = assemblyCells.get(assemblyId) ?? new Set<number>();
    group.cells.forEach((cell) => cells.add(cell));
    assemblyCells.set(assemblyId, cells);
  });
  const groupObstacles: Obstacle[] = panelGroups.flatMap((group, groupIndex) => {
    const assemblyId = assemblyIds[groupIndex];
    const bodyCells = assemblyCells.get(assemblyId) ?? new Set(group.cells);
    const gap = phase === 3
      ? 2.1 + (groupIndex % 3) * 0.2
      : 3.4 + (groupIndex % 3) * 0.3;
    const profile = profiles[(groupIndex + 4) % profiles.length];
    return group.cells.map((cellIndex, tileIndex) => {
      const column = cellIndex % renderColumns;
      const row = Math.floor(cellIndex / renderColumns);
      const hasLeft = column > 0 && bodyCells.has(cellIndex - 1);
      const hasRight = column < renderColumns - 1 && bodyCells.has(cellIndex + 1);
      const hasTop = row > 0 && bodyCells.has(cellIndex - renderColumns);
      const hasBottom = row < renderRows - 1 && bodyCells.has(cellIndex + renderColumns);
      const left = innerX + columnOffsets[column] + (hasLeft ? 0 : gap);
      const right = innerX + columnOffsets[column + 1] - (hasRight ? 0 : gap);
      const top = innerY + rowOffsets[row] + (hasTop ? 0 : gap);
      const bottom = innerY + rowOffsets[row + 1] - (hasBottom ? 0 : gap);
      const bounds = { x: left, y: top, width: right - left, height: bottom - top };
      const chamferEnabled = groupIndex % 4 !== 3;
      const shouldCut = (cornerIndex: number) => chamferEnabled && (groupIndex * 5 + tileIndex * 3 + cornerIndex) % 3 !== 0;
      const corners: ChamferCorners = {
        topLeft: !hasLeft && !hasTop && shouldCut(0),
        topRight: !hasRight && !hasTop && shouldCut(1),
        bottomRight: !hasRight && !hasBottom && shouldCut(2),
        bottomLeft: !hasLeft && !hasBottom && shouldCut(3),
      };
      return {
        id: `tetris-${group.id}-group-${groupIndex}-tile-${tileIndex}`,
        templateId: profile.id,
        label: `MÓDULO ${group.id.toUpperCase()}`,
        points: chamferedRectanglePoints(bounds, 5, corners),
        bounds,
        accent: ACCENTS[(groupIndex + phase) % ACCENTS.length],
        detailSeed: Math.floor(Math.random() * 10_000),
        kind: "module" as const,
        assemblyId,
      };
    });
  });
  obstacles.push(...groupObstacles);

  if (deflectorCell !== null) {
    const deflectorGap = 2.2;
    const connectsTopBorder = deflectorRow === 0;
    const connectsRightBorder = deflectorColumn === renderColumns - 1;
    const deflectorLeft = innerX + columnOffsets[deflectorColumn] + deflectorGap;
    const deflectorRight = innerX + columnOffsets[deflectorColumn + 1] - (connectsRightBorder ? -1 : deflectorGap);
    const deflectorTop = innerY + rowOffsets[deflectorRow] + (connectsTopBorder ? -1 : deflectorGap);
    const deflectorBottom = innerY + rowOffsets[deflectorRow + 1] - deflectorGap;
    const deflectorBounds = {
      x: deflectorLeft,
      y: deflectorTop,
      width: deflectorRight - deflectorLeft,
      height: deflectorBottom - deflectorTop,
    };
    obstacles.push({
      id: "start-deflector",
      templateId: "channel",
      label: "DEFLETOR DE ENTRADA",
      points: chamferedRectanglePoints(deflectorBounds, 5, {
        topLeft: connectsRightBorder,
        topRight: false,
        bottomRight: connectsTopBorder,
        bottomLeft: true,
      }),
      bounds: deflectorBounds,
      accent: ACCENTS[(phase + 1) % ACCENTS.length],
      detailSeed: Math.floor(Math.random() * 10_000),
      kind: "module",
    });
  }

  const roundabouts: Roundabout[] = loopResult.selected.map((loop, index) => {
    const left = columnCenters[loop.column];
    const right = columnCenters[loop.column + 2];
    const top = rowCenters[loop.row];
    const bottom = rowCenters[loop.row + 2];
    return {
      id: `roundabout-${index}`,
      x: left,
      y: top,
      width: right - left,
      height: bottom - top,
      radius: 5,
    };
  });

  const roundaboutCpuObstacles: Obstacle[] = loopResult.selected.map((loop, index) => {
    const centerX = columnCenters[loop.column + 1];
    const centerY = rowCenters[loop.row + 1];
    const renderColumn = (loop.column + 1) * 2;
    const renderRow = (loop.row + 1) * 2;
    const size = Math.min(58, columnWidths[renderColumn] * 1.38, rowHeights[renderRow] * 1.38);
    const bounds = { x: centerX - size / 2, y: centerY - size / 2, width: size, height: size };
    return {
      id: `cpu-roundabout-${index}`,
      templateId: "cpu-core",
      label: "NÚCLEO CPU",
      points: roundedRectanglePoints(bounds, 6),
      bounds,
      accent: OBSTACLE_DETAIL_HEX,
      detailSeed: Math.floor(Math.random() * 10_000),
      kind: "cpu",
      cornerRadius: 6,
    };
  });

  const embeddedCpuObstacles: Obstacle[] = [...panelGroups]
    .filter((group) => group.cells.length >= 4)
    .sort((a, b) => b.cells.length - a.cells.length)
    .slice(0, config.embeddedCpuCount)
    .map((group, index) => {
      const centerColumn = group.cells.reduce((sum, cell) => sum + cell % renderColumns, 0) / group.cells.length;
      const centerRow = group.cells.reduce((sum, cell) => sum + Math.floor(cell / renderColumns), 0) / group.cells.length;
      const cellIndex = [...group.cells].sort((a, b) => {
        const aDistance = Math.hypot(a % renderColumns - centerColumn, Math.floor(a / renderColumns) - centerRow);
        const bDistance = Math.hypot(b % renderColumns - centerColumn, Math.floor(b / renderColumns) - centerRow);
        return aDistance - bDistance;
      })[0];
      const column = cellIndex % renderColumns;
      const row = Math.floor(cellIndex / renderColumns);
      const cpuSize = Math.min(42, columnWidths[column] * 0.78, rowHeights[row] * 0.78);
      const cpuBounds = {
        x: renderColumnCenters[column] - cpuSize / 2,
        y: renderRowCenters[row] - cpuSize / 2,
        width: cpuSize,
        height: cpuSize,
      };
      return {
        id: `tetris-${group.id}-embedded-cpu-${index}`,
        templateId: "cpu-core",
        label: "NÚCLEO CPU",
        points: roundedRectanglePoints(cpuBounds, 5),
        bounds: cpuBounds,
        accent: OBSTACLE_DETAIL_HEX,
        detailSeed: Math.floor(Math.random() * 10_000),
        kind: "cpu" as const,
        cornerRadius: 5,
      };
    });
  obstacles.push(...roundaboutCpuObstacles, ...embeddedCpuObstacles);

  const corridorSizes = [...columnWidths, ...rowHeights];
  const corridorWidth = {
    min: Math.round(Math.min(...corridorSizes)),
    max: Math.round(Math.max(...corridorSizes)),
  };

  const solutionPath = bestPath.map((cellIndex) => ({
    x: columnCenters[cellIndex % config.columns],
    y: rowCenters[Math.floor(cellIndex / config.columns)],
  }));
  solutionPath[0] = start;

  return {
    obstacles,
    start,
    startServer,
    startEdge: endpoints.start.edge,
    startRegion: endpoints.start.region,
    goal,
    goalEdge: endpoints.goal.edge,
    goalRegion: endpoints.goal.region,
    initialDirection,
    solutionPath,
    solutionLength: bestPath.length,
    roundabouts,
    corridorWidth,
    deadEndBranches,
  };
}

function generateMazeSet(): MazeSet {
  return {
    1: generateMazeLayout(1),
    2: generateMazeLayout(2),
    3: generateMazeLayout(3),
  };
}

function boardUnit(seed: number) {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function drawBoardBackground(context: CanvasRenderingContext2D, phase: PhaseNumber) {
  const phaseSeed = phase * 10_000;
  const base = context.createLinearGradient(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
  base.addColorStop(0, "#031810");
  base.addColorStop(0.48, "#02110c");
  base.addColorStop(1, "#010a07");
  context.fillStyle = base;
  context.fillRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);

  const glow = context.createRadialGradient(BOARD_WIDTH * 0.48, BOARD_HEIGHT * 0.44, 0, BOARD_WIDTH / 2, BOARD_HEIGHT / 2, 470);
  glow.addColorStop(0, "rgba(42, 180, 112, .14)");
  glow.addColorStop(0.55, "rgba(12, 86, 55, .06)");
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  context.fillStyle = glow;
  context.fillRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);

  context.save();
  for (let zone = 0; zone < 9; zone += 1) {
    const x = 18 + boardUnit(phaseSeed + zone * 17) * 690;
    const y = 14 + boardUnit(phaseSeed + zone * 23) * 392;
    const width = 68 + boardUnit(phaseSeed + zone * 31) * 150;
    const height = 42 + boardUnit(phaseSeed + zone * 37) * 94;
    context.beginPath();
    context.roundRect(x, y, Math.min(width, BOARD_WIDTH - x - 12), Math.min(height, BOARD_HEIGHT - y - 12), 4);
    context.fillStyle = zone % 2
      ? "rgba(21, 102, 67, .035)"
      : "rgba(57, 158, 103, .028)";
    context.fill();
    context.strokeStyle = "rgba(91, 208, 145, .065)";
    context.stroke();
  }
  context.restore();

  context.lineWidth = 1;
  for (let x = 0; x <= BOARD_WIDTH; x += 12) {
    context.strokeStyle = x % 60 === 0 ? "rgba(72, 184, 127, .12)" : "rgba(72, 184, 127, .035)";
    context.beginPath(); context.moveTo(x, 0); context.lineTo(x, BOARD_HEIGHT); context.stroke();
  }
  for (let y = 0; y <= BOARD_HEIGHT; y += 12) {
    context.strokeStyle = y % 60 === 0 ? "rgba(72, 184, 127, .12)" : "rgba(72, 184, 127, .035)";
    context.beginPath(); context.moveTo(0, y); context.lineTo(BOARD_WIDTH, y); context.stroke();
  }

  context.save();
  context.lineCap = "butt";
  context.lineJoin = "miter";
  for (let cluster = 0; cluster < 104; cluster += 1) {
    const seed = phaseSeed + cluster * 101;
    const horizontal = boardUnit(seed + 1) > 0.36;
    const x = Math.round(12 + boardUnit(seed + 2) * 670);
    const y = Math.round(12 + boardUnit(seed + 3) * 430);
    const span = Math.round(52 + boardUnit(seed + 4) * 142);
    const bend = (boardUnit(seed + 5) > 0.5 ? 1 : -1) * Math.round(8 + boardUnit(seed + 6) * 18);
    const lanes = 1 + Math.floor(boardUnit(seed + 7) * 4);
    for (let lane = 0; lane < lanes; lane += 1) {
      const offset = (lane - (lanes - 1) / 2) * 3.5;
      context.beginPath();
      if (horizontal) {
        const endX = Math.min(BOARD_WIDTH - 10, x + span);
        const turnX = Math.round(x + (endX - x) * 0.54);
        context.moveTo(x, y + offset);
        context.lineTo(turnX, y + offset);
        context.lineTo(turnX, y + bend + offset);
        context.lineTo(endX, y + bend + offset);
      } else {
        const endY = Math.min(BOARD_HEIGHT - 10, y + span);
        const turnY = Math.round(y + (endY - y) * 0.54);
        context.moveTo(x + offset, y);
        context.lineTo(x + offset, turnY);
        context.lineTo(x + bend + offset, turnY);
        context.lineTo(x + bend + offset, endY);
      }
      context.strokeStyle = lane === Math.floor(lanes / 2)
        ? "rgba(124, 244, 181, .28)"
        : "rgba(72, 188, 129, .17)";
      context.lineWidth = lane === Math.floor(lanes / 2) ? 1 : 0.75;
      context.stroke();

      if (lane === Math.floor(lanes / 2) && cluster % 3 === 0) {
        const stubLength = (cluster % 2 === 0 ? 1 : -1) * (10 + boardUnit(seed + 8) * 15);
        context.beginPath();
        if (horizontal) {
          const junctionX = Math.min(BOARD_WIDTH - 12, x + span * 0.68);
          const traceY = y + bend + offset;
          const terminalY = Math.min(BOARD_HEIGHT - 8, Math.max(8, traceY + stubLength));
          context.moveTo(junctionX, traceY);
          context.lineTo(junctionX, terminalY);
          context.stroke();
          context.beginPath();
          context.arc(junctionX, terminalY, 2.1, 0, Math.PI * 2);
        } else {
          const traceX = x + bend + offset;
          const junctionY = Math.min(BOARD_HEIGHT - 12, y + span * 0.68);
          const terminalX = Math.min(BOARD_WIDTH - 8, Math.max(8, traceX + stubLength));
          context.moveTo(traceX, junctionY);
          context.lineTo(terminalX, junctionY);
          context.stroke();
          context.beginPath();
          context.arc(terminalX, junctionY, 2.1, 0, Math.PI * 2);
        }
        context.fillStyle = "rgba(193, 255, 217, .62)";
        context.fill();
      }
    }
  }
  context.restore();

  context.save();
  for (let index = 0; index < 260; index += 1) {
    const seed = phaseSeed + 2_000 + index * 47;
    const x = 10 + boardUnit(seed) * (BOARD_WIDTH - 20);
    const y = 10 + boardUnit(seed + 1) * (BOARD_HEIGHT - 20);
    const radius = index % 7 === 0 ? 2.7 : 1.8;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.strokeStyle = "rgba(133, 249, 188, .29)";
    context.lineWidth = 0.9;
    context.stroke();
    context.beginPath();
    context.arc(x, y, 0.65, 0, Math.PI * 2);
    context.fillStyle = index % 5 === 0 ? "rgba(205, 255, 223, .52)" : "rgba(90, 203, 143, .34)";
    context.fill();
  }
  context.restore();

  context.save();
  for (let index = 0; index < 56; index += 1) {
    const seed = phaseSeed + 4_000 + index * 73;
    const x = 22 + boardUnit(seed) * 742;
    const y = 20 + boardUnit(seed + 1) * 420;
    const width = 13 + Math.floor(boardUnit(seed + 2) * 24);
    const height = 7 + Math.floor(boardUnit(seed + 3) * 14);
    context.fillStyle = "rgba(2, 20, 13, .42)";
    context.strokeStyle = "rgba(137, 244, 184, .3)";
    context.lineWidth = 0.9;
    context.fillRect(x, y, width, height);
    context.strokeRect(x, y, width, height);
    const pins = 2 + Math.floor(width / 10);
    for (let pin = 0; pin < pins; pin += 1) {
      const pinX = x + ((pin + 1) * width) / (pins + 1);
      context.beginPath(); context.moveTo(pinX, y - 3); context.lineTo(pinX, y); context.stroke();
      context.beginPath(); context.moveTo(pinX, y + height); context.lineTo(pinX, y + height + 3); context.stroke();
    }
    context.beginPath(); context.moveTo(x - 5, y + height / 2); context.lineTo(x, y + height / 2); context.stroke();
    context.beginPath(); context.moveTo(x + width, y + height / 2); context.lineTo(x + width + 5, y + height / 2); context.stroke();
  }
  context.restore();

  context.save();
  context.font = "700 5px ui-monospace, monospace";
  context.fillStyle = "rgba(137, 235, 180, .16)";
  context.textAlign = "left";
  for (let index = 0; index < 36; index += 1) {
    const seed = phaseSeed + 7_000 + index * 59;
    const x = 16 + boardUnit(seed) * 730;
    const y = 16 + boardUnit(seed + 1) * 440;
    const labels = ["R", "C", "U", "D", "J", "TP"];
    context.fillText(`${labels[index % labels.length]}${String(11 + index * 7).padStart(3, "0")}`, x, y);
  }
  context.restore();

  context.save();
  for (let index = 0; index < 360; index += 1) {
    const seed = phaseSeed + 9_000 + index * 29;
    const x = boardUnit(seed) * BOARD_WIDTH;
    const y = boardUnit(seed + 1) * BOARD_HEIGHT;
    const alpha = 0.012 + boardUnit(seed + 2) * 0.028;
    context.fillStyle = `rgba(150, 255, 195, ${alpha})`;
    context.fillRect(x, y, index % 9 === 0 ? 1.4 : 0.7, index % 9 === 0 ? 1.4 : 0.7);
  }
  context.restore();
}

function addPolygonSubpath(context: CanvasRenderingContext2D, points: Point[]) {
  points.forEach((point, index) => {
    if (index === 0) context.moveTo(point.x, point.y);
    else context.lineTo(point.x, point.y);
  });
  context.closePath();
}

function buildPolygonPath(context: CanvasRenderingContext2D, points: Point[]) {
  context.beginPath();
  addPolygonSubpath(context, points);
}

function snapTextureCoordinate(value: number) {
  return Math.round(value * 2) / 2;
}

function drawConnectedObstacleBodies(context: CanvasRenderingContext2D, obstacles: Obstacle[]) {
  if (!obstacles.length) return;
  context.save();
  context.beginPath();
  obstacles.forEach((obstacle) => addPolygonSubpath(context, obstacle.points));

  const panelFill = context.createLinearGradient(0, 0, BOARD_WIDTH * 0.24, BOARD_HEIGHT);
  const [referenceRed, referenceGreen, referenceBlue] = REFERENCE_FRAME_PROFILE.measuredMedianRgb;
  panelFill.addColorStop(0, "#285f46");
  panelFill.addColorStop(0.22, OBSTACLE_WALL_HEX);
  panelFill.addColorStop(0.58, `rgba(${referenceRed}, ${referenceGreen}, ${referenceBlue}, .99)`);
  panelFill.addColorStop(1, "rgba(24, 62, 45, .99)");
  context.fillStyle = panelFill;
  context.shadowColor = "rgba(73, 190, 130, .24)";
  context.shadowBlur = 1.5;
  context.fill();
  context.restore();
}

function drawObstacleSurfaceTexture(
  context: CanvasRenderingContext2D,
  obstacles: Obstacle[],
  phase: PhaseNumber,
) {
  if (!obstacles.length) return;
  const phaseSeed = 48_000 + phase * 4_000;
  context.save();
  context.beginPath();
  obstacles.forEach((obstacle) => addPolygonSubpath(context, obstacle.points));
  context.clip();
  context.imageSmoothingEnabled = false;

  const surfaceGlow = context.createLinearGradient(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
  surfaceGlow.addColorStop(0, `rgba(${OBSTACLE_DETAIL_RGB}, .085)`);
  surfaceGlow.addColorStop(0.42, "rgba(0, 0, 0, 0)");
  surfaceGlow.addColorStop(1, "rgba(5, 31, 21, .12)");
  context.fillStyle = surfaceGlow;
  context.fillRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);

  // Keep the solder-mask grain locked to the canvas grid so connected panels
  // read as one continuous, sharp PCB surface.
  for (let y = 2; y < BOARD_HEIGHT; y += 3) {
    const crispY = snapTextureCoordinate(y);
    const majorLine = (y - 2) % 15 === 0;
    context.fillStyle = majorLine
      ? `rgba(${OBSTACLE_DETAIL_RGB}, .075)`
      : `rgba(${OBSTACLE_DETAIL_RGB}, .026)`;
    context.fillRect(0, crispY, BOARD_WIDTH, 0.5);
  }

  context.fillStyle = `rgba(${OBSTACLE_DETAIL_RGB}, .03)`;
  for (let x = 16; x < BOARD_WIDTH; x += 32) {
    context.fillRect(snapTextureCoordinate(x), 0, 0.5, BOARD_HEIGHT);
  }

  context.lineCap = "butt";
  context.lineJoin = "miter";
  context.lineWidth = 0.75;
  context.strokeStyle = `rgba(${OBSTACLE_DETAIL_RGB}, .25)`;
  context.fillStyle = `rgba(${OBSTACLE_DETAIL_RGB}, .22)`;
  let viaRow = 0;
  for (let y = 20 + phase * 2; y < BOARD_HEIGHT - 12; y += 42) {
    const rowOffset = viaRow % 2 === 0 ? 0 : 24;
    for (let x = 20 + rowOffset; x < BOARD_WIDTH - 12; x += 48) {
      const viaX = snapTextureCoordinate(x + phase * 2);
      const viaY = snapTextureCoordinate(y);
      context.beginPath();
      context.arc(viaX, viaY, 1.8, 0, Math.PI * 2);
      context.stroke();
      context.beginPath();
      context.arc(viaX, viaY, 0.65, 0, Math.PI * 2);
      context.fill();
    }
    viaRow += 1;
  }

  context.lineCap = "butt";
  context.lineJoin = "miter";
  context.lineWidth = 0.75;
  context.strokeStyle = `rgba(${OBSTACLE_DETAIL_RGB}, .32)`;
  const traceCount = 12 + phase * 3;
  for (let index = 0; index < traceCount; index += 1) {
    const seed = phaseSeed + index * 83;
    const horizontal = boardUnit(seed) > 0.42;
    const x = snapTextureCoordinate(16 + Math.floor(boardUnit(seed + 1) * (BOARD_WIDTH - 128) / 8) * 8);
    const y = snapTextureCoordinate(16 + Math.floor(boardUnit(seed + 2) * (BOARD_HEIGHT - 96) / 8) * 8);
    const span = Math.round((40 + boardUnit(seed + 3) * 64) / 8) * 8;
    const bend = (boardUnit(seed + 4) > 0.5 ? 1 : -1) * (8 + Math.floor(boardUnit(seed + 5) * 2) * 8);
    context.beginPath();
    if (horizontal) {
      const elbowX = snapTextureCoordinate(x + Math.round(span * 0.625 / 8) * 8);
      context.moveTo(x, y);
      context.lineTo(elbowX, y);
      context.lineTo(elbowX, y + bend);
      context.lineTo(x + span, y + bend);
    } else {
      const elbowY = snapTextureCoordinate(y + Math.round(span * 0.625 / 8) * 8);
      context.moveTo(x, y);
      context.lineTo(x, elbowY);
      context.lineTo(x + bend, elbowY);
      context.lineTo(x + bend, y + span);
    }
    context.stroke();
    const terminal = horizontal
      ? { x: x + span, y: y + bend }
      : { x: x + bend, y: y + span };
    context.beginPath();
    context.arc(snapTextureCoordinate(terminal.x), snapTextureCoordinate(terminal.y), 1.65, 0, Math.PI * 2);
    context.stroke();
  }
  context.restore();
}

function drawCpuObstacle(context: CanvasRenderingContext2D, obstacle: Obstacle) {
  const { bounds } = obstacle;
  const radius = obstacle.cornerRadius ?? 8;
  context.save();
  buildPolygonPath(context, obstacle.points);
  const chipFill = context.createLinearGradient(bounds.x, bounds.y, bounds.x + bounds.width, bounds.y + bounds.height);
  chipFill.addColorStop(0, "rgba(12, 94, 62, .99)");
  chipFill.addColorStop(1, "rgba(5, 52, 36, .99)");
  context.fillStyle = chipFill;
  context.strokeStyle = obstacle.accent;
  context.lineWidth = 1.6;
  context.shadowColor = obstacle.accent;
  context.shadowBlur = 5;
  context.fill();
  context.stroke();
  context.shadowBlur = 0;

  const inset = Math.max(7, Math.min(bounds.width, bounds.height) * 0.18);
  context.beginPath();
  context.roundRect(bounds.x + inset, bounds.y + inset, bounds.width - inset * 2, bounds.height - inset * 2, Math.max(3, radius / 2));
  context.fillStyle = "rgba(2, 28, 19, .78)";
  context.strokeStyle = `rgba(${OBSTACLE_DETAIL_RGB}, .78)`;
  context.fill();
  context.stroke();

  context.strokeStyle = `rgba(${OBSTACLE_DETAIL_RGB}, .64)`;
  context.lineWidth = 0.9;
  const pins = bounds.width >= 64 ? 5 : 3;
  for (let pin = 0; pin < pins; pin += 1) {
    const ratio = (pin + 1) / (pins + 1);
    const x = bounds.x + bounds.width * ratio;
    const y = bounds.y + bounds.height * ratio;
    context.beginPath(); context.moveTo(x, bounds.y - 3); context.lineTo(x, bounds.y + 5); context.stroke();
    context.beginPath(); context.moveTo(x, bounds.y + bounds.height - 5); context.lineTo(x, bounds.y + bounds.height + 3); context.stroke();
    context.beginPath(); context.moveTo(bounds.x - 3, y); context.lineTo(bounds.x + 5, y); context.stroke();
    context.beginPath(); context.moveTo(bounds.x + bounds.width - 5, y); context.lineTo(bounds.x + bounds.width + 3, y); context.stroke();
  }

  if (bounds.width >= 42) {
    context.fillStyle = `rgba(${OBSTACLE_DETAIL_RGB}, .82)`;
    context.font = "700 6px ui-monospace, monospace";
    context.textAlign = "center";
    context.fillText("CPU", bounds.x + bounds.width / 2, bounds.y + bounds.height / 2 + 2);
  }
  context.restore();
}

function drawObstacleDetails(context: CanvasRenderingContext2D, obstacle: Obstacle) {
  context.save();
  buildPolygonPath(context, obstacle.points);
  context.clip();

  const horizontal = obstacle.bounds.width > obstacle.bounds.height;
  const centerX = snapTextureCoordinate(obstacle.bounds.x + obstacle.bounds.width / 2);
  const centerY = snapTextureCoordinate(obstacle.bounds.y + obstacle.bounds.height / 2);
  const profileIndex = WALL_PROFILES.findIndex((profile) => profile.id === obstacle.templateId);
  const crossSize = horizontal ? obstacle.bounds.height : obstacle.bounds.width;
  const trackCount = obstacle.templateId === "bus" || obstacle.templateId === "channel"
    ? Math.min(2, Math.max(1, Math.floor(crossSize / 18)))
    : 1;
  const trackGap = Math.min(7, (horizontal ? obstacle.bounds.height : obstacle.bounds.width) / 3.5);
  context.strokeStyle = `rgba(${OBSTACLE_DETAIL_RGB}, .56)`;
  context.fillStyle = `rgba(${OBSTACLE_DETAIL_RGB}, .72)`;
  context.lineWidth = 0.8;
  const length = horizontal ? obstacle.bounds.width : obstacle.bounds.height;
  const padSpacing = profileIndex % 2 === 0 ? 84 : 104;
  for (let track = 0; track < trackCount; track += 1) {
    const trackOffset = (track - (trackCount - 1) / 2) * trackGap;
    context.beginPath();
    if (horizontal) {
      context.moveTo(obstacle.bounds.x + 4, centerY + trackOffset);
      context.lineTo(obstacle.bounds.x + obstacle.bounds.width - 4, centerY + trackOffset);
    } else {
      context.moveTo(centerX + trackOffset, obstacle.bounds.y + 4);
      context.lineTo(centerX + trackOffset, obstacle.bounds.y + obstacle.bounds.height - 4);
    }
    context.stroke();

    for (let offset = 12 + ((obstacle.detailSeed + track * 11) % 17); offset < length - 7; offset += padSpacing) {
      const x = horizontal ? obstacle.bounds.x + offset : centerX + trackOffset;
      const y = horizontal ? centerY + trackOffset : obstacle.bounds.y + offset;
      context.beginPath(); context.arc(x, y, profileIndex === 2 ? 2.8 : 2, 0, Math.PI * 2); context.stroke();
    }
  }

  if (obstacle.templateId === "chip" && (length > 70 || obstacle.kind === "module")) {
    const size = obstacle.kind === "module" ? Math.min(24, crossSize * 0.48) : Math.min(14, crossSize - 8);
    context.strokeStyle = `rgba(${OBSTACLE_DETAIL_RGB}, .7)`;
    context.strokeRect(centerX - size / 2, centerY - size / 2, size, size);
    for (const pin of [-1, 1]) {
      context.beginPath();
      if (horizontal) {
        context.moveTo(centerX - size / 2, centerY + pin * 4);
        context.lineTo(centerX - size / 2 - 5, centerY + pin * 4);
        context.moveTo(centerX + size / 2, centerY + pin * 4);
        context.lineTo(centerX + size / 2 + 5, centerY + pin * 4);
      } else {
        context.moveTo(centerX + pin * 4, centerY - size / 2);
        context.lineTo(centerX + pin * 4, centerY - size / 2 - 5);
        context.moveTo(centerX + pin * 4, centerY + size / 2);
        context.lineTo(centerX + pin * 4, centerY + size / 2 + 5);
      }
      context.stroke();
    }
  }

  if (obstacle.templateId === "island" && length > 90) {
    context.strokeStyle = `rgba(${OBSTACLE_DETAIL_RGB}, .68)`;
    for (const ratio of [0.3, 0.5, 0.7]) {
      const x = horizontal ? obstacle.bounds.x + obstacle.bounds.width * ratio : centerX;
      const y = horizontal ? centerY : obstacle.bounds.y + obstacle.bounds.height * ratio;
      context.beginPath(); context.arc(x, y, Math.min(5.5, crossSize * 0.2), 0, Math.PI * 2); context.stroke();
    }
  }

  if ((obstacle.templateId === "rail" || obstacle.templateId === "tee") && length > 80) {
    context.strokeStyle = `rgba(${OBSTACLE_DETAIL_RGB}, .64)`;
    for (const ratio of [0.5]) {
      const componentLength = Math.min(24, length * 0.16);
      const componentWidth = Math.min(10, crossSize * 0.38);
      const x = horizontal ? obstacle.bounds.x + obstacle.bounds.width * ratio - componentLength / 2 : centerX - componentWidth / 2;
      const y = horizontal ? centerY - componentWidth / 2 : obstacle.bounds.y + obstacle.bounds.height * ratio - componentLength / 2;
      context.strokeRect(x, y, horizontal ? componentLength : componentWidth, horizontal ? componentWidth : componentLength);
    }
  }
  context.restore();
}

function drawTetrisGroupDetails(context: CanvasRenderingContext2D, tiles: Obstacle[]) {
  if (!tiles.length) return;
  const left = snapTextureCoordinate(Math.min(...tiles.map((tile) => tile.bounds.x)));
  const top = snapTextureCoordinate(Math.min(...tiles.map((tile) => tile.bounds.y)));
  const right = snapTextureCoordinate(Math.max(...tiles.map((tile) => tile.bounds.x + tile.bounds.width)));
  const bottom = snapTextureCoordinate(Math.max(...tiles.map((tile) => tile.bounds.y + tile.bounds.height)));
  const width = right - left;
  const height = bottom - top;
  const horizontal = width >= height;

  context.save();
  context.beginPath();
  tiles.forEach((tile) => addPolygonSubpath(context, tile.points));
  context.clip();

  context.strokeStyle = `rgba(${OBSTACLE_DETAIL_RGB}, .62)`;
  context.fillStyle = `rgba(${OBSTACLE_DETAIL_RGB}, .78)`;
  context.lineWidth = 0.85;
  context.lineCap = "butt";
  context.lineJoin = "miter";
  const crossSize = horizontal ? height : width;
  const tracks = crossSize >= 44 ? 2 : 1;
  for (let track = 0; track < tracks; track += 1) {
    const offset = (track - (tracks - 1) / 2) * 7;
    context.beginPath();
    if (horizontal) {
      const trackY = snapTextureCoordinate(top + height / 2 + offset);
      context.moveTo(snapTextureCoordinate(left + 4), trackY);
      context.lineTo(snapTextureCoordinate(right - 4), trackY);
    } else {
      const trackX = snapTextureCoordinate(left + width / 2 + offset);
      context.moveTo(trackX, snapTextureCoordinate(top + 4));
      context.lineTo(trackX, snapTextureCoordinate(bottom - 4));
    }
    context.stroke();
  }

  tiles.forEach((tile, index) => {
    if (index % 4 !== 0) return;
    const centerX = snapTextureCoordinate(tile.bounds.x + tile.bounds.width / 2);
    const centerY = snapTextureCoordinate(tile.bounds.y + tile.bounds.height / 2);
    context.beginPath();
    context.arc(centerX, centerY, 2.25, 0, Math.PI * 2);
    context.stroke();
    context.beginPath();
    context.arc(centerX, centerY, 0.75, 0, Math.PI * 2);
    context.fill();
  });
  context.restore();
}

function drawServer(context: CanvasRenderingContext2D, point: Point, edge: BoardEdge) {
  const width = SERVER_WIDTH;
  const height = SERVER_HEIGHT;
  const x = point.x - width / 2;
  const y = point.y - height / 2;
  context.save();
  const dockBounds = edge === "top"
    ? { x: x + 12, y: 0, width: width - 24, height: y + 1 }
    : edge === "bottom"
      ? { x: x + 12, y: y + height - 1, width: width - 24, height: BOARD_HEIGHT - (y + height - 1) }
      : edge === "left"
        ? { x: 0, y: y + 10, width: x + 1, height: height - 20 }
        : { x: x + width - 1, y: y + 10, width: BOARD_WIDTH - (x + width - 1), height: height - 20 };
  context.fillStyle = "#737b76";
  context.strokeStyle = "#aeb4b0";
  context.lineWidth = 1;
  context.fillRect(dockBounds.x, dockBounds.y, dockBounds.width, dockBounds.height);
  context.strokeRect(dockBounds.x, dockBounds.y, dockBounds.width, dockBounds.height);
  context.fillStyle = "#8b918c";
  context.strokeStyle = "#b6bbb7";
  context.lineWidth = 1;
  context.fillRect(x, y, width, height);
  context.strokeRect(x, y, width, height);
  context.fillStyle = "rgba(15, 24, 20, .42)";
  for (let line = 0; line < 4; line += 1) context.fillRect(x + 8, y + 7 + line * 7, 23, 2);
  context.fillStyle = "#55f39d";
  context.shadowColor = "#55f39d";
  context.shadowBlur = 8;
  const led = edge === "top"
    ? { x: point.x, y: y + height - 7 }
    : edge === "bottom"
      ? { x: point.x, y: y + 7 }
      : edge === "left"
        ? { x: x + width - 7, y: y + height - 7 }
        : { x: x + 7, y: y + height - 7 };
  context.beginPath(); context.arc(led.x, led.y, 3, 0, Math.PI * 2); context.fill();
  context.restore();
}

function drawPad(context: CanvasRenderingContext2D, point: Point, color: string, pulse: number, emphasis = 1) {
  context.save();
  context.translate(point.x, point.y);
  const haloRadius = (28 + pulse * 4) * emphasis;
  const halo = context.createRadialGradient(0, 0, 2, 0, 0, haloRadius);
  halo.addColorStop(0, `${color}72`);
  halo.addColorStop(0.42, `${color}32`);
  halo.addColorStop(1, `${color}00`);
  context.fillStyle = halo;
  context.beginPath();
  context.arc(0, 0, haloRadius, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = color;
  context.fillStyle = `${color}38`;
  context.shadowColor = color;
  context.shadowBlur = 26 * emphasis;
  context.lineWidth = 2.4 + (emphasis - 1) * 1.2;
  context.beginPath(); context.arc(0, 0, GOAL_PAD_RADIUS + pulse * 2 + (emphasis - 1) * 2, 0, Math.PI * 2); context.fill(); context.stroke();
  context.strokeStyle = `${color}8c`;
  context.lineWidth = 1;
  context.beginPath(); context.arc(0, 0, GOAL_PAD_RADIUS + 6 + pulse * 3 + (emphasis - 1) * 5, 0, Math.PI * 2); context.stroke();
  if (emphasis > 1) {
    context.strokeStyle = `${color}66`;
    context.beginPath(); context.arc(0, 0, GOAL_PAD_RADIUS + 13 + pulse * 2, 0, Math.PI * 2); context.stroke();
  }
  context.beginPath(); context.arc(0, 0, 4, 0, Math.PI * 2); context.fillStyle = color; context.fill();
  context.restore();
}

function drawEntryArrow(context: CanvasRenderingContext2D, point: Point, direction: Direction) {
  context.save();
  context.translate(point.x, point.y);
  context.rotate(Math.atan2(direction.y, direction.x));
  context.fillStyle = "#efffc3";
  context.shadowColor = "#aaff63";
  context.shadowBlur = 9;
  context.fillRect(-7, -1.5, 10, 3);
  context.beginPath();
  context.moveTo(3, -5.5);
  context.lineTo(10, 0);
  context.lineTo(3, 5.5);
  context.closePath();
  context.fill();
  context.restore();
}

const boardLayerCache = new WeakMap<Obstacle[], HTMLCanvasElement>();

function getBoardLayer(runtime: Runtime) {
  const cached = boardLayerCache.get(runtime.obstacles);
  if (cached) return cached;
  const layer = document.createElement("canvas");
  layer.width = Math.round(BOARD_WIDTH * BOARD_TEXTURE_SCALE);
  layer.height = Math.round(BOARD_HEIGHT * BOARD_TEXTURE_SCALE);
  const context = layer.getContext("2d");
  if (!context) return layer;
  context.scale(BOARD_TEXTURE_SCALE, BOARD_TEXTURE_SCALE);
  drawBoardBackground(context, runtime.phase);
  const connectedObstacles = runtime.obstacles.filter((obstacle) => obstacle.kind !== "cpu");
  const cpuObstacles = runtime.obstacles.filter((obstacle) => obstacle.kind === "cpu");
  const tetrisTiles = connectedObstacles.filter((obstacle) => obstacle.id.startsWith("tetris-"));
  const standardObstacles = connectedObstacles.filter((obstacle) => !obstacle.id.startsWith("tetris-"));
  const tetrisGroups = new Map<string, Obstacle[]>();
  tetrisTiles.forEach((tile) => {
    const groupId = tile.id.replace(/-tile-\d+$/, "");
    const assemblyId = tile.assemblyId ?? groupId;
    tetrisGroups.set(assemblyId, [...(tetrisGroups.get(assemblyId) ?? []), tile]);
  });
  drawConnectedObstacleBodies(context, connectedObstacles);
  drawObstacleSurfaceTexture(context, connectedObstacles, runtime.phase);
  standardObstacles.forEach((obstacle) => drawObstacleDetails(context, obstacle));
  tetrisGroups.forEach((tiles) => drawTetrisGroupDetails(context, tiles));
  cpuObstacles.forEach((obstacle) => drawCpuObstacle(context, obstacle));
  boardLayerCache.set(runtime.obstacles, layer);
  return layer;
}

function drawNetwork(canvas: HTMLCanvasElement, runtime: Runtime, timestamp: number) {
  const context = canvas.getContext("2d");
  if (!context) return;
  const scaleX = canvas.width / BOARD_WIDTH;
  const scaleY = canvas.height / BOARD_HEIGHT;
  const pulse = (Math.sin(timestamp / 210) + 1) / 2;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(getBoardLayer(runtime), 0, 0, canvas.width, canvas.height);
  context.save();
  context.scale(scaleX, scaleY);
  drawServer(context, runtime.goal, runtime.goalEdge);
  drawServer(context, runtime.startServer, runtime.startEdge);
  drawPad(context, runtime.startServer, "#aaff63", 0.65 + pulse * 0.35, 1.55);
  drawPad(context, runtime.goal, "#63f4ff", pulse);
  drawEntryArrow(context, runtime.startServer, runtime.entryDirection);

  if (runtime.path.length) {
    context.save();
    context.lineCap = "round";
    context.lineJoin = "round";
    context.beginPath();
    runtime.path.forEach((point, index) => index === 0 ? context.moveTo(point.x, point.y) : context.lineTo(point.x, point.y));
    context.shadowColor = "#55ff9e";
    context.shadowBlur = 18;
    context.strokeStyle = "rgba(80, 255, 155, .25)";
    context.lineWidth = 9;
    context.stroke();
    context.shadowBlur = 10;
    context.strokeStyle = "#56ffa4";
    context.lineWidth = 4;
    context.stroke();
    context.shadowBlur = 0;
    context.strokeStyle = "#c5ff72";
    context.lineWidth = 1.4;
    context.stroke();
    context.restore();

    const head = runtime.path[0];
    context.save();
    context.shadowColor = "#aaff63";
    context.shadowBlur = 20;
    context.fillStyle = "#baff6b";
    context.beginPath(); context.arc(head.x, head.y, SNAKE_HEAD_RADIUS, 0, Math.PI * 2); context.fill();
    context.fillStyle = "#edffc9";
    context.beginPath(); context.arc(head.x, head.y, 1.8, 0, Math.PI * 2); context.fill();
    context.restore();
  }

  context.fillStyle = "rgba(170, 255, 201, .46)";
  context.font = "700 8px ui-monospace, monospace";
  context.textAlign = "right";
  context.fillText(["", "NORMAL", "DIFÍCIL", "CRÍTICO"][runtime.phase], BOARD_WIDTH - 20, BOARD_HEIGHT - 18);
  context.restore();
}

function SoundButton({ soundOn, onClick }: { soundOn: boolean; onClick: () => void }) {
  return <button className="sound-button" type="button" onClick={onClick} aria-label={soundOn ? "Desativar som" : "Ativar som"}><span aria-hidden="true">{soundOn ? "◖)))" : "◖×"}</span>{soundOn ? "SOM ON" : "SOM OFF"}</button>;
}

const DECRYPT_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DECRYPT_REVEAL_TICKS = 20;
const DECRYPT_TICK_MS = 52;

function LetterRevealBox({ finalLetter, slot }: { finalLetter: "N" | "O"; slot: 1 | 2 }) {
  const [displayLetter, setDisplayLetter] = useState("?");
  const [revealState, setRevealState] = useState<"idle" | "scrambling" | "revealed">("idle");
  const timerRef = useRef<number | null>(null);

  const revealLetter = useCallback(() => {
    if (revealState !== "idle") return;
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    setRevealState("scrambling");
    let tick = 0;

    const scramble = () => {
      tick += 1;
      if (tick >= DECRYPT_REVEAL_TICKS) {
        setDisplayLetter(finalLetter);
        setRevealState("revealed");
        timerRef.current = null;
        return;
      }
      let nextLetter = DECRYPT_ALPHABET[Math.floor(Math.random() * DECRYPT_ALPHABET.length)];
      if (nextLetter === finalLetter) nextLetter = DECRYPT_ALPHABET[(DECRYPT_ALPHABET.indexOf(nextLetter) + slot + tick) % DECRYPT_ALPHABET.length];
      setDisplayLetter(nextLetter);
      timerRef.current = window.setTimeout(scramble, DECRYPT_TICK_MS + Math.random() * 34);
    };

    scramble();
  }, [finalLetter, revealState, slot]);

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
  }, []);

  return (
    <button
      className={`terminal-decrypt-box decrypt-${revealState}`}
      type="button"
      onClick={revealLetter}
      disabled={revealState !== "idle"}
      aria-label={revealState === "revealed" ? `Letra ${finalLetter} revelada` : revealState === "scrambling" ? `Decodificando fragmento ${slot}` : `Clique para revelar a letra do fragmento ${slot}`}
    >
      <span>FRAGMENTO_0{slot}</span>
      <strong aria-hidden="true">{displayLetter}</strong>
      <small aria-live="polite">{revealState === "scrambling" ? "DECODIFICANDO…" : revealState === "revealed" ? `CHAVE ${finalLetter} REVELADA` : "CLIQUE PARA REVELAR"}</small>
      <i aria-hidden="true" />
    </button>
  );
}

function WireframeEarth() {
  const earthCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = earthCanvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frameId = 0;
    let lastRenderedAt = 0;

    const renderEarth = (timestamp: number) => {
      if (!reducedMotion && timestamp - lastRenderedAt < EARTH_FRAME_INTERVAL_MS) {
        frameId = window.requestAnimationFrame(renderEarth);
        return;
      }
      lastRenderedAt = timestamp;
      const bounds = canvas.getBoundingClientRect();
      const width = Math.max(1, Math.round(bounds.width));
      const height = Math.max(1, Math.round(bounds.height));
      const pixelRatio = Math.min(window.devicePixelRatio || 1, EARTH_MAX_PIXEL_RATIO);
      const renderWidth = Math.round(width * pixelRatio);
      const renderHeight = Math.round(height * pixelRatio);
      if (canvas.width !== renderWidth || canvas.height !== renderHeight) {
        canvas.width = renderWidth;
        canvas.height = renderHeight;
      }
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.max(24, Math.min(width, height) * 0.43);
      const rotation = reducedMotion ? 0.72 : timestamp * 0.000105;
      const tilt = EARTH_AXIS_TILT;
      const rotationCos = Math.cos(rotation);
      const rotationSin = Math.sin(rotation);
      const tiltCos = Math.cos(tilt);
      const tiltSin = Math.sin(tilt);

      const project = (x: number, y: number, z: number) => {
        const rotatedX = x * rotationCos + z * rotationSin;
        const rotatedZ = -x * rotationSin + z * rotationCos;
        const tiltedY = y * tiltCos - rotatedZ * tiltSin;
        const tiltedZ = y * tiltSin + rotatedZ * tiltCos;
        const perspective = 1 / (1.08 - tiltedZ * 0.08);
        return {
          x: centerX + rotatedX * radius * perspective,
          y: centerY - tiltedY * radius * perspective,
          z: tiltedZ,
        };
      };

      const sphereFill = context.createRadialGradient(
        centerX - radius * 0.28,
        centerY - radius * 0.34,
        radius * 0.08,
        centerX,
        centerY,
        radius * 1.08,
      );
      sphereFill.addColorStop(0, "rgba(24, 150, 105, .25)");
      sphereFill.addColorStop(0.62, "rgba(0, 68, 45, .28)");
      sphereFill.addColorStop(1, "rgba(0, 10, 7, .08)");
      context.beginPath();
      context.arc(centerX, centerY, radius, 0, Math.PI * 2);
      context.fillStyle = sphereFill;
      context.fill();

      const depthPaths = Array.from({ length: 4 }, () => new Path2D());
      const queueSegment = (
        start: ReturnType<typeof project>,
        end: ReturnType<typeof project>,
      ) => {
        const depth = Math.max(0, Math.min(1, ((start.z + end.z) * 0.25) + 0.5));
        const bucket = Math.min(depthPaths.length - 1, Math.floor(depth * depthPaths.length));
        depthPaths[bucket].moveTo(start.x, start.y);
        depthPaths[bucket].lineTo(end.x, end.y);
      };

      context.save();
      context.lineCap = "round";
      context.lineJoin = "round";
      context.shadowBlur = 0;

      for (let longitude = 0; longitude < Math.PI * 2; longitude += Math.PI / 8) {
        let previous = project(0, -1, 0);
        for (let sample = 1; sample <= 36; sample += 1) {
          const latitude = -Math.PI / 2 + (sample / 36) * Math.PI;
          const next = project(
            Math.cos(latitude) * Math.cos(longitude),
            Math.sin(latitude),
            Math.cos(latitude) * Math.sin(longitude),
          );
          queueSegment(previous, next);
          previous = next;
        }
      }

      for (let latitude = -Math.PI * 0.375; latitude <= Math.PI * 0.375; latitude += Math.PI / 8) {
        let previous = project(Math.cos(latitude), Math.sin(latitude), 0);
        for (let sample = 1; sample <= 48; sample += 1) {
          const longitude = (sample / 48) * Math.PI * 2;
          const next = project(
            Math.cos(latitude) * Math.cos(longitude),
            Math.sin(latitude),
            Math.cos(latitude) * Math.sin(longitude),
          );
          queueSegment(previous, next);
          previous = next;
        }
      }

      const depthAlphas = [0.13, 0.25, 0.46, 0.76];
      depthPaths.forEach((path, index) => {
        context.strokeStyle = `rgba(91, 255, 214, ${depthAlphas[index]})`;
        context.lineWidth = 0.65 + index * 0.2;
        context.stroke(path);
      });

      context.restore();

      if (!reducedMotion) frameId = window.requestAnimationFrame(renderEarth);
    };

    renderEarth(window.performance.now());
    return () => window.cancelAnimationFrame(frameId);
  }, []);

  return <canvas className="terminal-earth-canvas" ref={earthCanvasRef} role="img" aria-label="Modelo tridimensional em wireframe da Terra girando lentamente em vista superior, com o polo norte visível" />;
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("protocol");
  const [bootComplete, setBootComplete] = useState(false);
  const [snapshot, setSnapshot] = useState<Runtime>(INITIAL_RUNTIME);
  const [isPaused, setIsPaused] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [failReason, setFailReason] = useState("");
  const [connections, setConnections] = useState(MAX_CONNECTIONS);
  const [startGate, setStartGate] = useState<StartGate | null>(null);
  const [victoryStage, setVictoryStage] = useState<VictoryStage>("swarm");
  const [virusBlocks, setVirusBlocks] = useState<VirusBlock[]>([]);
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>(TERMINAL_BOOT_LINES);
  const runtimeRef = useRef<Runtime>(INITIAL_RUNTIME);
  const mazeSetRef = useRef<MazeSet | null>(null);
  const connectionsRef = useRef(MAX_CONNECTIONS);
  const gateTimerRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const virusLeaderElementRef = useRef<HTMLSpanElement>(null);
  const virusLeaderMotionRef = useRef<VirusLeaderMotion>(createVirusLeaderMotion());
  const audioRef = useRef<Record<string, HTMLAudioElement>>({});
  const soundOnRef = useRef(true);
  const virusBlockIdRef = useRef(0);
  const terminalLineIdRef = useRef(TERMINAL_BOOT_LINES.length);

  const ensureAudio = useCallback(() => {
    if (Object.keys(audioRef.current).length) return audioRef.current;
    const files = { ambience: "/audio/terminal-ambience.mp3", error: "/audio/system-error.mp3", complete: "/audio/stage-complete.mp3", select: "/audio/ui-select.mp3" };
    for (const [name, source] of Object.entries(files)) {
      const audio = new Audio(source);
      audio.preload = "auto";
      audio.volume = name === "ambience" ? 0.13 : 0.34;
      if (name === "ambience") audio.loop = true;
      audioRef.current[name] = audio;
    }
    return audioRef.current;
  }, []);

  const playSound = useCallback((name: string, restart = true) => {
    if (!soundOnRef.current) return;
    const audio = ensureAudio()[name];
    if (!audio) return;
    if (restart) audio.currentTime = 0;
    void audio.play().catch(() => undefined);
  }, [ensureAudio]);

  const pauseAmbience = useCallback(() => audioRef.current.ambience?.pause(), []);
  const playAmbience = useCallback(() => {
    if (!soundOnRef.current) return;
    const ambience = ensureAudio().ambience;
    if (ambience.paused) void ambience.play().catch(() => undefined);
  }, [ensureAudio]);

  const clearGateTimer = useCallback(() => {
    if (gateTimerRef.current === null) return;
    window.clearTimeout(gateTimerRef.current);
    gateTimerRef.current = null;
  }, []);

  const startPhase = useCallback((phase: PhaseNumber, delayMs = 0, kind: StartGate["kind"] = "entry") => {
    clearGateTimer();
    if (!mazeSetRef.current) mazeSetRef.current = generateMazeSet();
    const maze = mazeSetRef.current[phase];
    const runtime: Runtime = {
      phase,
      path: [maze.start],
      start: maze.start,
      startServer: maze.startServer,
      startEdge: maze.startEdge,
      goal: maze.goal,
      goalEdge: maze.goalEdge,
      entryDirection: maze.initialDirection,
      direction: maze.initialDirection,
      queuedDirection: maze.initialDirection,
      obstacles: maze.obstacles,
      roundabouts: maze.roundabouts,
      corridorWidth: maze.corridorWidth,
      travelled: 0,
      solutionLength: maze.solutionLength,
      status: delayMs > 0 ? "paused" : "running",
    };
    runtimeRef.current = runtime;
    setSnapshot(runtime);
    if (kind !== "retry") setFailReason("");
    setIsPaused(false);
    setScreen("game");
    if (delayMs > 0) {
      pauseAmbience();
      setStartGate({ kind, delayMs });
      gateTimerRef.current = window.setTimeout(() => {
        runtimeRef.current.status = "running";
        setStartGate(null);
        gateTimerRef.current = null;
        playAmbience();
        canvasRef.current?.focus();
      }, delayMs);
    } else {
      setStartGate(null);
      playAmbience();
      window.setTimeout(() => canvasRef.current?.focus(), 60);
    }
  }, [clearGateTimer, pauseAmbience, playAmbience]);

  const beginMission = useCallback(() => {
    ensureAudio();
    playSound("select");
    mazeSetRef.current = generateMazeSet();
    connectionsRef.current = MAX_CONNECTIONS;
    setConnections(MAX_CONNECTIONS);
    startPhase(1, FIRST_ENTRY_DELAY_MS, "entry");
  }, [ensureAudio, playSound, startPhase]);

  const queueDirection = useCallback((next: Direction) => {
    const current = runtimeRef.current;
    if (next.x === -current.direction.x && next.y === -current.direction.y) return;
    current.queuedDirection = next;
  }, []);

  const finishWithError = useCallback((reason: string) => {
    const current = runtimeRef.current;
    current.status = "finished";
    setSnapshot({ ...current, path: [...current.path] });
    setFailReason(reason);
    pauseAmbience();
    playSound("error");
    const remainingConnections = Math.max(0, connectionsRef.current - 1);
    connectionsRef.current = remainingConnections;
    setConnections(remainingConnections);
    if (remainingConnections > 0) startPhase(current.phase, RETRY_DELAY_MS, "retry");
    else {
      clearGateTimer();
      setStartGate(null);
      setScreen("gameover");
    }
  }, [clearGateTimer, pauseAmbience, playSound, startPhase]);

  const tick = useCallback((deltaSeconds: number, syncSnapshot: boolean) => {
    const current = runtimeRef.current;
    if (current.status !== "running") return;
    const collisionRadius = SNAKE_HEAD_RADIUS;
    let remainingDistance = SNAKE_SPEED * Math.min(deltaSeconds, MAX_FRAME_DELTA);

    while (remainingDistance > 0) {
      const sampleDistance = Math.min(MAX_MOVE_SAMPLE, remainingDistance);
      const direction = current.queuedDirection;
      current.direction = direction;
      const previousHead = current.path[0];
      const proposedHead = {
        x: previousHead.x + direction.x * sampleDistance,
        y: previousHead.y + direction.y * sampleDistance,
      };
      const goalContact = findGoalContactPoint(previousHead, proposedHead, current.goal);
      const head = goalContact ?? proposedHead;

      if (head.x < SNAKE_HEAD_RADIUS || head.x > BOARD_WIDTH - SNAKE_HEAD_RADIUS || head.y < SNAKE_HEAD_RADIUS || head.y > BOARD_HEIGHT - SNAKE_HEAD_RADIUS) {
        finishWithError("O sinal saiu dos limites da placa.");
        return;
      }
      if (collidesWithObstacles(head, current.obstacles, collisionRadius)) {
        const threat = current.obstacles.find((obstacle) => pointInsidePolygon(head, obstacle.points));
        finishWithError(`O sinal atingiu ${threat?.label.toLowerCase() ?? "uma parede do labirinto"}.`);
        return;
      }
      if (current.path.slice(SELF_COLLISION_SKIP).some((point) => distanceBetween(point, head) < TRACE_RADIUS * 2)) {
        finishWithError("Loop detectado: a rota tocou no próprio traçado.");
        return;
      }

      current.path = [head, ...current.path];
      current.travelled += distanceBetween(previousHead, head);
      remainingDistance -= sampleDistance;
      if (goalContact) {
        current.status = "finished";
        setSnapshot({ ...current, path: [...current.path] });
        playSound("complete");
        setScreen("transition");
        return;
      }
    }

    if (syncSnapshot) setSnapshot({ ...current, path: [...current.path] });
  }, [finishWithError, playSound]);

  const togglePause = useCallback(() => {
    const current = runtimeRef.current;
    if (current.status === "finished" || screen !== "game" || startGate) return;
    setIsPaused((paused) => {
      current.status = paused ? "running" : "paused";
      if (paused) playAmbience(); else pauseAmbience();
      return !paused;
    });
  }, [pauseAmbience, playAmbience, screen, startGate]);

  const toggleSound = useCallback(() => {
    const next = !soundOnRef.current;
    soundOnRef.current = next;
    setSoundOn(next);
    if (!next) pauseAmbience();
    else {
      playSound("select");
      if (screen === "game" && !isPaused && !startGate) playAmbience();
    }
  }, [isPaused, pauseAmbience, playAmbience, playSound, screen, startGate]);

  const returnToProtocol = useCallback(() => {
    clearGateTimer();
    pauseAmbience();
    mazeSetRef.current = null;
    connectionsRef.current = MAX_CONNECTIONS;
    runtimeRef.current = INITIAL_RUNTIME;
    setSnapshot(INITIAL_RUNTIME);
    setConnections(MAX_CONNECTIONS);
    setStartGate(null);
    setIsPaused(false);
    setBootComplete(false);
    setScreen("protocol");
  }, [clearGateTimer, pauseAmbience]);

  const skipBoot = useCallback(() => {
    playSound("select");
    setBootComplete(true);
  }, [playSound]);

  const enterProtocol = useCallback(() => {
    playSound("select");
    setBootComplete(false);
    setScreen("intro");
  }, [playSound]);

  useEffect(() => {
    if (screen !== "game") return;
    let animationFrame = 0;
    let previousTimestamp: number | undefined;
    let lastSnapshotTimestamp = 0;

    const animate = (timestamp: number) => {
      const deltaSeconds = previousTimestamp === undefined ? 0 : (timestamp - previousTimestamp) / 1000;
      previousTimestamp = timestamp;
      const shouldSyncSnapshot = timestamp - lastSnapshotTimestamp >= 80;
      if (!isPaused && deltaSeconds > 0) tick(deltaSeconds, shouldSyncSnapshot);
      if (shouldSyncSnapshot) lastSnapshotTimestamp = timestamp;
      if (canvasRef.current) drawNetwork(canvasRef.current, runtimeRef.current, timestamp);
      animationFrame = window.requestAnimationFrame(animate);
    };

    animationFrame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [isPaused, screen, tick]);

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const directions: Record<string, Direction> = {
        arrowup: { x: 0, y: -1 }, w: { x: 0, y: -1 }, arrowdown: { x: 0, y: 1 }, s: { x: 0, y: 1 },
        arrowleft: { x: -1, y: 0 }, a: { x: -1, y: 0 }, arrowright: { x: 1, y: 0 }, d: { x: 1, y: 0 },
      };
      if (directions[key] && screen === "game" && !isPaused && !startGate) {
        event.preventDefault();
        queueDirection(directions[key]);
      } else if (event.code === "Space" && screen === "game" && !startGate) {
        event.preventDefault(); togglePause();
      } else if (key === "r" && screen === "game" && !startGate) {
        startPhase(runtimeRef.current.phase);
      } else if (key === "r" && screen === "victory") {
        beginMission();
      } else if (event.key === "Escape" && screen === "victory") {
        returnToProtocol();
      } else if (key === "m") toggleSound();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [beginMission, isPaused, queueDirection, returnToProtocol, screen, startGate, startPhase, togglePause, toggleSound]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && runtimeRef.current.status === "running" && screen === "game") {
        runtimeRef.current.status = "paused";
        setIsPaused(true);
        pauseAmbience();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [pauseAmbience, screen]);

  useEffect(() => () => {
    if (gateTimerRef.current !== null) window.clearTimeout(gateTimerRef.current);
    Object.values(audioRef.current).forEach((audio) => audio.pause());
  }, []);

  useEffect(() => {
    if (screen !== "intro" || bootComplete) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => setBootComplete(true), reducedMotion ? 120 : 4700);
    return () => window.clearTimeout(timer);
  }, [bootComplete, screen]);

  useEffect(() => {
    if (screen !== "victory") return;
    const freezeTimer = window.setTimeout(() => {
      playSound("error");
      setVictoryStage("freeze");
    }, VIRUS_SWARM_DURATION_MS);
    const blackoutTimer = window.setTimeout(() => {
      setVictoryStage("blackout");
    }, VIRUS_SWARM_DURATION_MS + VIRUS_FREEZE_DURATION_MS);
    const terminalTimer = window.setTimeout(() => {
      setVictoryStage("terminal");
    }, VIRUS_SWARM_DURATION_MS + VIRUS_FREEZE_DURATION_MS + VIRUS_BLACKOUT_DURATION_MS);
    return () => {
      window.clearTimeout(freezeTimer);
      window.clearTimeout(blackoutTimer);
      window.clearTimeout(terminalTimer);
    };
  }, [playSound, screen]);

  useEffect(() => {
    if (screen !== "victory" || victoryStage !== "swarm") return;
    const leader = createVirusLeaderMotion();
    virusLeaderMotionRef.current = leader;
    let motionFrame = 0;
    let previousTimestamp = 0;
    const moveLeader = (timestamp: number) => {
      if (previousTimestamp === 0) previousTimestamp = timestamp;
      const elapsedSeconds = Math.min(timestamp - previousTimestamp, 34) / 1_000;
      previousTimestamp = timestamp;
      leader.x += leader.velocityX * elapsedSeconds;
      leader.y += leader.velocityY * elapsedSeconds;

      const halfWidth = VIRUS_LEADER_WIDTH / 2;
      const halfHeight = VIRUS_LEADER_HEIGHT / 2;
      let bounced = false;
      if (!leader.entered && leader.x >= halfWidth) leader.entered = true;
      if (leader.entered && (leader.x >= 100 - halfWidth || leader.x <= halfWidth)) {
        leader.x = Math.min(100 - halfWidth, Math.max(halfWidth, leader.x));
        leader.velocityX *= -1;
        bounced = true;
      }
      if (leader.y >= 100 - halfHeight || leader.y <= halfHeight) {
        leader.y = Math.min(100 - halfHeight, Math.max(halfHeight, leader.y));
        leader.velocityY *= -1;
        bounced = true;
      }
      if (bounced) leader.tone = leader.tone === 0 ? 1 : 0;

      const element = virusLeaderElementRef.current;
      if (element) {
        element.style.setProperty("--block-x", `${leader.x}%`);
        element.style.setProperty("--block-y", `${leader.y}%`);
        element.classList.toggle("virus-block-tone-0", leader.tone === 0);
        element.classList.toggle("virus-block-tone-1", leader.tone === 1);
      }
      motionFrame = window.requestAnimationFrame(moveLeader);
    };
    motionFrame = window.requestAnimationFrame(moveLeader);
    return () => window.cancelAnimationFrame(motionFrame);
  }, [screen, victoryStage]);

  useEffect(() => {
    if (screen !== "victory" || victoryStage !== "swarm") return;
    let stopped = false;
    let trailTimer = 0;
    const stampTrail = () => {
      if (stopped) return;
      setVirusBlocks((blocks) => {
        const id = virusBlockIdRef.current;
        virusBlockIdRef.current += 1;
        return [...blocks, createVirusTrailBlock(id, virusLeaderMotionRef.current)].slice(-VIRUS_TRAIL_LIMIT);
      });
      trailTimer = window.setTimeout(stampTrail, VIRUS_TRAIL_TICK_MS);
    };
    trailTimer = window.setTimeout(stampTrail, VIRUS_TRAIL_TICK_MS);
    return () => {
      stopped = true;
      window.clearTimeout(trailTimer);
    };
  }, [screen, victoryStage]);

  useEffect(() => {
    if (screen !== "victory" || victoryStage !== "terminal") return;
    let stopped = false;
    let terminalTimer = 0;
    let linesUntilLoading = 12 + Math.floor(Math.random() * 7);
    const placeLine = (line: TerminalLine) => {
      setTerminalLines((lines) => lines.at(-1)?.id === line.id
        ? [...lines.slice(0, -1), line]
        : [...lines.slice(-(TERMINAL_LINE_LIMIT - 1)), line]);
    };
    const appendLine = () => {
      if (stopped) return;
      const id = terminalLineIdRef.current;
      if (linesUntilLoading <= 0) {
        const task = createTerminalLoadingTask();
        let progress = 0;
        const advanceLoading = () => {
          if (stopped) return;
          placeLine(createTerminalLoadingLine(id, progress, task));
          if (progress >= 100) {
            terminalLineIdRef.current += 1;
            linesUntilLoading = 15 + Math.floor(Math.random() * 11);
            terminalTimer = window.setTimeout(appendLine, 320 + Math.random() * 380);
            return;
          }
          progress = Math.min(100, progress + 7 + Math.floor(Math.random() * 17));
          terminalTimer = window.setTimeout(advanceLoading, 85 + Math.random() * 210);
        };
        advanceLoading();
        return;
      }
      const line = createTerminalLine(id);
      terminalLineIdRef.current += 1;
      linesUntilLoading -= 1;
      placeLine(line);
      const stutterDelay = line.id % 9 === 0;
      terminalTimer = window.setTimeout(
        appendLine,
        stutterDelay ? 380 + Math.random() * 920 : 45 + Math.random() * 125,
      );
    };
    terminalTimer = window.setTimeout(appendLine, 120);
    return () => {
      stopped = true;
      window.clearTimeout(terminalTimer);
    };
  }, [screen, victoryStage]);

  useEffect(() => {
    if (screen !== "transition") return;
    const completedPhase = snapshot.phase;
    const completedMazeDelay = completedPhase < 3 ? COMPLETED_MAZE_BLUR_MS : COMPLETION_DELAY_MS;
    const timer = window.setTimeout(() => {
      if (completedPhase < 3) {
        startPhase((completedPhase + 1) as PhaseNumber, NEXT_MAZE_BLUR_MS, "entry");
        return;
      }
      pauseAmbience();
      virusBlockIdRef.current = 0;
      setVirusBlocks([]);
      terminalLineIdRef.current = TERMINAL_BOOT_LINES.length;
      setTerminalLines(TERMINAL_BOOT_LINES);
      setVictoryStage("swarm");
      setScreen("victory");
    }, completedMazeDelay);
    return () => window.clearTimeout(timer);
  }, [pauseAmbience, screen, snapshot.phase, startPhase]);

  const handleCanvasKey = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) event.preventDefault();
  };

  if (screen === "protocol") {
    const protocolTitle = "INICIAR PROTOCOLO DE RESTAURAÇÃO DE REDE";
    return (
      <main className="protocol-gate" aria-labelledby="protocol-gate-title">
        <div className="protocol-gate-grid" aria-hidden="true" />
        <div className="protocol-gate-scan" aria-hidden="true" />
        <section className="protocol-gate-content">
          <h1 id="protocol-gate-title" data-text={protocolTitle}>{protocolTitle}</h1>
          <button className="protocol-gate-action" type="button" onClick={enterProtocol}>
            <span>clique aqui para iniciar</span><i aria-hidden="true" />
          </button>
        </section>
      </main>
    );
  }

  if (screen === "intro") {
    return (
      <main className={`boot-shell ${bootComplete ? "system-ready" : "system-booting"}`}>
        <div className="scanlines" aria-hidden="true" /><div className="noise" aria-hidden="true" />
        {!bootComplete && (
          <section className="system-entry" aria-label="Inicialização segura da Rede Fantasma" aria-live="polite">
            <div className="system-entry-grid" aria-hidden="true" />
            <div className="system-entry-terminal">
              <div className="system-entry-topline">
                <span><i /> CANAL DE INICIALIZAÇÃO SEGURA</span>
                <div><b>AES-256</b><b>NÓ LOCAL 07</b><b>OFFLINE READY</b></div>
              </div>
              <div className="system-entry-brand">
                <span className="system-entry-logo"><i>07</i>RF<small>NET</small></span>
                <div className="system-entry-brand-copy"><small>PROTOCOLO DE RECUPERAÇÃO // NOVA AURORA</small><b>REDE FANTASMA</b><em>SECURE SYSTEM INTERFACE</em></div>
                <div className="system-entry-telemetry" aria-hidden="true"><span>UPLINK</span><b>•••</b><span>AUTH</span><b>OK</b></div>
              </div>
              <div className="boot-separator"><i /></div>
              <div className="boot-route" aria-label="Rastreamento do canal de recuperação">
                <span style={{ "--node-delay": "0.35s" } as CSSProperties}><i />OPERADOR<small>IDENTIDADE VERIFICADA</small></span>
                <b aria-hidden="true">11001010</b>
                <span style={{ "--node-delay": "0.9s" } as CSSProperties}><i />PCB-07<small>CHAVE EFÊMERA ATIVA</small></span>
                <b aria-hidden="true">01110110</b>
                <span className="route-warning" style={{ "--node-delay": "1.6s" } as CSSProperties}><i />GATEWAY<small>LINK INTERROMPIDO</small></span>
                <b aria-hidden="true">00000000</b>
                <span className="route-pending" style={{ "--node-delay": "2.25s" } as CSSProperties}><i />NOVA_AURORA_NET<small>AGUARDANDO ROTA</small></span>
              </div>
              <ol className="boot-log">
                <li style={{ "--delay": "0.25s" } as CSSProperties}><span>00:00:01</span><b>BIOS PCB-07</b><em>VERIFICADO</em></li>
                <li style={{ "--delay": "0.72s" } as CSSProperties}><span>00:00:02</span><b>MONTANDO NÚCLEO LOCAL</b><em>OK</em></li>
                <li style={{ "--delay": "1.2s" } as CSSProperties}><span>00:00:03</span><b>BUSCANDO ADAPTADOR WI-FI</b><em>ONLINE</em></li>
                <li className="boot-warning" style={{ "--delay": "1.75s" } as CSSProperties}><span>00:00:04</span><b>GATEWAY NOVA_AURORA_NET</b><em>INTERROMPIDO</em></li>
                <li style={{ "--delay": "2.35s" } as CSSProperties}><span>00:00:05</span><b>CARREGANDO PROTOCOLO LABIRINTO</b><em>03 NÍVEIS</em></li>
                <li style={{ "--delay": "2.95s" } as CSSProperties}><span>00:00:06</span><b>AUTENTICANDO OPERADOR</b><em>ACEITO</em></li>
              </ol>
              <div className="boot-progress"><div><i /></div><span>ESTABELECENDO SESSÃO SEGURA</span><b>100%</b></div>
              <div className="access-granted">
                <div className="access-granted-status"><i>✓</i><span><b>ACESSO CONCEDIDO</b><small>IDENTIDADE DO OPERADOR CONFIRMADA</small></span></div>
                <strong>ENTRANDO NO SISTEMA…</strong>
              </div>
            </div>
            <button className="skip-boot" type="button" onClick={skipBoot}>PULAR INICIALIZAÇÃO <span>↵</span></button>
          </section>
        )}
        <header className="boot-header"><div className="brand-mark"><i /> REDE//FANTASMA</div><SoundButton soundOn={soundOn} onClick={toggleSound} /></header>
        <section className="intro-card" aria-labelledby="mission-title">
          <div className="eyebrow intro-commandbar">
            <span><b>root@nova-aurora:~#</b> ./rf_restore --node 07 --force</span>
            <strong><i /> LINK::DOWN</strong>
          </div>
          <div className="intro-grid">
            <div className="intro-copy-block">
              <div className="mission-alert"><b>ERR_0x7A</b><span>FALHA DE HANDSHAKE</span><em>PRIORIDADE_01</em></div>
              <h1 id="mission-title"><small>RECOVERY_TARGET //</small><span>REDE<br />FANTASMA</span></h1>
              <div className="mission-copy">
                <p><b>OBJ_01</b><span>Restabelecer NOVA_AURORA_NET através de 03 matrizes PCB.</span></p>
                <p><b>REGRA_07</b><span>Preserve as barras de conexão. Sem checkpoints.</span></p>
                <p><b>CONTROLE</b><span>Use <strong>WASD</strong> ou as <strong>setas no canto inferior direito do teclado</strong> para controlar a rota.</span></p>
              </div>
              <div className="mission-controls" aria-label="Controles do labirinto">
                <span className="control-option"><small>WASD</small><span className="key-cluster"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></span></span>
                <em>OU</em>
                <span className="control-option"><small>SETAS</small><span className="key-cluster"><kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd></span></span>
                <p><b>OBJETIVO</b><span>Conduza o sinal de A até B sem tocar nas paredes PCB.</span></p>
              </div>
              <button className="primary-action mission-action" type="button" onClick={beginMission}><span><small>EXEC</small><strong>./INICIAR_PROTOCOLO</strong></span><b aria-hidden="true">↵</b></button>
              <p className="local-note">[LOCAL_ONLY] MAPAS GERADOS EM TEMPO REAL :: SEM ASSET EXTERNO</p>
            </div>
            <div className="network-preview" aria-label="Central de defesa cibernética da Nova Aurora">
              <div className="status-row"><span><i className="security-led" /> SENTINELA PCB // NOVA AURORA</span><strong><i /> MONITORAMENTO ATIVO</strong></div>
              <div className="radar" role="img" aria-label="Radar de ameaças protegendo um núcleo PCB criptografado">
                <span className="radar-code code-top">0x7A // TLS_1.3</span><span className="radar-code code-bottom">PORT_443 // ZERO_TRUST</span>
                <span className="scan-sector" /><span className="ring ring-one" /><span className="ring ring-two" /><span className="ring ring-three" />
                <i className="security-axis axis-x" /><i className="security-axis axis-y" />
                <span className="security-link link-a"><i className="route" /><span className="node-anchor"><span className="node"><i /><b>IDS-01</b><small>BLOQUEADO</small></span></span></span>
                <span className="security-link link-b"><i className="route" /><span className="node-anchor"><span className="node"><i /><b>MITM</b><small>ISOLADO</small></span></span></span>
                <span className="security-link link-c"><i className="route" /><span className="node-anchor"><span className="node"><i /><b>CVE-07</b><small>CONTIDO</small></span></span></span>
                <span className="security-link link-d"><i className="route" /><span className="node-anchor"><span className="node"><i /><b>BOTNET</b><small>NEGADO</small></span></span></span>
                <span className="router"><i className="core-lock" /><b>PCB CORE</b><small>AES-256</small><em>SEGURO</em></span>
              </div>
              <div className="security-metrics"><span><small>FIREWALL</small><b>ARMADO</b></span><span><small>IDS</small><b>04 ALVOS</b></span><span><small>CRIPTOGRAFIA</small><b>ATIVA</b></span></div>
              <div className="telemetry"><span>ENTROPIA DE GERAÇÃO</span><div><i /></div><b>100%</b></div>
            </div>
          </div>
        </section>
        <footer className="boot-footer"><span>USE AS SETAS OU WASD PARA ESTENDER A ROTA</span><span>NOVA_AURORA_NET // ACESSO DE EMERGÊNCIA</span></footer>
      </main>
    );
  }

  if (screen === "victory" && victoryStage === "blackout") {
    return <main className="victory-blackout" aria-label="Sistema temporariamente sem sinal" />;
  }
  if (screen === "victory" && victoryStage === "terminal") {
    return (
      <main className="terminal-blackout" aria-labelledby="terminal-title">
        <header className="terminal-header"><strong id="terminal-title">NOVA AURORA SECURE LINUX</strong><span>tty1 · kernel 6.12.9-rf · x86_64</span></header>
        <section className="terminal-workspace">
          <section className="terminal-stream" aria-live="polite" aria-label="Terminal Linux emitindo comandos simulados">
            {terminalLines.map((line) => <p className={`terminal-${line.kind}`} key={line.id}>{line.text}</p>)}
            <p className="terminal-active-prompt"><b>root@nova-aurora</b>:<span>/opt/rede-fantasma</span># <i /></p>
          </section>
          <aside className="terminal-success-panel" aria-label="Confirmação de missão concluída">
            <header className="terminal-success-head"><span><i /> SECURE HANDSHAKE</span><b>ONLINE</b></header>
            <section className="terminal-success-hero"><span className="terminal-success-seal" aria-hidden="true">✓</span><div><small>PROTOCOLO FINALIZADO</small><strong>ACESSO<br />RESTAURADO</strong></div></section>
            <div className="terminal-success-progress"><span><b>ROTAS SINCRONIZADAS</b><em>03/03</em></span><div><i /></div></div>
            <p>Parabéns, operador. O handshake da Nova Aurora foi aceito. Dois fragmentos criptografados ainda aguardam validação manual para concluir a leitura do sinal.</p>
            <section className="terminal-decrypt-grid" aria-label="Fragmentos criptografados para revelar">
              <LetterRevealBox finalLetter="N" slot={1} />
              <LetterRevealBox finalLetter="O" slot={2} />
            </section>
            <div className="terminal-earth-stage"><span>GEO_NODE // TERRA</span><b>LINK GLOBAL ATIVO</b><WireframeEarth /></div>
            <footer className="terminal-success-foot"><span>ROOT AUTH // NOVA_AURORA_NET</span><b>CRC: 7F3A-09C1</b></footer>
          </aside>
        </section>
        <nav className="terminal-controls" aria-label="Controles do protocolo"><button type="button" onClick={beginMission}>[ R ] REINICIAR</button><button type="button" onClick={returnToProtocol}>[ ESC ] SAIR</button></nav>
      </main>
    );
  }

  const malwareActive = screen === "victory" && (victoryStage === "swarm" || victoryStage === "freeze");

  return (
    <main className={`game-page ${screen === "game" || malwareActive ? "cursor-hidden" : ""}`}><div className="scanlines" aria-hidden="true" />
      <header className="game-topbar"><div className="phase-track" aria-label="Progresso dos labirintos"><span className={snapshot.phase >= 1 ? "active" : ""} aria-label="Fase 1"><b>1</b></span><i /><span className={snapshot.phase >= 2 ? "active" : ""} aria-label="Fase 2"><b>2</b></span><i /><span className={snapshot.phase >= 3 ? "active" : ""} aria-label="Fase 3"><b>3</b></span></div></header>
      <section className="game-layout">
        <section className="board-column" aria-label="Área do minigame">
          <div className="board-frame"><div className="board-titlebar"><span><i /> LABIRINTO_PCB_{String(snapshot.phase).padStart(2, "0")}</span><span className={screen === "gameover" ? "danger-text" : "live-text"}>{screen === "gameover" ? "● SEM CONEXÃO" : startGate ? startGate.kind === "retry" ? "● RECUPERANDO ROTA" : snapshot.phase === 1 ? "◌ SINCRONIZANDO" : "◌ PREPARANDO ROTA" : isPaused ? "Ⅱ PAUSADO" : "● A→B · FRAME SYNC"}</span></div>
            <div className="canvas-wrap"><canvas ref={canvasRef} className="network-canvas" width={1218} height={729} tabIndex={0} onKeyDown={handleCanvasKey} aria-label="Labirinto aleatório de blocos de placa-mãe, peças tetrominó, grandes núcleos CPU, corredores de largura variável e rotatórias quadradas. Estenda a rota diretamente do ponto A ao ponto B usando as setas ou WASD." />
              {isPaused && screen === "game" && <div className="board-overlay pause-overlay"><span className="overlay-icon">Ⅱ</span><p>SISTEMA SUSPENSO</p><h2>Transmissão pausada</h2><button className="primary-action compact-action" type="button" onClick={togglePause}>RETOMAR SINAL <b>▶</b></button></div>}
              {startGate && <div className={`board-overlay start-gate-overlay ${startGate.kind === "retry" ? "retry-gate" : ""}`}><span className={`overlay-status ${startGate.kind === "retry" ? "danger-text" : ""}`}>{startGate.kind === "retry" ? "FALHA DE CONEXÃO · REINICIALIZAÇÃO" : `ACESSANDO LABIRINTO ${["", "I", "II", "III"][snapshot.phase]}`}</span><h2>{startGate.kind === "retry" ? "Rota reiniciada." : snapshot.phase === 1 ? "Sincronizando placa…" : "Preparando próxima rota…"}</h2><p>{startGate.kind === "retry" ? `${failReason} Uma barra foi consumida.` : snapshot.phase === 1 ? "Estabelecendo a conexão inicial com o ponto A." : "O sinal será liberado assim que a nova rota estiver pronta."}</p><div className="gate-progress" style={{ "--gate-duration": `${startGate.delayMs}ms` } as CSSProperties}><i /></div><b className="gate-delay">{(startGate.delayMs / 1000).toFixed(1).replace(".", ",")} S</b></div>}
              {(screen === "transition" || malwareActive) && <div className="board-overlay completion-overlay"><section className={`completion-card ${snapshot.phase === 3 ? "final-completion-card" : ""}`} role="status" aria-live="polite"><span><b>{snapshot.phase}/3</b> LABIRINTOS CONCLUÍDOS</span>{snapshot.phase < 3 && <i style={{ "--completion-delay": `${COMPLETED_MAZE_BLUR_MS}ms` } as CSSProperties} />}</section></div>}
              {screen === "gameover" && <div className="board-overlay gameover-overlay"><span className="overlay-status danger-text">CONNECTION BAR · 0/{MAX_CONNECTIONS}</span><h2>Rede desconectada.</h2><p>{failReason} Todas as barras de conexão foram consumidas.</p><div className="result-actions"><button className="primary-action danger-action" type="button" onClick={beginMission}>REINICIAR MISSÃO <b>↻</b></button><button className="secondary-action" type="button" onClick={returnToProtocol}>ABORTAR MISSÃO</button></div></div>}
            </div>
          </div>
          <div className="control-deck" aria-label="Controles do jogo">
            <div className="connection-system" aria-label={`${connections} de ${MAX_CONNECTIONS} barras de conexão restantes`}>
              <div><span>CONNECTION BAR</span><b>{connections}/{MAX_CONNECTIONS}</b></div>
              <i>
                {Array.from({ length: MAX_CONNECTIONS }, (_, index) => <em className={index < connections ? "active" : "lost"} key={index} />)}
                <span className="connection-globe" aria-hidden="true" />
              </i>
            </div>
            <div className="keyboard-hints"><span><kbd>WASD</kbd><kbd>↑↓←→</kbd> ESTENDER</span><span><kbd>ESPAÇO</kbd> PAUSAR</span><span><kbd>R</kbd> REPETIR FASE</span><span><kbd>M</kbd> SOM</span></div>
            <div className="d-pad"><button type="button" className="up" aria-label="Estender para cima" disabled={Boolean(startGate)} onPointerDown={(event) => { event.preventDefault(); queueDirection({ x: 0, y: -1 }); }}>↑</button><button type="button" className="left" aria-label="Estender para a esquerda" disabled={Boolean(startGate)} onPointerDown={(event) => { event.preventDefault(); queueDirection({ x: -1, y: 0 }); }}>←</button><button type="button" className="down" aria-label="Estender para baixo" disabled={Boolean(startGate)} onPointerDown={(event) => { event.preventDefault(); queueDirection({ x: 0, y: 1 }); }}>↓</button><button type="button" className="right" aria-label="Estender para a direita" disabled={Boolean(startGate)} onPointerDown={(event) => { event.preventDefault(); queueDirection({ x: 1, y: 0 }); }}>→</button></div>
          </div>
        </section>
      </section>
      {malwareActive && <section className={`virus-display virus-stage-${victoryStage}`} aria-labelledby="virus-display-title">
        <h1 className="virus-sr-only" id="virus-display-title">Padrão visual autorreplicante</h1>
        <div className="virus-spread-field" aria-label="Janela autorreplicante ricocheteando e deixando um rastro em cascata">
          {virusBlocks.map((block) => <span aria-hidden="true" className={`virus-block virus-trail-block virus-block-tone-${block.tone}`} key={block.id} style={{ "--block-x": `${block.x}%`, "--block-y": `${block.y}%`, "--block-width": `${block.width}vw`, "--block-height": `${block.height}vh`, "--block-z": block.id + 3 } as CSSProperties}>RESTAURAÇÃO COMPLETA</span>)}
          <span ref={virusLeaderElementRef} className="virus-block virus-leader virus-block-tone-0" style={{ "--block-x": `${-VIRUS_LEADER_WIDTH / 2}%`, "--block-y": "18%", "--block-width": `${VIRUS_LEADER_WIDTH}vw`, "--block-height": `${VIRUS_LEADER_HEIGHT}vh` } as CSSProperties}>RESTAURAÇÃO COMPLETA</span>
        </div>
      </section>}
    </main>
  );
}
