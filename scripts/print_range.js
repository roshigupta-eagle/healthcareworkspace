const fs = require('fs');
const file = process.argv[2];
const start = Number(process.argv[3] || 1);
const end = Number(process.argv[4] || start + 20);
if (!file) {
  console.error('Usage: node print_range.js <file> <start> <end>');
  process.exit(2);
}
const src = fs.readFileSync(file, 'utf8').split(/\r?\n/);
for (let i = start-1; i < Math.min(end, src.length); i++) {
  const ln = (i+1).toString().padStart(4, ' ');
  console.log(`${ln}: ${src[i]}`);
}
