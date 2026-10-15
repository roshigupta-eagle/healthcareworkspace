const fs = require('fs');
const path = process.argv[2];
if (!path) { console.error('Usage: node check_balance.js <file>'); process.exit(2); }
const src = fs.readFileSync(path, 'utf8');

let stack = [];
const openings = { '{': '}', '(': ')', '[': ']' };
const closings = { '}': '{', ')': '(', ']': '[' };

let i = 0;
let line = 1, col = 1;
let inSingle = false, inDouble = false, inTemplate = false, inLineComment = false, inBlockComment = false;
let lastChar = '';

function push(ch) { stack.push({ ch, line, col }); }
function pop(expected) {
  const top = stack.pop();
  if (!top) return { ok: false, msg: `Unmatched closing ${expected} at ${line}:${col}` };
  if (top.ch !== expected) return { ok: false, msg: `Mismatched closing ${expected} at ${line}:${col}, expected closing for ${top.ch} opened at ${top.line}:${top.col}` };
  return { ok: true };
}

for (i = 0; i < src.length; i++) {
  const ch = src[i];
  const next = src[i+1] || '';

  if (ch === '\n') { line++; col = 1; inLineComment = false; } else { col++; }

  if (inLineComment) { lastChar = ch; continue; }
  if (inBlockComment) {
    if (ch === '*' && next === '/') { inBlockComment = false; i++; col++; }
    lastChar = ch; continue;
  }
  if (!inSingle && !inDouble && !inTemplate) {
    if (ch === '/' && next === '/') { inLineComment = true; i++; col++; lastChar = '\n'; continue; }
    if (ch === '/' && next === '*') { inBlockComment = true; i++; col++; lastChar = ''; continue; }
  }

  if (!inDouble && !inTemplate && ch === '\'' && !inSingle) { inSingle = true; lastChar = ch; continue; }
  else if (inSingle && ch === '\'' && lastChar !== '\\') { inSingle = false; lastChar = ch; continue; }
  if (!inSingle && !inTemplate && ch === '"' && !inDouble) { inDouble = true; lastChar = ch; continue; }
  else if (inDouble && ch === '"' && lastChar !== '\\') { inDouble = false; lastChar = ch; continue; }
  if (!inSingle && !inDouble && ch === '`' && !inTemplate) { inTemplate = true; lastChar = ch; continue; }
  else if (inTemplate && ch === '`' && lastChar !== '\\') { inTemplate = false; lastChar = ch; continue; }
  if (inSingle || inDouble || inTemplate) { lastChar = ch; continue; }

  if (ch === '{' || ch === '(' || ch === '[') push(ch);
  if (ch === '}' || ch === ')' || ch === ']') {
    const res = pop(closings[ch]);
    if (!res.ok) { console.error(res.msg); process.exit(3); }
  }
  lastChar = ch;
}

if (stack.length) {
  const top = stack[stack.length-1];
  console.error(`Unclosed ${top.ch} opened at ${top.line}:${top.col}`);
  process.exit(4);
}
console.log('All braces/brackets/parentheses appear balanced');
process.exit(0);
