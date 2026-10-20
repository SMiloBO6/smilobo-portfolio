import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { handleCarrotHttp } from './server/carrotApi.js'
import { handleContactHttp } from './server/contactApi.js'

const rootDir = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.join(rootDir, 'dist')
const port = Number(process.env.PORT || 4173)
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
}

function sendText(res, status, text) {
  res.statusCode = status
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.end(text)
}

function serveFile(res, filePath, method) {
  const extension = path.extname(filePath).toLowerCase()
  res.statusCode = 200
  res.setHeader('Content-Type', mimeTypes[extension] || 'application/octet-stream')
  res.setHeader(
    'Cache-Control',
    filePath.includes(path.sep + 'assets' + path.sep)
      ? 'public, max-age=31536000, immutable'
      : 'no-cache'
  )
  if (method === 'HEAD') {
    res.end()
    return
  }
  fs.createReadStream(filePath).pipe(res)
}

const server = http.createServer(async function (req, res) {
  const requestUrl = new URL(req.url || '/', 'http://localhost')
  const pathname = decodeURIComponent(requestUrl.pathname)

  if (pathname === '/api/carrot') {
    await handleCarrotHttp(req, res, { env: process.env })
    return
  }
  if (pathname === '/api/contact') {
    await handleContactHttp(req, res)
    return
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendText(res, 405, 'Method Not Allowed')
    return
  }
  if (!fs.existsSync(path.join(distDir, 'index.html'))) {
    sendText(res, 503, '网站尚未构建，请先运行 pnpm build。')
    return
  }

  const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '')
  const candidate = path.resolve(distDir, relativePath)
  if (candidate !== distDir && !candidate.startsWith(distDir + path.sep)) {
    sendText(res, 403, 'Forbidden')
    return
  }

  let filePath = candidate
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    filePath = path.join(distDir, 'index.html')
  }
  serveFile(res, filePath, req.method)
})

server.listen(port, '0.0.0.0', function () {
  console.log('SMiloBo site: http://127.0.0.1:' + port)
})
