// logger.js
// ─────────────────────────────────────────────
//  Pretty console logger with timestamps & colors
// ─────────────────────────────────────────────

const COLORS = {
  reset:  '\x1b[0m',
  cyan:   '\x1b[36m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  red:    '\x1b[31m',
  gray:   '\x1b[90m',
  bold:   '\x1b[1m',
};

function timestamp() {
  return new Date().toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour12: false,
  });
}

function tag(label, color) {
  return `${color}${COLORS.bold}[${label}]${COLORS.reset}`;
}

const logger = {
  info:    (msg) => console.log(`${COLORS.gray}${timestamp()}${COLORS.reset} ${tag('INFO', COLORS.cyan)}  ${msg}`),
  success: (msg) => console.log(`${COLORS.gray}${timestamp()}${COLORS.reset} ${tag('OK', COLORS.green)}    ${msg}`),
  warn:    (msg) => console.log(`${COLORS.gray}${timestamp()}${COLORS.reset} ${tag('WARN', COLORS.yellow)}  ${msg}`),
  error:   (msg) => console.log(`${COLORS.gray}${timestamp()}${COLORS.reset} ${tag('ERROR', COLORS.red)}  ${msg}`),
  event:   (type, user) => console.log(
    `${COLORS.gray}${timestamp()}${COLORS.reset} ${tag('EVENT', COLORS.cyan)} ${COLORS.bold}${type}${COLORS.reset} ← @${user ?? 'unknown'}`
  ),
};

module.exports = logger;
