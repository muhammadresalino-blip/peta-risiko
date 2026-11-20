import crypto from 'node:crypto';
import fs from 'node:fs';

const secret = crypto.randomBytes(32).toString('base64');
const envPath = new URL('../.env', import.meta.url);
let env = fs.readFileSync(envPath, 'utf8');
env = env.replace(/^AUTH_SECRET=.*$/m, `AUTH_SECRET="${secret}"`);
fs.writeFileSync(envPath, env);
console.log('AUTH_SECRET baru dibuat (nilai tidak ditampilkan).');
