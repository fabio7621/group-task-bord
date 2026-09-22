import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 容器內打到 server，本機開發打到 localhost
const target = process.env.API_TARGET || 'http://localhost:4000'

export default defineConfig({
  plugins: [vue()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': { target, changeOrigin: true },
      '/socket.io': { target, ws: true }
    }
  }
})
