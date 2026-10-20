import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { handleContactHttp } from './server/contactApi.js'
import { handleCarrotHttp } from './server/carrotApi.js'

export default defineConfig(function ({ mode }) {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    base: process.env.VITE_BASE_PATH || '/',
    plugins: [
      react(),
      {
        name: 'local-api-routes',
        configureServer(server) {
          server.middlewares.use('/api/contact', function (req, res) {
            handleContactHttp(req, res)
          })
          server.middlewares.use('/api/carrot', function (req, res) {
            handleCarrotHttp(req, res, { env })
          })
        }
      }
    ],
    server: {
      host: '0.0.0.0',
      port: 5173,
      watch: {
        ignored: [
          '**/.shots/**',
          '**/.pnpm-store/**',
          '**/public/**',
          '**/data/**'
        ]
      }
    }
  }
})
