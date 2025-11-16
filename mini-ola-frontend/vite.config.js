import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.js'],
    globals: true,
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      // Focus coverage on core building blocks to enforce meaningful thresholds
      include: [
        'src/pages/Home.jsx',
        'src/pages/Login.jsx'
      ],
      exclude: [
        'src/main.jsx',
        '**/*.test.{js,jsx}',
        '**/__mocks__/**',
      ],
      all: true,
      reportOnFailure: true,
      thresholds: {
        lines: 90,
        statements: 90,
        functions: 90,
        branches: 70
      }
    }
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      }
    }
  }
})
