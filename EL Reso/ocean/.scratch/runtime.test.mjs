// src/game/types.ts
var AUV_DEFAULTS = {
  maxSpeed: 6.5,
  accel: 9,
  battery: 100,
  drainMove: 0.14,
  drainIdle: 0.03,
  drainCollect: 0.12,
  rechargeRate: 9,
  detectionRadius: 11,
  collectRange: 1.7,
  capacity: 24,
  radius: 0.8
};

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
export {
  BLOCKING,
  BUILTINS,
  INSTANT_ACTIONS,
  SENSORS,
  SuspendSignal,
  TICK,
  VMError,
  runProgramTick,
  setSampler,
  startProgram
};
