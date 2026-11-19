// In bảng Markdown từ các file coverage-summary.json (Jest / Vitest). Dùng: node scripts/coverage-summary.mjs "Tên=đường/dẫn.json" ...
import { existsSync, readFileSync } from 'node:fs';

const rows = process.argv.slice(2).map((arg) => {
  const [name, file] = arg.split('=');
  if (!existsSync(file)) return `| ${name} | — | — | — | — | (không có ${file}) |`;
  const t = JSON.parse(readFileSync(file, 'utf8')).total;
  const pct = (k) => `${t[k].pct}%`;
  return `| ${name} | ${pct('lines')} | ${pct('statements')} | ${pct('branches')} | ${pct('functions')} | |`;
});
console.log(['### Coverage', '', '| Bộ | Lines | Statements | Branches | Functions | Ghi chú |', '|---|---|---|---|---|---|', ...rows, ''].join('\n'));
