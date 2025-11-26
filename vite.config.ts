import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // 'base' is crucial for GitHub Pages. 
  // './' ensures assets are loaded relatively, working for any repo name.
  base: './', 
})