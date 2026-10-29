export const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

if (!API_URL) {
  console.error('Falta VITE_API_URL. Copia .env.example a .env.development y ajusta la URL del API.');
}
