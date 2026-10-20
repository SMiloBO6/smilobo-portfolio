export function sendJson(res, status, payload) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(payload))
}

export function readJsonBody(req, maxBytes) {
  const limit = Number(maxBytes || 64 * 1024)
  return new Promise(function (resolve, reject) {
    let body = ''
    let size = 0
    let settled = false

    function fail(error) {
      if (settled) return
      settled = true
      reject(error)
    }

    req.on('data', function (chunk) {
      if (settled) return
      size += chunk.length
      if (size > limit) {
        const error = new Error('request body too large')
        error.code = 'BODY_TOO_LARGE'
        fail(error)
        return
      }
      body += chunk
    })

    req.on('end', function () {
      if (settled) return
      settled = true
      try {
        resolve(JSON.parse(body || '{}'))
      } catch (error) {
        const parseError = new Error('invalid json')
        parseError.code = 'INVALID_JSON'
        reject(parseError)
      }
    })

    req.on('error', fail)
  })
}
