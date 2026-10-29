// Arranca la API de demostración y el frontend juntos (sin .NET ni PostgreSQL).
import { spawn } from 'node:child_process';

const hijos = [
  spawn(process.execPath, ['mock-api/server.mjs'], { stdio: 'inherit' }),
  spawn(process.execPath, ['node_modules/vite/bin/vite.js'], { stdio: 'inherit' }),
];
const salir = () => hijos.forEach((h) => h.kill());
process.on('SIGINT', salir);
process.on('SIGTERM', salir);
hijos.forEach((h) => h.on('exit', salir));
