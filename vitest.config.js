// vitest.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    // Environnement qui simule un navigateur
    environment: 'jsdom',
    
    // Fichier de configuration global des tests
    setupFiles: ['./src/test/setup.js'],
    
    // Active les méthodes de test sans import (describe, it, expect)
    globals: true,
    
    // Dossier où chercher les tests
    include: ['src/**/*.{test,spec}.{js,jsx}'],
    
    // Coverage (optionnel mais utile)
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/**/*.test.{js,jsx}', 'src/test/**']
    }
  }
})