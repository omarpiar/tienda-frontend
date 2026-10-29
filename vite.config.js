import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  test: {
    environment: 'jsdom',
    env: { VITE_API_URL: 'http://localhost:5081' },
    setupFiles: ['./src/test-setup.js'],
    testTimeout: 15000,
  },
});
