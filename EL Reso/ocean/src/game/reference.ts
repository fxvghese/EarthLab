export interface CommandDoc {
  name: string
  sig: string
  desc: string
  example: string
  group: 'action' | 'sensor'
}

export const COMMANDS: CommandDoc[] = [
  { name: 'moveTo', sig: 'moveTo(x, z)', desc: 'swim to a grid position (blocking)', example: 'moveTo(10, -5);', group: 'action' },
  { name: 'goToTrash', sig: 'goToTrash()', desc: 'intercept the nearest detected trash', example: 'goToTrash();', group: 'action' },
  { name: 'collect', sig: 'collect()', desc: 'grab trash within collection range', example: 'collect();', group: 'action' },
  { name: 'collectNearest', sig: 'collectNearest()', desc: 'move to + collect nearest trash in one go', example: 'collectNearest();', group: 'action' },
  { name: 'move', sig: 'move(direction)', desc: 'swim 8 units in a direction (radians)', example: 'move(0.785);', group: 'action' },
  { name: 'scan', sig: 'scan()', desc: 'pause 1.2s and sweep the sonar', example: 'scan();', group: 'action' },
  { name: 'returnToBase', sig: 'returnToBase()', desc: 'swim back to base to recharge & unload', example: 'returnToBase();', group: 'action' },
  { name: 'followCurrent', sig: 'followCurrent()', desc: 'ride the local current for 10 units', example: 'followCurrent();', group: 'action' },
  { name: 'avoidObstacle', sig: 'avoidObstacle()', desc: 'dodge sideways around a wreck', example: 'avoidObstacle();', group: 'action' },
  { name: 'wait', sig: 'wait(seconds)', desc: 'hold position for a moment', example: 'wait(2);', group: 'action' },
  { name: 'setSpeed', sig: 'setSpeed(mult)', desc: 'speed multiplier 0.3 – 2.0', example: 'setSpeed(1.5);', group: 'action' },
  { name: 'log', sig: 'log(text)', desc: 'print a message to the console', example: 'log("sweeping");', group: 'action' },
  { name: 'detectTrash', sig: 'detectTrash()', desc: '1 if trash is within detection radius', example: 'if (detectTrash()) { ... }', group: 'sensor' },
  { name: 'nearestTrash', sig: 'nearestTrash()', desc: 'id of nearest trash (-1 if none)', example: 'int id = nearestTrash();', group: 'sensor' },
  { name: 'distTo', sig: 'distTo(id)', desc: 'distance to a trash id', example: 'distTo(3) < 5', group: 'sensor' },
  { name: 'battery', sig: 'battery()', desc: 'charge 0–100', example: 'if (battery() < 25) { ... }', group: 'sensor' },
  { name: 'loadWeight', sig: 'loadWeight()', desc: 'items currently on board', example: 'loadWeight() >= 20', group: 'sensor' },
  { name: 'trashCount', sig: 'trashCount()', desc: 'trash left in the sector', example: 'if (trashCount() == 0) { ... }', group: 'sensor' },
  { name: 'nearBase', sig: 'nearBase()', desc: '1 when close to base', example: 'if (nearBase()) { ... }', group: 'sensor' },
  { name: 'currentDir', sig: 'currentDir()', desc: 'local current angle (radians)', example: 'move(currentDir());', group: 'sensor' },
  { name: 'currentStrength', sig: 'currentStrength()', desc: 'local current force 0–1.5', example: 'if (currentStrength() > 1) { ... }', group: 'sensor' },
  { name: 'heading', sig: 'heading()', desc: 'AUV compass angle (radians)', example: 'move(heading());', group: 'sensor' },
  { name: 'random', sig: 'random()', desc: 'random 0–1', example: 'move(random() * 6.28);', group: 'sensor' },
  { name: 'abs', sig: 'abs(x)', desc: 'absolute value', example: 'abs(-3) // 3', group: 'sensor' },
  { name: 'min', sig: 'min(a, b)', desc: 'smaller of two numbers', example: 'min(2, 5) // 2', group: 'sensor' },
  { name: 'max', sig: 'max(a, b)', desc: 'larger of two numbers', example: 'max(2, 5) // 5', group: 'sensor' },
]

export const KEYWORDS = ['void', 'if', 'else', 'while', 'for', 'return', 'break', 'int', 'float', 'true', 'false']
