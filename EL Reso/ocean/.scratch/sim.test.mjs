// src/game/types.ts
var WORLD = {
  SIZE: 100,
  HALF: 50,
  MARGIN: 3,
  DEPTH: 46
};
var AUV_DEFAULTS = {
  maxSpeed: 6.5,
  accel: 9,
  battery: 100,
  drainMove: 0.14,
  drainIdle: 0.03,
  drainCollect: 0.12,
  rechargeRate: 9,
  detectionRadius: 15,
  collectRange: 1.7,
  capacity: 24,
  radius: 0.8
};
var WASTE_TYPES = [
  { kind: "bottle", label: "Plastic bottle", plastic: 1 },
  { kind: "bag", label: "Plastic bag", plastic: 2 },
  { kind: "container", label: "Container drum", plastic: 4 },
  { kind: "net", label: "Fishing net", plastic: 3 },
  { kind: "misc", label: "Debris", plastic: 1 }
];

// src/game/currents.ts
var M1_CODE = `// MISSION 1 \u2014 patrol the patch and sweep it clean
// Move to each corner to cover the whole area.

float patrolX[4] = { 20, 20, -20, -20 };
float patrolZ[4] = { 20, -20, -20, 20 };

void patrol() {
  for (int i = 0; i < 4; i++) {
    moveTo(patrolX[i], patrolZ[i]);
  }
}

void update() {
  if (detectTrash()) {
    goToTrash();
  } else {
    patrol();
  }
}
`;
var M2_CODE = `// MISSION 2 \u2014 the patch drifts with the current.
// keep chasing the nearest trash and collect it.

void patrol() {
  moveTo(-25, 25);
  moveTo(25, 25);
  moveTo(25, -25);
  moveTo(-25, -25);
}

void update() {
  if (detectTrash()) {
    goToTrash();
    collect();
  } else {
    patrol();
  }
}
`;
var M3_CODE = `// MISSION 3 \u2014 currents flip over time. watch the arrows!
// when the battery runs low, return to base to recharge.

void patrol() {
  moveTo(-30, 30);
  moveTo(30, 30);
  moveTo(30, -30);
  moveTo(-30, -30);
}

void update() {
  if (battery() < 25) {
    returnToBase();
  } else if (detectTrash()) {
    goToTrash();
    collect();
  } else {
    patrol();
  }
}
`;
var M4_CODE = `// MISSION 4 \u2014 the great garbage patch. several current
// zones push waste around. patrol near the strongest
// current edges where trash accumulates.

void patrol() {
  moveTo(-38, 38);
  moveTo(0, 42);
  moveTo(38, 38);
  moveTo(38, -38);
  moveTo(0, -42);
  moveTo(-38, -38);
}

void update() {
  if (battery() < 30) {
    returnToBase();
  } else if (detectTrash()) {
    goToTrash();
    collect();
  } else {
    patrol();
  }
}
`;
var M5_CODE = `// MISSION 5 \u2014 deep ocean recovery. obstacles everywhere,
// brutal currents, and a long way from base.
// avoidObstacle() lets the AUV dodge rocks on its way.

void patrol() {
  moveTo(-40, 0);
  moveTo(0, 40);
  moveTo(40, 0);
  moveTo(0, -40);
}

void update() {
  if (battery() < 40) {
    returnToBase();
  } else if (nearBase() && loadWeight() >= 20) {
    collect();
  } else if (detectTrash()) {
    goToTrash();
    collect();
  } else {
    patrol();
  }
}
`;
var MISSIONS = [
  {
    id: 1,
    name: "Training Grounds",
    brief: "Calm water. A small patch of plastic bottles drifted into the bay. Perfect conditions to test a patrol program on a single AUV.",
    garbageCount: 26,
    timeLimit: 300,
    fleetSize: 1,
    battery: 100,
    targetPct: 0.72,
    currentFalloff: 0.5,
    currents: [
      { cx: -18, cz: 10, radius: 40, angle: Math.PI / 2 + 0.25, strength: 0.35 },
      { cx: 20, cz: -14, radius: 38, angle: -Math.PI / 2 - 0.2, strength: 0.3 }
    ],
    obstacles: [],
    starterCode: M1_CODE,
    tips: [
      "press DEPLOY CODE to send the program to the AUV",
      "the AUV only collects when you call collect() within range",
      "use goToTrash() \u2014 it combines detection, navigation and collection"
    ]
  },
  {
    id: 2,
    name: "Drifting Plastic",
    brief: "A tidal stream is pushing a wide plastic slick south-west. Two AUVs share one program \u2014 split their patrol routes or they will all chase the same trash.",
    garbageCount: 55,
    timeLimit: 300,
    fleetSize: 2,
    battery: 100,
    targetPct: 0.75,
    currentFalloff: 0.45,
    currents: [
      { cx: -10, cz: 22, radius: 52, angle: Math.PI * 0.78, strength: 0.9 },
      { cx: 24, cz: -6, radius: 40, angle: Math.PI * 0.62, strength: 0.6 }
    ],
    obstacles: [],
    starterCode: M2_CODE,
    tips: [
      "currents push garbage \u2014 aim up-current of the patch",
      "detectTrash() has a limited radius, patrol wider",
      "loadWeight() tells you how full the AUV is"
    ]
  },
  {
    id: 3,
    name: "Current Trap",
    brief: "Converging currents spin the patch in circles. Intercepting here means fighting drift, and the fleet burns battery fast. Recharge at base or lose vehicles.",
    garbageCount: 70,
    timeLimit: 300,
    fleetSize: 3,
    battery: 100,
    targetPct: 0.7,
    currentFalloff: 0.42,
    currents: [
      { cx: 0, cz: 0, radius: 34, angle: 0, strength: 1.15 },
      { cx: -34, cz: 26, radius: 34, angle: Math.PI * 0.9, strength: 0.85 },
      { cx: 34, cz: -26, radius: 34, angle: Math.PI * 0.35, strength: 0.85 }
    ],
    obstacles: [],
    starterCode: M3_CODE,
    tips: [
      "battery() below 25 means it is time to returnToBase()",
      "idle AUVs still drain a little power",
      "followCurrent() rides the flow to save energy"
    ]
  },
  {
    id: 4,
    name: "The Great Garbage Patch",
    brief: "Five current gyres herd waste into rotating rafts across the whole sector. Four AUVs, one shared program, a hard deadline. Efficiency decides the mission.",
    garbageCount: 110,
    timeLimit: 300,
    fleetSize: 4,
    battery: 100,
    targetPct: 0.65,
    currentFalloff: 0.4,
    currents: [
      { cx: -32, cz: 32, radius: 30, angle: Math.PI * 0.75, strength: 1 },
      { cx: 34, cz: 30, radius: 30, angle: Math.PI * 0.25, strength: 0.8 },
      { cx: 0, cz: 0, radius: 36, angle: Math.PI * 1.5, strength: 1.2 },
      { cx: -36, cz: -30, radius: 30, angle: Math.PI * 1.2, strength: 0.8 },
      { cx: 34, cz: -34, radius: 30, angle: Math.PI * 1.75, strength: 1 }
    ],
    obstacles: [],
    starterCode: M4_CODE,
    tips: [
      "guard the gyre edges \u2014 trash accumulates there",
      "with 4 AUVs one shared program can collide: stagger waypoints with the AUV index",
      "the clock is the real enemy: every second of idle is wasted coverage"
    ]
  },
  {
    id: 5,
    name: "Deep Ocean Recovery",
    brief: "The final site: a deep trench current swirl, submerged container wrecks blocking paths, and half-charged batteries. Only sharp, efficient logic finishes this cleanup.",
    garbageCount: 120,
    timeLimit: 330,
    fleetSize: 4,
    battery: 70,
    targetPct: 0.6,
    currentFalloff: 0.38,
    currents: [
      { cx: -26, cz: 20, radius: 30, angle: Math.PI * 0.8, strength: 1.3 },
      { cx: 28, cz: 24, radius: 28, angle: Math.PI * 0.15, strength: 1.1 },
      { cx: 0, cz: -4, radius: 34, angle: Math.PI * 1.4, strength: 1.35 },
      { cx: -30, cz: -34, radius: 26, angle: Math.PI * 1.1, strength: 0.9 },
      { cx: 32, cz: -30, radius: 26, angle: Math.PI * 1.9, strength: 0.9 }
    ],
    obstacles: [
      { x: -14, z: -10, r: 4.2 },
      { x: 16, z: 12, r: 5 },
      { x: 30, z: -6, r: 3.6 },
      { x: -8, z: 26, r: 3.4 },
      { x: -30, z: 2, r: 3.2 },
      { x: 6, z: -30, r: 4.4 }
    ],
    starterCode: M5_CODE,
    tips: [
      "avoidObstacle() steers around the wrecks before they collide",
      "70% starting battery \u2014 plan recharge cycles into the route",
      "avoid fighting the swirl: cross it on the calm edges"
    ]
  }
];
function sampleCurrent(zones, x, z, t, falloff) {
  let vx = 0;
  let vz = 0;
  for (const zone of zones) {
    const dx = x - zone.cx;
    const dz = z - zone.cz;
    const d = Math.hypot(dx, dz);
    if (d > zone.radius) continue;
    const fall = 1 - d / zone.radius;
    const w = Math.pow(fall, falloff * 2);
    const a = zone.angle + Math.sin(t * 0.05 + zone.cx * 0.05) * 0.12;
    vx += Math.cos(a) * zone.strength * w;
    vz += Math.sin(a) * zone.strength * w;
  }
  return { vx, vz };
}
function spawnGarbage(count, idBase) {
  const items = [];
  const kinds = ["bottle", "bottle", "bag", "container", "net", "misc"];
  const maxR = WORLD.HALF - WORLD.MARGIN - 4;
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    let r;
    if (Math.random() < 0.65) {
      r = 10 + Math.random() * 12;
    } else {
      r = 20 + Math.pow(Math.random(), 0.7) * (maxR - 20);
    }
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    items.push({
      id: idBase + i,
      kind,
      pos: { x: Math.cos(a) * r, z: Math.sin(a) * r },
      vel: { x: 0, z: 0 },
      zone: -1,
      driftPhase: Math.random() * Math.PI * 2,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.8,
      plastic: kind === "container" ? 4 : kind === "net" ? 3 : kind === "bag" ? 2 : 1,
      collected: false,
      collectedAt: null,
      collectedBy: -1
    });
  }
  return items;
}

// src/game/runtime.ts
var TICK = 0.5;
var STEP_BUDGET = 2e4;
var MAX_CALL_DEPTH = 16;
var SuspendSignal = class {
  constructor(action) {
    this.action = action;
  }
};
var VMError = class extends Error {
  ce;
  constructor(ce) {
    super(ce.message);
    this.ce = ce;
  }
};
var verr = (line, message, hint) => {
  throw new VMError({ line, col: 1, message, hint });
};
var SENSORS = /* @__PURE__ */ new Set([
  "battery",
  "loadWeight",
  "trashCount",
  "nearBase",
  "heading",
  "random",
  "abs",
  "min",
  "max",
  "currentDir",
  "currentStrength",
  "detectTrash",
  "nearestTrash",
  "distTo"
]);
var INSTANT_ACTIONS = /* @__PURE__ */ new Set(["setSpeed", "log"]);
var BLOCKING = /* @__PURE__ */ new Set([
  "moveTo",
  "move",
  "scan",
  "collect",
  "returnToBase",
  "followCurrent",
  "avoidObstacle",
  "goToTrash",
  "collectNearest",
  "wait"
]);
var BUILTINS = /* @__PURE__ */ new Set([...SENSORS, ...INSTANT_ACTIONS, ...BLOCKING]);
function startProgram(auv, program) {
  auv.program = program;
  auv.rt = {
    frames: [],
    globals: /* @__PURE__ */ new Map(),
    waiting: false,
    tickAccum: 0,
    steps: 0,
    finished: false,
    resume: false,
    version: program.version
  };
  auv.action = null;
  auv.actionQueue = [];
  auv.waypoints = [];
  auv.waypointIdx = 0;
  auv.lastMsg = "";
}
function runProgramTick(auv, host, dt) {
  const rt = auv.rt;
  if (rt.finished) return;
  if (auv.action) return;
  if (rt.waiting) {
    rt.tickAccum += dt;
    if (rt.tickAccum < TICK) return;
    rt.tickAccum = 0;
    rt.waiting = false;
  }
  rt.steps = 0;
  try {
    if (rt.frames.length === 0) {
      const init = auv.program.fns.get("__init__");
      if (init && !rt.globals.size) {
        pushFrame(rt, init, []);
        exec(auv, host);
      }
      const fn = auv.program.fns.get("update");
      if (!fn) {
        rt.finished = true;
        host.msg("\u26A0 program has no update() function \u2014 nothing will run");
        return;
      }
      pushFrame(rt, fn, []);
    } else if (rt.resume) {
      rt.resume = false;
      const fr = rt.frames[rt.frames.length - 1];
      const cur = topCursor(fr);
      if (cur) cur.ip++;
    }
    exec(auv, host);
    if (rt.frames.length === 0) rt.waiting = true;
  } catch (e) {
    if (e instanceof SuspendSignal) {
      auv.action = e.action;
      rt.resume = true;
      return;
    }
    throw e;
  }
}
function pushFrame(rt, fn, args) {
  if (rt.frames.length >= MAX_CALL_DEPTH) {
    verr(0, "too many nested calls \u2014 a function calls itself endlessly", "make sure recursive logic has a condition that stops it");
  }
  const locals = /* @__PURE__ */ new Map();
  fn.params.forEach((p, i) => {
    locals.set(p, args[i] ?? 0);
  });
  rt.frames.push({ fn, cursors: [{ list: fn.body, ip: 0 }], locals, loopStack: [], callReturn: null });
}
function topCursor(fr) {
  while (fr.cursors.length) {
    const c = fr.cursors[fr.cursors.length - 1];
    if (c.ip < c.list.length) return c;
    fr.cursors.pop();
  }
  return null;
}
function exec(auv, host) {
  const rt = auv.rt;
  for (; ; ) {
    if (++rt.steps > STEP_BUDGET) {
      verr(0, "your code ran too long without pausing \u2014 looks like an infinite loop", "let update() finish each tick; avoid tight while(true) loops around non-blocking commands");
    }
    const fr = rt.frames[rt.frames.length - 1];
    if (!fr) return;
    const cur = topCursor(fr);
    if (!cur) {
      rt.frames.pop();
      const caller = rt.frames[rt.frames.length - 1];
      if (caller && caller.callReturn) {
        const cc = caller.callReturn;
        caller.callReturn = null;
        cc.ip++;
      }
      continue;
    }
    const stmt = cur.list[cur.ip];
    const r = stepStmt(auv, host, fr, cur, stmt);
    if (r === "again") continue;
    if (r === "advance") cur.ip++;
  }
}
function stepStmt(auv, host, fr, cur, st) {
  switch (st.s) {
    case "expr": {
      if (st.expr.e === "call" && !BUILTINS.has(st.expr.name)) {
        const fn = auv.program.fns.get(st.expr.name);
        if (!fn) return verr(st.expr.line, `unknown command "${st.expr.name}()"`, "check the command reference for the correct name");
        const vals = st.expr.args.map((a) => evalExpr(auv, host, a, fr));
        fr.callReturn = cur;
        pushFrame(auv.rt, fn, vals);
        return "call";
      }
      evalExpr(auv, host, st.expr, fr);
      return "advance";
    }
    case "var": {
      const v = evalExpr(auv, host, st.init, fr);
      if (fr.fn.name === "__init__") auv.rt.globals.set(st.name, v);
      else fr.locals.set(st.name, v);
      return "advance";
    }
    case "varArr": {
      const items = st.items.map((it) => num(evalExpr(auv, host, it, fr)));
      if (fr.fn.name === "__init__") auv.rt.globals.set(st.name, items);
      else fr.locals.set(st.name, items);
      return "advance";
    }
    case "assign": {
      let v = evalExpr(auv, host, st.expr, fr);
      if (st.op !== "=") {
        const o = num(lookup(auv, fr, st.name));
        const d = num(v);
        v = st.op === "+=" ? o + d : st.op === "-=" ? o - d : st.op === "*=" ? o * d : d === 0 ? 0 : o / d;
      }
      store(auv, fr, st.name, v);
      return "advance";
    }
    case "assignIdx": {
      const arr = lookup(auv, fr, st.name);
      if (arr === void 0 || !Array.isArray(arr)) return verr(st.line, `"${st.name}" is not an array`, "arrays are declared like:  float xs[3] = { 1, 2, 3 };");
      const i = Math.trunc(num(evalExpr(auv, host, st.idx, fr)));
      if (i < 0 || i >= arr.length) return verr(st.line, `array index ${i} is outside "${st.name}" (size ${arr.length})`, "indexes start at 0");
      arr[i] = num(evalExpr(auv, host, st.expr, fr));
      return "advance";
    }
    case "if": {
      const c = truthy(evalExpr(auv, host, st.cond, fr));
      const list = c ? st.then : st.els ?? [];
      if (list.length) fr.cursors.push({ list, ip: 0 });
      return "advance";
    }
    case "block": {
      fr.cursors.push({ list: st.body, ip: 0 });
      return "advance";
    }
    case "while": {
      if (truthy(evalExpr(auv, host, st.cond, fr))) {
        fr.loopStack.push({ id: st.id, baseLen: fr.cursors.length });
        fr.cursors.push({ list: st.body, ip: 0 });
        return "again";
      }
      return "advance";
    }
    case "for": {
      const looping = fr.loopStack.some((l) => l.id === st.id);
      if (!looping) {
        if (st.init) void stepStmt(auv, host, fr, cur, st.init);
      } else {
        if (st.step) void stepStmt(auv, host, fr, cur, st.step);
      }
      if (!st.cond || truthy(evalExpr(auv, host, st.cond, fr))) {
        if (!looping) fr.loopStack.push({ id: st.id, baseLen: fr.cursors.length });
        fr.cursors.push({ list: st.body, ip: 0 });
        return "again";
      }
      fr.loopStack = fr.loopStack.filter((l) => l.id !== st.id);
      return "advance";
    }
    case "return": {
      while (fr.cursors.length) fr.cursors.pop();
      return "advance";
    }
    case "break": {
      const mark = fr.loopStack.pop();
      if (!mark) return verr(st.line, "break can only be used inside a while or for loop");
      while (fr.cursors.length > mark.baseLen) fr.cursors.pop();
      const parent = topCursor(fr);
      if (parent) parent.ip++;
      return "again";
    }
    default:
      return "advance";
  }
}
function lookup(auv, fr, name) {
  const rt = auv.rt;
  for (let i = rt.frames.length - 1; i >= 0; i--) {
    const f = rt.frames[i];
    if (f.locals.has(name)) return f.locals.get(name);
    if (f === fr) break;
  }
  return rt.globals.get(name);
}
function store(auv, fr, name, v) {
  const rt = auv.rt;
  for (let i = rt.frames.length - 1; i >= 0; i--) {
    const f = rt.frames[i];
    if (f.locals.has(name)) {
      f.locals.set(name, v);
      return;
    }
    if (f === fr) break;
  }
  if (rt.globals.has(name)) {
    rt.globals.set(name, v);
    return;
  }
  fr.locals.set(name, v);
}
function num(v) {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  }
  return 0;
}
function truthy(v) {
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") return v.length > 0;
  return false;
}
function evalExpr(auv, host, e, fr) {
  switch (e.e) {
    case "num":
      return e.v;
    case "str":
      return e.v;
    case "bool":
      return e.v ? 1 : 0;
    case "var": {
      const v = lookup(auv, fr, e.name);
      if (v === void 0) return verr(0, `unknown variable "${e.name}"`, "declare it first, like  int x = 5;  \u2014 or check the spelling");
      return v;
    }
    case "index": {
      const arr = lookup(auv, fr, e.name);
      if (arr === void 0 || !Array.isArray(arr)) return verr(e.line, `"${e.name}" is not an array`);
      const i = Math.trunc(num(evalExpr(auv, host, e.idx, fr)));
      if (i < 0 || i >= arr.length) return verr(e.line, `array index ${i} is outside "${e.name}" (size ${arr.length})`, "indexes start at 0");
      return arr[i];
    }
    case "bin": {
      if (e.op === "&&") return truthy(evalExpr(auv, host, e.a, fr)) && truthy(evalExpr(auv, host, e.b, fr)) ? 1 : 0;
      if (e.op === "||") return truthy(evalExpr(auv, host, e.a, fr)) || truthy(evalExpr(auv, host, e.b, fr)) ? 1 : 0;
      const a = evalExpr(auv, host, e.a, fr);
      const b = evalExpr(auv, host, e.b, fr);
      const x = num(a), y = num(b);
      switch (e.op) {
        case "+":
          return typeof a === "string" || typeof b === "string" ? String(a) + String(b) : x + y;
        case "-":
          return x - y;
        case "*":
          return x * y;
        case "/":
          return y === 0 ? 0 : x / y;
        case "%":
          return y === 0 ? 0 : x % y;
        case "==":
          return a === b || x === y ? 1 : 0;
        case "!=":
          return !(a === b || x === y) ? 1 : 0;
        case "<":
          return x < y ? 1 : 0;
        case ">":
          return x > y ? 1 : 0;
        case "<=":
          return x <= y ? 1 : 0;
        case ">=":
          return x >= y ? 1 : 0;
      }
      return 0;
    }
    case "un": {
      const v = evalExpr(auv, host, e.a, fr);
      return e.op === "-" ? -num(v) : truthy(v) ? 0 : 1;
    }
    case "call":
      return callBuiltin(auv, host, e, fr);
  }
}
var dist = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
function auvSpeed(auv) {
  const last = auv.actionQueue.length ? auv.actionQueue[auv.actionQueue.length - 1] : null;
  const mul = last?.kind === "setSpeed" ? last.args[0] : 1;
  return AUV_DEFAULTS.maxSpeed * mul * (auv.battery < 20 ? 0.55 : 1);
}
function nearestTrash(host, auv) {
  let best = null;
  let bestD = auv.detectionRadius;
  for (const g of host.garbage) {
    const d = dist(auv.pos.x, auv.pos.z, g.pos.x, g.pos.z);
    if (d < bestD) {
      bestD = d;
      best = g;
    }
  }
  return best;
}
function callBuiltin(auv, host, e, fr) {
  const name = e.name;
  if (!BUILTINS.has(name)) {
    verr(e.line, `"${name}()" is a function \u2014 call it on its own line, not inside another expression`, "example:\n  void update() {\n    myHelper();\n  }");
  }
  const arg = (i) => num(evalExpr(auv, host, e.args[i] ?? { id: 0, e: "num", v: 0 }, fr));
  switch (name) {
    case "battery":
      return auv.battery;
    case "loadWeight":
      return auv.load;
    case "trashCount":
      return host.garbage.length;
    case "nearBase":
      return dist(auv.pos.x, auv.pos.z, host.base.x, host.base.z) < 8 ? 1 : 0;
    case "heading":
      return auv.heading;
    case "random":
      return Math.random();
    case "abs":
      return Math.abs(arg(0));
    case "min":
      return Math.min(arg(0), arg(1));
    case "max":
      return Math.max(arg(0), arg(1));
    case "currentDir": {
      const s = getSampler(auv);
      return s ? s(auv.pos.x, auv.pos.z).angle : 0;
    }
    case "currentStrength": {
      const s = getSampler(auv);
      return s ? s(auv.pos.x, auv.pos.z).strength : 0;
    }
    case "detectTrash":
      return nearestTrash(host, auv) !== null ? 1 : 0;
    case "nearestTrash": {
      const t = nearestTrash(host, auv);
      return t ? t.id : -1;
    }
    case "distTo": {
      const t = host.garbage.find((g) => g.id === arg(0));
      return t ? dist(auv.pos.x, auv.pos.z, t.pos.x, t.pos.z) : 9999;
    }
    case "moveTo": {
      const x = arg(0), z = arg(1);
      const d = dist(auv.pos.x, auv.pos.z, x, z);
      const dur = Math.max(0.1, d / Math.max(1, auvSpeed(auv)));
      throw new SuspendSignal({ kind: "moveTo", args: [x, z], remaining: dur, duration: dur, target: { x, z } });
    }
    case "move": {
      const dir = arg(0);
      const d = 8;
      const dur = Math.max(0.1, d / Math.max(1, auvSpeed(auv)));
      throw new SuspendSignal({ kind: "move", args: [dir], remaining: dur, duration: dur, direction: dir, target: { x: auv.pos.x + Math.cos(dir) * d, z: auv.pos.z + Math.sin(dir) * d } });
    }
    case "scan": {
      const dur = 1.2;
      throw new SuspendSignal({ kind: "scan", args: [], remaining: dur, duration: dur });
    }
    case "collect": {
      const dur = auv.collectCooldown > 0 ? auv.collectCooldown : 0.7;
      throw new SuspendSignal({ kind: "collect", args: [], remaining: dur, duration: dur });
    }
    case "returnToBase": {
      const d = dist(auv.pos.x, auv.pos.z, host.base.x, host.base.z);
      const dur = Math.max(0.5, d / Math.max(1, auvSpeed(auv)));
      throw new SuspendSignal({ kind: "returnToBase", args: [], remaining: dur, duration: dur, target: { x: host.base.x, z: host.base.z } });
    }
    case "followCurrent": {
      const s = getSampler(auv);
      const a = s ? s(auv.pos.x, auv.pos.z).angle : auv.heading;
      const d = 10;
      const dur = Math.max(0.3, d / Math.max(1, auvSpeed(auv) * 1.3));
      throw new SuspendSignal({ kind: "followCurrent", args: [a], remaining: dur, duration: dur, direction: a, target: { x: auv.pos.x + Math.cos(a) * d, z: auv.pos.z + Math.sin(a) * d } });
    }
    case "avoidObstacle": {
      auv.avoidTurn = auv.avoidTurn === 0 ? 1 : -auv.avoidTurn;
      const side = auv.avoidTurn || 1;
      const a = auv.heading + side * (Math.PI / 2.2);
      const d = 9;
      const dur = Math.max(0.3, d / Math.max(1, auvSpeed(auv)));
      throw new SuspendSignal({ kind: "avoidObstacle", args: [a], remaining: dur, duration: dur, direction: a, target: { x: auv.pos.x + Math.cos(a) * d, z: auv.pos.z + Math.sin(a) * d } });
    }
    case "goToTrash": {
      const t = nearestTrash(host, auv);
      if (!t) return 0;
      throw new SuspendSignal({ kind: "moveTo", args: [t.pos.x, t.pos.z], remaining: 6, duration: 6, target: { x: t.pos.x, z: t.pos.z }, interceptId: t.id });
    }
    case "collectNearest": {
      const t = nearestTrash(host, auv);
      if (!t) return 0;
      throw new SuspendSignal({ kind: "collectNearest", args: [t.id], remaining: 3.2, duration: 3.2, target: { x: t.pos.x, z: t.pos.z }, interceptId: t.id });
    }
    case "wait": {
      const dur = Math.max(0.1, Math.min(10, arg(0)));
      throw new SuspendSignal({ kind: "wait", args: [], remaining: dur, duration: dur });
    }
    case "setSpeed": {
      const v = Math.max(0.3, Math.min(2, arg(0)));
      auv.actionQueue.push({ kind: "setSpeed", args: [v], remaining: 0, duration: 0 });
      if (auv.actionQueue.length > 8) auv.actionQueue.shift();
      return 0;
    }
    case "log": {
      const v = e.args[0] ? evalExpr(auv, host, e.args[0], fr) : "";
      host.msg(String(v));
      return 0;
    }
  }
  return 0;
}
function getSampler(auv) {
  return auv._sampler ?? null;
}
function setSampler(auv, fn) {
  ;
  auv._sampler = fn;
}

// src/game/sim.ts
var BASE = { x: 0, z: 0 };
function makeAuv(id, battery) {
  const a = id * 1.9;
  return {
    id,
    name: `AUV-${String(id + 1).padStart(2, "0")}`,
    pos: { x: Math.cos(a) * 5, z: Math.sin(a) * 5 },
    vel: { x: 0, z: 0 },
    heading: Math.random() * Math.PI * 2,
    battery,
    capacity: AUV_DEFAULTS.capacity,
    load: 0,
    detectionRadius: AUV_DEFAULTS.detectionRadius,
    state: "idle",
    collectedCount: 0,
    loadPlastic: 0,
    program: null,
    rt: null,
    action: null,
    actionQueue: [],
    waypoints: [],
    waypointIdx: 0,
    avoidTurn: 1,
    collectCooldown: 0,
    lastMsg: "",
    totalPlastic: 0
  };
}
var Simulation = class {
  mission;
  garbage = [];
  auvs = [];
  time = 0;
  phase = "briefing";
  simSpeed = 1;
  logs = [];
  stats = { collectedCount: 0, collectedPlastic: 0, totalPlastic: 0, areaCleanedKm2: 0, batteryUsed: 0 };
  fx = [];
  obstacleHits = 0;
  nextId = 1;
  cb;
  nextProgVersion = 1;
  constructor(missionId, cb) {
    this.mission = MISSIONS[missionId] ?? MISSIONS[0];
    this.cb = cb;
    this.reset();
  }
  reset() {
    this.time = 0;
    this.phase = "briefing";
    this.logs = [];
    this.fx = [];
    this.obstacleHits = 0;
    this.nextId = 1;
    this.garbage = spawnGarbage(this.mission.garbageCount, 1);
    this.nextId = this.garbage.length + 1;
    this.auvs = [];
    for (let i = 0; i < this.mission.fleetSize; i++) {
      this.auvs.push(makeAuv(i, this.mission.battery));
      setSampler(this.auvs[i], (x, z) => {
        const c = sampleCurrent(this.mission.currents, x, z, this.time, this.mission.currentFalloff);
        const a = Math.atan2(c.vz, c.vx);
        return { angle: a, strength: Math.hypot(c.vx, c.vz) };
      });
    }
    const tp = this.garbage.reduce((s, g) => s + g.plastic, 0);
    this.stats = { collectedCount: 0, collectedPlastic: 0, totalPlastic: tp, areaCleanedKm2: 0, batteryUsed: 0 };
    this.log(`mission "${this.mission.name}" loaded \u2014 ${this.garbage.length} debris objects, ${this.auvs.length} AUV${this.auvs.length > 1 ? "s" : ""} ready`, "info");
  }
  log(text, kind = "info") {
    this.logs.push({ t: this.time, text, kind });
    if (this.logs.length > 120) this.logs.shift();
    this.cb.onLog({ t: this.time, text, kind });
  }
  deploy(program, targets) {
    let n = 0;
    for (const id of targets) {
      const auv = this.auvs.find((a) => a.id === id);
      if (!auv) continue;
      startProgram(auv, program);
      auv.program = { ...program, version: this.nextProgVersion++ };
      auv.rt.version = auv.program.version;
      n++;
    }
    if (n > 0) this.log(`deployed program v${this.nextProgVersion - 1} to ${n} AUV${n > 1 ? "s" : ""}`, "success");
    else this.log("no AUV selected \u2014 select targets in the fleet panel first", "warn");
  }
  begin() {
    if (this.phase === "briefing") this.phase = "running";
  }
  step(dtRaw) {
    if (this.phase !== "running") return;
    const dt = Math.min(dtRaw, 0.1) * this.simSpeed;
    this.time += dt;
    const cf = this.mission.currentFalloff;
    for (const g of this.garbage) {
      if (g.collected) continue;
      const c = sampleCurrent(this.mission.currents, g.pos.x, g.pos.z, this.time, cf);
      const drift = Math.sin(this.time * 0.4 + g.driftPhase) * 0.12;
      g.vel.x = c.vx + drift;
      g.vel.z = c.vz + Math.cos(this.time * 0.3 + g.driftPhase) * 0.12;
      g.pos.x += g.vel.x * dt;
      g.pos.z += g.vel.z * dt;
      g.rot += g.rotSpeed * dt;
      const r = Math.hypot(g.pos.x, g.pos.z);
      const maxR = WORLD.HALF - 2;
      if (r > maxR) {
        g.pos.x *= maxR / r;
        g.pos.z *= maxR / r;
      }
    }
    for (const auv of this.auvs) {
      this.stepAuv(auv, dt);
    }
    for (let i = this.fx.length - 1; i >= 0; i--) {
      this.fx[i].t += dt;
      if (this.fx[i].t > 1.2) this.fx.splice(i, 1);
    }
    const total = this.garbage.length;
    const collected = this.garbage.filter((g) => g.collected).length;
    const pct = total ? collected / total : 1;
    const alive = this.auvs.some((a) => a.battery > 1);
    if (pct >= this.mission.targetPct) {
      this.phase = "complete";
      this.cb.onMissionEnd(true, "cleanup target reached", this.stats, this.mission.timeLimit - this.time);
    } else if (this.time >= this.mission.timeLimit) {
      this.phase = "failed";
      this.cb.onMissionEnd(false, "time expired", this.stats, 0);
    } else if (!alive) {
      this.phase = "failed";
      this.cb.onMissionEnd(false, "entire fleet out of power", this.stats, 0);
    }
    const sweep = Math.PI * AUV_DEFAULTS.detectionRadius ** 2 * this.stats.collectedCount;
    this.stats.areaCleanedKm2 = Math.min(this.mission.garbageCount * 3.2 / 100, sweep / 1e3);
  }
  stepAuv(auv, dt) {
    const dead = auv.battery <= 0;
    const speed = Math.hypot(auv.vel.x, auv.vel.z);
    let drain = speed > 0.4 ? AUV_DEFAULTS.drainMove : AUV_DEFAULTS.drainIdle;
    if (auv.state === "collecting") drain += AUV_DEFAULTS.drainCollect;
    if (!dead && auv.program) {
      auv.battery = Math.max(0, auv.battery - drain * dt);
      this.stats.batteryUsed += drain * dt;
    }
    const distBase = Math.hypot(auv.pos.x - BASE.x, auv.pos.z - BASE.z);
    if (distBase < 6 && auv.battery < 100 && (auv.state === "recharge" || dead)) {
      auv.battery = Math.min(100, auv.battery + AUV_DEFAULTS.rechargeRate * dt);
      auv.state = "recharge";
      auv.action = null;
      if (auv.battery >= 99.5) {
        auv.state = "idle";
        auv.rt.waiting = false;
        this.log(`${auv.name} recharged \u2014 back on station`, "success");
      }
      return;
    }
    if (dead) {
      auv.state = "lowbattery";
      return;
    }
    if (distBase < 6 && auv.load > 0) {
      this.stats.collectedCount += auv.collectedCount;
      this.stats.collectedPlastic += auv.loadPlastic;
      auv.collectedCount = 0;
      auv.load = 0;
      auv.loadPlastic = 0;
    }
    if (auv.action) {
      this.runAction(auv, dt);
    }
    if (auv.program && auv.rt) {
      try {
        runProgramTick(auv, {
          auv,
          simTime: this.time,
          garbage: this.garbage.filter((g) => !g.collected),
          base: BASE,
          msg: (s) => this.log(`${auv.name} \u25B8 ${s}`, "info"),
          collect: (a, targetId) => this.tryCollect(a, targetId)
        }, dt);
      } catch (e) {
        if (e instanceof VMError) {
          this.log(`${auv.name} runtime error \u2014 line ${e.ce.line}: ${e.ce.message}${e.ce.hint ? `
  hint: ${e.ce.hint}` : ""}`, "error");
          auv.rt.finished = true;
          auv.state = "idle";
          auv.action = null;
        } else throw e;
      }
    }
    if (auv.state !== "recharge") {
      const c = sampleCurrent(this.mission.currents, auv.pos.x, auv.pos.z, this.time, this.mission.currentFalloff);
      auv.pos.x += c.vx * dt * 0.35;
      auv.pos.z += c.vz * dt * 0.35;
    }
    for (const ob of this.mission.obstacles) {
      const dx = auv.pos.x - ob.x;
      const dz = auv.pos.z - ob.z;
      const d = Math.hypot(dx, dz);
      const min = ob.r + AUV_DEFAULTS.radius;
      if (d < min) {
        auv.pos.x = ob.x + dx / (d || 1) * min;
        auv.pos.z = ob.z + dz / (d || 1) * min;
        this.obstacleHits++;
      } else if (d < min + 4) {
        auv.pos.x += dx / d * dt * 2.2;
        auv.pos.z += dz / d * dt * 2.2;
      }
    }
    const r = Math.hypot(auv.pos.x, auv.pos.z);
    const maxR = WORLD.HALF - 1.5;
    if (r > maxR) {
      auv.pos.x *= maxR / r;
      auv.pos.z *= maxR / r;
    }
    if (auv.battery < 25 && auv.state !== "recharge" && auv.state !== "return") {
      auv.state = "lowbattery";
    }
  }
  runAction(auv, dt) {
    const act = auv.action;
    const speed = AUV_DEFAULTS.maxSpeed * (auv.actionQueue.length && auv.actionQueue[auv.actionQueue.length - 1].kind === "setSpeed" ? auv.actionQueue[auv.actionQueue.length - 1].args[0] : 1) * (auv.battery < 20 ? 0.55 : 1);
    if (act.interceptId !== void 0) {
      const t = this.garbage.find((g) => g.id === act.interceptId && !g.collected);
      if (t) act.target = { x: t.pos.x, z: t.pos.z };
      else {
        auv.action = null;
        return;
      }
    }
    let tx = act.target?.x ?? auv.pos.x;
    let tz = act.target?.z ?? auv.pos.z;
    if (act.kind === "returnToBase") {
      tx = BASE.x;
      tz = BASE.z;
    }
    const dx = tx - auv.pos.x;
    const dz = tz - auv.pos.z;
    const d = Math.hypot(dx, dz);
    if (act.kind === "collect" || act.kind === "collectNearest") {
      if (act.kind === "collectNearest" && d > AUV_DEFAULTS.collectRange) {
        this.steer(auv, tx, tz, speed, dt);
        auv.state = "intercept";
        act.remaining -= dt;
        if (act.remaining <= 0) auv.action = null;
        return;
      }
      auv.state = "collecting";
      const got = this.tryCollect(auv, act.interceptId ?? this.nearestInCollectRange(auv));
      act.remaining -= dt;
      if (act.remaining <= 0) {
        auv.action = null;
        if (!got) auv.collectCooldown = 0.5;
      }
      return;
    }
    if (act.kind === "scan") {
      auv.state = "patrol";
      act.remaining -= dt;
      if (act.remaining <= 0) auv.action = null;
      return;
    }
    if (act.kind === "wait") {
      auv.state = "idle";
      act.remaining -= dt;
      if (act.remaining <= 0) auv.action = null;
      return;
    }
    if (act.kind === "setSpeed") {
      auv.action = null;
      return;
    }
    const arrive = d < (act.kind === "returnToBase" ? 5.5 : act.interceptId !== void 0 ? AUV_DEFAULTS.collectRange : 0.9);
    if (arrive) {
      auv.action = null;
      if (act.interceptId !== void 0) this.tryCollect(auv, act.interceptId);
      return;
    }
    auv.state = act.kind === "returnToBase" ? "return" : act.interceptId !== void 0 ? "intercept" : "patrol";
    this.steer(auv, tx, tz, speed, dt);
    act.remaining -= dt;
    if (act.remaining <= 0) auv.action = null;
  }
  steer(auv, tx, tz, speed, dt) {
    const dx = tx - auv.pos.x;
    const dz = tz - auv.pos.z;
    const d = Math.hypot(dx, dz) || 1;
    const desiredVx = dx / d * speed;
    const desiredVz = dz / d * speed;
    const acc = AUV_DEFAULTS.accel;
    auv.vel.x += Math.max(-acc * dt, Math.min(acc * dt, desiredVx - auv.vel.x));
    auv.vel.z += Math.max(-acc * dt, Math.min(acc * dt, desiredVz - auv.vel.z));
    auv.pos.x += auv.vel.x * dt;
    auv.pos.z += auv.vel.z * dt;
    if (speed > 0.1) auv.heading = Math.atan2(auv.vel.z, auv.vel.x);
  }
  nearestInCollectRange(auv) {
    let best = -1;
    let bestD = AUV_DEFAULTS.collectRange;
    for (const g of this.garbage) {
      if (g.collected) continue;
      const d = Math.hypot(auv.pos.x - g.pos.x, auv.pos.z - g.pos.z);
      if (d < bestD) {
        bestD = d;
        best = g.id;
      }
    }
    return best;
  }
  tryCollect(auv, targetId) {
    if (auv.load >= auv.capacity) return false;
    const id = targetId >= 0 ? targetId : this.nearestInCollectRange(auv);
    if (id < 0) return false;
    const g = this.garbage.find((x) => x.id === id);
    if (!g || g.collected) return false;
    const d = Math.hypot(auv.pos.x - g.pos.x, auv.pos.z - g.pos.z);
    if (d > AUV_DEFAULTS.collectRange * 1.6) return false;
    g.collected = true;
    g.collectedAt = { x: g.pos.x, z: g.pos.z };
    g.collectedBy = auv.id;
    auv.collectedCount++;
    auv.load += 1;
    auv.loadPlastic += g.plastic;
    auv.totalPlastic += g.plastic;
    auv.collectCooldown = 0.55;
    this.fx.push({ x: g.pos.x, z: g.pos.z, t: 0 });
    return true;
  }
  collectFx() {
    return this.fx;
  }
  snapshot() {
    const collected = this.garbage.filter((g) => g.collected).length;
    return {
      time: this.time,
      timeLeft: Math.max(0, this.mission.timeLimit - this.time),
      collected,
      total: this.garbage.length,
      plastic: this.stats.collectedPlastic + this.auvs.reduce((s, a) => s + a.loadPlastic, 0),
      totalPlastic: this.stats.totalPlastic,
      phase: this.phase,
      auvs: this.auvs,
      logs: this.logs,
      stats: this.stats,
      fx: this.fx,
      obstacleHits: this.obstacleHits
    };
  }
};
export {
  BASE,
  Simulation,
  WASTE_TYPES
};
