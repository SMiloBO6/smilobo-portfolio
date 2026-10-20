import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readJsonBody, sendJson } from './httpUtils.js'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const contactsFile = path.join(rootDir, 'data', 'contacts.json')

function readContacts() {
  try {
    const list = JSON.parse(fs.readFileSync(contactsFile, 'utf8'))
    return Array.isArray(list) ? list : []
  } catch (error) {
    return []
  }
}

function writeContacts(list) {
  fs.mkdirSync(path.dirname(contactsFile), { recursive: true })
  fs.writeFileSync(contactsFile, JSON.stringify(list, null, 2), 'utf8')
}

export async function handleContactHttp(req, res) {
  try {
    if (req.method === 'GET') {
      sendJson(res, 200, readContacts())
      return
    }
    if (req.method === 'POST') {
      const payload = await readJsonBody(req, 40 * 1024)
      const entry = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        time: new Date().toLocaleString('zh-CN', { hour12: false }),
        name: String(payload.name || '').slice(0, 120),
        email: String(payload.email || '').slice(0, 200),
        reach: String(payload.reach || '').slice(0, 300),
        message: String(payload.message || '').slice(0, 2000)
      }
      if (!entry.name || !entry.email || !entry.message) {
        sendJson(res, 400, { ok: false, error: '姓名、邮箱、留言不能为空' })
        return
      }
      const list = readContacts()
      list.push(entry)
      writeContacts(list)
      sendJson(res, 200, { ok: true, id: entry.id })
      return
    }
    if (req.method === 'DELETE') {
      writeContacts([])
      sendJson(res, 200, { ok: true, cleared: true })
      return
    }
    sendJson(res, 405, { ok: false, error: '不支持的请求方式' })
  } catch (error) {
    if (error && error.code === 'INVALID_JSON') {
      sendJson(res, 400, { ok: false, error: 'body 不是合法 JSON' })
      return
    }
    if (error && error.code === 'BODY_TOO_LARGE') {
      sendJson(res, 413, { ok: false, error: '提交内容过长' })
      return
    }
    sendJson(res, 500, { ok: false, error: '服务器内部错误' })
  }
}
