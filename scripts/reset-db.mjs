import fs from 'node:fs';
import path from 'node:path';

const db = path.join(process.cwd(), 'prisma', 'dev.db');
if (fs.existsSync(db)) {
  fs.rmSync(db);
  console.log('Database lokal dihapus:', db);
}
console.log('Jalankan: npm run db:push && npm run db:seed');
