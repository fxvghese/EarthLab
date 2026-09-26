import type { CodeError, DeployedProgram } from './types'

export interface FnDecl {
  name: string
  params: string[]
  body: Stmt[]
}

/* ───────────────────────────── tokens ───────────────────────────── */

type TokKind = 'ident' | 'num' | 'str' | 'punct' | 'kw' | 'eof'

interface Tok {
  kind: TokKind
  text: string
  line: number
  col: number
}

const KEYWORDS = new Set([
  'void', 'if', 'else', 'while', 'for', 'return', 'true', 'false', 'break',
])

const PUNCT = [
  '==', '!=', '<=', '>=', '&&', '||', '++', '--',
  '+=', '-=', '*=', '/=', '(', ')', '{', '}', '[', ']',
  ';', ',', '=', '<', '>', '+', '-', '*', '/', '%', '!',
]

/* ───────────────────────────── AST ───────────────────────────── */

export type Expr =
  | { id: number; e: 'num'; v: number }
  | { id: number; e: 'str'; v: string }
  | { id: number; e: 'bool'; v: boolean }
  | { id: number; e: 'var'; name: string }
  | { id: number; e: 'index'; name: string; idx: Expr; line: number }
  | { id: number; e: 'bin'; op: string; a: Expr; b: Expr }
  | { id: number; e: 'un'; op: string; a: Expr }
  | { id: number; e: 'call'; name: string; args: Expr[]; line: number }

export type Stmt =
  | { id: number; s: 'expr'; expr: Expr; line: number }
  | { id: number; s: 'var'; name: string; init: Expr; line: number }
  | { id: number; s: 'varArr'; name: string; items: Expr[]; line: number }
  | { id: number; s: 'assignIdx'; name: string; idx: Expr; expr: Expr; line: number }
  | { id: number; s: 'assign'; name: string; op: string; expr: Expr; line: number }
  | { id: number; s: 'if'; cond: Expr; then: Stmt[]; els: Stmt[] | null; line: number }
  | { id: number; s: 'while'; cond: Expr; body: Stmt[]; line: number }
  | { id: number; s: 'for'; init: Stmt | null; cond: Expr | null; step: Stmt | null; body: Stmt[]; line: number }
  | { id: number; s: 'block'; body: Stmt[]; line: number }
  | { id: number; s: 'return'; expr: Expr | null; line: number }
  | { id: number; s: 'break'; line: number }

let nextId = 1
const nid = () => nextId++

/* ───────────────────────────── lexer ───────────────────────────── */

function lex(src: string): Tok[] | CodeError {
  const toks: Tok[] = []
  let i = 0
  let line = 1
  let col = 1
  const n = src.length
  const push = (kind: TokKind, text: string, l = line, c = col) => toks.push({ kind, text, line: l, col: c })

  while (i < n) {
    const ch = src[i]
    if (ch === '\n') { i++; line++; col = 1; continue }
    if (ch === ' ' || ch === '\t' || ch === '\r') { i++; col++; continue }
    // comments
    if (ch === '/' && src[i + 1] === '/') {
      while (i < n && src[i] !== '\n') i++
      continue
    }
    if (ch === '/' && src[i + 1] === '*') {
      const sl = line
      i += 2; col += 2
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) {
        if (src[i] === '\n') { line++; col = 1 } else col++
        i++
      }
      if (i >= n) return { line: sl, col, message: 'unterminated block comment — add a closing */', hint: 'block comments start with /* and must end with */' }
      i += 2; col += 2
      continue
    }
    // strings
    if (ch === '"') {
      const sl = line, sc = col
      i++; col++
      let s = ''
      while (i < n && src[i] !== '"') {
        if (src[i] === '\n') return { line: sl, col: sc, message: 'string is missing its closing quote "', hint: 'strings look like "N", "E", "S", "W"' }
        s += src[i]; i++; col++
      }
      if (i >= n) return { line: sl, col: sc, message: 'string is missing its closing quote "', hint: 'strings look like "N", "E", "S", "W"' }
      i++; col++
      push('str', s, sl, sc)
      continue
    }
    // numbers
    if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(src[i + 1] ?? ''))) {
      let s = ''
      while (i < n && /[0-9.]/.test(src[i])) { s += src[i]; i++; col++ }
      if ((s.match(/\./g) ?? []).length > 1) return { line, col, message: `malformed number "${s}"` }
      push('num', s)
      continue
    }
    // identifiers / keywords
    if (/[A-Za-z_]/.test(ch)) {
      let s = ''
      while (i < n && /[A-Za-z0-9_]/.test(src[i])) { s += src[i]; i++; col++ }
      push(KEYWORDS.has(s) ? 'kw' : 'ident', s)
      continue
    }
    // punct
    const three = src.slice(i, i + 3)
    void three
    let matched: string | null = null
    for (const p of PUNCT) {
      if (p.length >= 2 && src.startsWith(p, i)) { matched = p; break }
    }
    if (!matched) matched = PUNCT.find((p) => p.length === 1 && p === ch) ?? null
    if (matched) {
      push('punct', matched)
      i += matched.length
      col += matched.length
      continue
    }
    return { line, col, message: `unexpected character "${ch}"`, hint: 'the AUV language only understands letters, numbers, and basic symbols' }
  }
  toks.push({ kind: 'eof', text: '', line, col })
  return toks
}

/* ───────────────────────────── parser ───────────────────────────── */

class ParseErr extends Error {
  err: CodeError
  constructor(err: CodeError) { super(err.message); this.err = err }
}

class Parser {
  t: Tok[]
  p = 0
  constructor(toks: Tok[]) { this.t = toks }

  peek(o = 0): Tok { return this.t[Math.min(this.p + o, this.t.length - 1)] }
  next(): Tok { return this.t[this.p++] }
  at(text: string): boolean { return this.peek().text === text }
  atKind(kind: TokKind): boolean { return this.peek().kind === kind }

  err(line: number, col: number, message: string, hint?: string): never {
    throw new ParseErr({ line, col, message, hint })
  }

  expect(text: string, what: string): Tok {
    if (this.at(text)) return this.next()
    const tk = this.peek()
    this.err(tk.line, tk.col, `expected "${text}" ${what}`, `found "${tk.text || 'end of file'}" instead`)
  }

  skipIf(text: string): boolean {
    if (this.at(text)) { this.next(); return true }
    return false
  }

  /* program = (fnDecl | globalVarDecl)* — globals are hoisted into a hidden __init() fn */
  parseProgram(): FnDecl[] {
    const fns: FnDecl[] = []
    const globals: Stmt[] = []
    while (!this.atKind('eof')) {
      const tk = this.peek()
      if (tk.kind === 'ident' && ['int', 'float', 'num'].includes(tk.text) && this.peek(1).kind === 'ident') {
        globals.push(this.parseStmt())
      } else {
        fns.push(this.parseFn())
      }
    }
    if (globals.length) {
      fns.push({ name: '__init__', params: [], body: globals })
    }
    return fns
  }

  parseFn(): FnDecl {
    const ret = this.next() // 'void'
    if (ret.kind !== 'kw' || ret.text !== 'void')
      this.err(ret.line, ret.col, 'every function starts with the word "void"', 'example:  void patrol() { ... }')
    const name = this.next()
    if (name.kind !== 'ident')
      this.err(name.line, name.col, 'expected a function name after void', 'example:  void patrol() { ... }')
    this.expect('(', `to start the parameter list of "${name.text}"`)
    const params: string[] = []
    if (!this.at(')')) {
      do {
        const pt = this.next()
        if (pt.kind !== 'ident') this.err(pt.line, pt.col, 'parameter names must be simple names')
        params.push(pt.text)
      } while (this.skipIf(','))
    }
    this.expect(')', `after the parameters of "${name.text}"`)
    this.expect('{', `to start the body of "${name.text}"`)
    const body: Stmt[] = []
    while (!this.at('}') && !this.atKind('eof')) body.push(this.parseStmt())
    this.expect('}', `to close the function "${name.text}"`)
    return { name: name.text, params, body }
  }

  parseStmt(): Stmt {
    const tk = this.peek()
    if (tk.kind === 'kw') {
      switch (tk.text) {
        case 'if': return this.parseIf()
        case 'while': return this.parseWhile()
        case 'for': return this.parseFor()
        case 'return': {
          this.next()
          let expr: Expr | null = null
          if (!this.at(';')) expr = this.parseExpr()
          this.expect(';', 'after return')
          return { id: nid(), s: 'return', expr, line: tk.line }
        }
        case 'break': {
          this.next()
          this.expect(';', 'after break')
          return { id: nid(), s: 'break', line: tk.line }
        }
        case 'true': case 'false': case 'void': {
          this.err(tk.line, tk.col, `"${tk.text}" cannot start a statement`)
        }
      }
    }
    if (this.at('{')) return this.parseBlock()
    // var decl:  int x = ...   |   float arr[4] = { .., .. }
    if (tk.kind === 'ident' && ['int', 'float', 'num'].includes(tk.text) && this.peek(1).kind === 'ident') {
      this.next()
      const nameTok = this.next()
      if (this.at('[')) {
        this.next()
        if (!this.at(']')) {
          const sizeTok = this.next()
          if (sizeTok.kind !== 'num') this.err(sizeTok.line, sizeTok.col, 'array size must be a number, like [4]')
        }
        this.expect(']', 'after the array size')
        this.expect('=', 'when declaring an array')
        this.expect('{', 'to start the array values')
        const items: Expr[] = []
        if (!this.at('}')) {
          do { items.push(this.parseExpr()) } while (this.skipIf(','))
        }
        this.expect('}', 'to close the array values')
        this.expect(';', 'after the array declaration')
        return { id: nid(), s: 'varArr', name: nameTok.text, items, line: tk.line }
      }
      this.expect('=', 'when declaring a variable')
      const init = this.parseExpr()
      this.expect(';', 'after the variable declaration')
      return { id: nid(), s: 'var', name: nameTok.text, init, line: tk.line }
    }
    // assignment?
    if (tk.kind === 'ident' && this.peek(1).kind === 'punct' && ['=', '+=', '-=', '*=', '/=', '++', '--'].includes(this.peek(1).text)) {
      const nameTok = this.next()
      const opTok = this.next()
      if (opTok.text === '++' || opTok.text === '--') {
        return {
          id: nid(), s: 'assign', name: nameTok.text,
          op: opTok.text === '++' ? '+=' : '-=',
          expr: { id: nid(), e: 'num', v: 1 },
          line: tk.line,
        }
      }
      const expr = this.parseExpr()
      this.expect(';', 'after the assignment')
      return { id: nid(), s: 'assign', name: nameTok.text, op: opTok.text, expr, line: tk.line }
    }
    // expression statement (calls like moveTo(...))
    const expr = this.parseExpr()
    this.expect(';', 'after the command', )
    return { id: nid(), s: 'expr', expr, line: tk.line }
  }

  parseBlock(): Stmt {
    const open = this.next() // {
    const body: Stmt[] = []
    while (!this.at('}') && !this.atKind('eof')) body.push(this.parseStmt())
    this.expect('}', 'to close this block')
    void open
    return { id: nid(), s: 'block', body, line: open.line }
  }

  parseIf(): Stmt {
    const tk = this.next() // if
    this.expect('(', 'after if')
    const cond = this.parseExpr()
    this.expect(')', 'after the if condition')
    const then: Stmt[] = []
    if (this.at('{')) {
      const blk = this.parseBlock()
      then.push(blk)
    } else {
      then.push(this.parseStmt())
    }
    let els: Stmt[] | null = null
    if (this.at('else')) {
      this.next()
      if (this.at('if')) {
        els = [this.parseIf()]
      } else if (this.at('{')) {
        const blk = this.parseBlock()
        els = [blk]
      } else {
        els = [this.parseStmt()]
      }
    }
    return { id: nid(), s: 'if', cond, then, els, line: tk.line }
  }

  parseWhile(): Stmt {
    const tk = this.next()
    this.expect('(', 'after while')
    const cond = this.parseExpr()
    this.expect(')', 'after the while condition')
    const body: Stmt[] = []
    if (this.at('{')) body.push(this.parseBlock())
    else body.push(this.parseStmt())
    return { id: nid(), s: 'while', cond, body, line: tk.line }
  }

  parseFor(): Stmt {
    const tk = this.next()
    this.expect('(', 'after for')
    let init: Stmt | null = null
    if (!this.at(';')) {
      if (this.peek().kind === 'ident' && ['int', 'float', 'num'].includes(this.peek().text) && this.peek(1).kind === 'ident') {
        this.next()
        const nameTok = this.next()
        this.expect('=', 'when declaring a variable')
        const init2 = this.parseExpr()
        init = { id: nid(), s: 'var', name: nameTok.text, init: init2, line: tk.line }
        void 0
      } else {
        init = this.parseSimpleAssign()
      }
    }
    this.expect(';', 'after the for-loop setup')
    let cond: Expr | null = null
    if (!this.at(';')) cond = this.parseExpr()
    this.expect(';', 'after the for-loop condition')
    let step: Stmt | null = null
    if (!this.at(')')) step = this.parseSimpleAssign()
    this.expect(')', 'to close the for-loop header')
    const body: Stmt[] = []
    if (this.at('{')) body.push(this.parseBlock())
    else body.push(this.parseStmt())
    return { id: nid(), s: 'for', init, cond, step, body, line: tk.line }
  }

  parseSimpleAssign(): Stmt {
    const nameTok = this.next()
    if (nameTok.kind !== 'ident') this.err(nameTok.line, nameTok.col, 'expected a variable name')
    // array element assignment: arr[i] = ...
    if (this.at('[')) {
      this.next()
      const idx = this.parseExpr()
      this.expect(']', 'after the array index')
      this.expect('=', 'in this assignment')
      const expr = this.parseExpr()
      return { id: nid(), s: 'assignIdx', name: nameTok.text, idx, expr, line: nameTok.line }
    }
    const opTok = this.next()
    if (opTok.text === '++' || opTok.text === '--') {
      return { id: nid(), s: 'assign', name: nameTok.text, op: opTok.text === '++' ? '+=' : '-=', expr: { id: nid(), e: 'num', v: 1 }, line: nameTok.line }
    }
    this.expect('=', 'in this assignment')
    const expr = this.parseExpr()
    return { id: nid(), s: 'assign', name: nameTok.text, op: '=', expr, line: nameTok.line }
  }

  /* expressions: precedence climbing */
  parseExpr(): Expr { return this.parseOr() }

  parseOr(): Expr {
    let a = this.parseAnd()
    while (this.at('||')) { this.next(); const b = this.parseAnd(); a = { id: nid(), e: 'bin', op: '||', a, b } }
    return a
  }
  parseAnd(): Expr {
    let a = this.parseCmp()
    while (this.at('&&')) { this.next(); const b = this.parseCmp(); a = { id: nid(), e: 'bin', op: '&&', a, b } }
    return a
  }
  parseCmp(): Expr {
    let a = this.parseAdd()
    while (['==', '!=', '<', '>', '<=', '>='].includes(this.peek().text)) {
      const op = this.next().text
      const b = this.parseAdd()
      a = { id: nid(), e: 'bin', op, a, b }
    }
    return a
  }
  parseAdd(): Expr {
    let a = this.parseMul()
    while (this.at('+') || this.at('-')) {
      const op = this.next().text
      const b = this.parseMul()
      a = { id: nid(), e: 'bin', op, a, b }
    }
    return a
  }
  parseMul(): Expr {
    let a = this.parseUnary()
    while (this.at('*') || this.at('/') || this.at('%')) {
      const op = this.next().text
      const b = this.parseUnary()
      a = { id: nid(), e: 'bin', op, a, b }
    }
    return a
  }
  parseUnary(): Expr {
    if (this.at('-')) { this.next(); const a = this.parseUnary(); return { id: nid(), e: 'un', op: '-', a } }
    if (this.at('!')) { this.next(); const a = this.parseUnary(); return { id: nid(), e: 'un', op: '!', a } }
    return this.parsePrimary()
  }
  parsePrimary(): Expr {
    const tk = this.next()
    if (tk.kind === 'num') return { id: nid(), e: 'num', v: parseFloat(tk.text) }
    if (tk.kind === 'str') return { id: nid(), e: 'str', v: tk.text }
    if (tk.kind === 'kw' && (tk.text === 'true' || tk.text === 'false')) return { id: nid(), e: 'bool', v: tk.text === 'true' }
    if (tk.kind === 'ident') {
      if (this.at('(')) {
        this.next()
        const args: Expr[] = []
        if (!this.at(')')) {
          do { args.push(this.parseExpr()) } while (this.skipIf(','))
        }
        this.expect(')', `to close the call to ${tk.text}()`)
        return { id: nid(), e: 'call', name: tk.text, args, line: tk.line }
      }
      if (this.at('[')) {
        this.next()
        const idx = this.parseExpr()
        this.expect(']', 'after the array index')
        return { id: nid(), e: 'index', name: tk.text, idx, line: tk.line }
      }
      return { id: nid(), e: 'var', name: tk.text }
    }
    if (tk.kind === 'punct' && tk.text === '(') {
      const e = this.parseExpr()
      this.expect(')', 'to close the parenthesised expression')
      return e
    }
    if (tk.kind === 'eof') this.err(tk.line, tk.col, 'the code ends here but more was expected', 'check for a missing value or bracket')
    this.err(tk.line, tk.col, `unexpected "${tk.text}" in this spot`)
  }
}

/* ─────────────────────────── validation ─────────────────────────── */

const SENSOR_FNS = new Set([
  'detectTrash', 'nearestTrash', 'battery', 'nearBase', 'currentDir', 'currentStrength',
  'trashCount', 'loadWeight', 'heading', 'distTo', 'random', 'abs', 'min', 'max',
])

const ACTION_FNS = new Set([
  'moveTo', 'move', 'scan', 'collect', 'returnToBase', 'setSpeed', 'followCurrent',
  'avoidObstacle', 'log', 'collectNearest', 'goToTrash', 'wait',
])

const ALL_FNS = new Set([...SENSOR_FNS, ...ACTION_FNS])

function countLines(s: string): number {
  return s.split('\n').length
}

export function compile(src: string): { program: DeployedProgram } | { errors: CodeError[] } {
  const lexRes = lex(src)
  if (!Array.isArray(lexRes)) return { errors: [lexRes] }

  const parser = new Parser(lexRes)
  let fns: FnDecl[]
  try {
    fns = parser.parseProgram()
  } catch (e) {
    if (e instanceof ParseErr) return { errors: [e.err] }
    throw e
  }

  const errors: CodeError[] = []
  const names = new Map<string, FnDecl>()

  if (fns.length === 0) {
    return {
      errors: [{
        line: 1, col: 1,
        message: 'no functions found — define at least one function like update()',
        hint: 'a program looks like:\n\nvoid update() {\n  // your logic here\n}',
      }],
    }
  }

  for (const fn of fns) {
    if (names.has(fn.name)) {
      const prev = countLines(src.slice(0, src.indexOf(`void ${fn.name}`))) || 1
      errors.push({ line: 1, col: 1, message: `you defined "${fn.name}()" twice — first around line ${prev}`, hint: 'function names must be unique' })
      continue
    }
    names.set(fn.name, fn)
    if (fn.name !== '__init__' && !/^[a-z][a-zA-Z0-9_]*$/.test(fn.name)) {
      errors.push({ line: 1, col: 1, message: `function name "${fn.name}" should start with a lowercase letter` })
    }
  }

  // walk statements for call validation
  const validateExpr = (e: Expr) => {
    switch (e.e) {
      case 'call': {
        if (!ALL_FNS.has(e.name) && !names.has(e.name)) {
          const guess = [...ALL_FNS, ...names.keys()].find((f) => f.startsWith(e.name.slice(0, 4)))
          errors.push({
            line: e.line, col: 1,
            message: `unknown command "${e.name}()"`,
            hint: guess && guess !== e.name ? `did you mean  ${guess}() ?` : 'check the command reference on the right for available commands',
          })
        }
        e.args.forEach(validateExpr)
        break
      }
      case 'bin': validateExpr(e.a); validateExpr(e.b); break
      case 'un': validateExpr(e.a); break
      case 'index': validateExpr(e.idx); break
      default: break
    }
  }
  const validateStmt = (s: Stmt) => {
    switch (s.s) {
      case 'expr': validateExpr(s.expr); break
      case 'var': validateExpr(s.init); break
      case 'varArr': s.items.forEach(validateExpr); break
      case 'assign': validateExpr(s.expr); break
      case 'assignIdx': validateExpr(s.idx); validateExpr(s.expr); break
      case 'if': validateExpr(s.cond); s.then.forEach(validateStmt); s.els?.forEach(validateStmt); break
      case 'while': validateExpr(s.cond); s.body.forEach(validateStmt); break
      case 'for': s.init && validateStmt(s.init); s.cond && validateExpr(s.cond); s.step && validateStmt(s.step); s.body.forEach(validateStmt); break
      case 'block': s.body.forEach(validateStmt); break
      case 'return': s.expr && validateExpr(s.expr); break
      case 'break': break
    }
  }
  for (const fn of fns) fn.body.forEach(validateStmt)

  if (errors.length) return { errors }

  nextId = 1
  return { program: { source: src, fns: names, version: Date.now() } }
}
