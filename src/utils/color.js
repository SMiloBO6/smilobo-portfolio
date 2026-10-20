// 色彩工具：从专辑封面提取主色，供色卡与页面动态背景共用

function clamp255(v) {
  return Math.max(0, Math.min(255, Math.round(v)))
}

export function parseHex(hex) {
  let h = String(hex || '').trim().replace('#', '')
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
  if (h.length !== 6 || /[^0-9a-f]/i.test(h)) return [0, 0, 0]
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16)
  ]
}

export function toHex(rgb) {
  return '#' + rgb.map(function (v) {
    return clamp255(v).toString(16).padStart(2, '0')
  }).join('').toUpperCase()
}

// 把两个颜色按比例混合，t 越大越接近 hexB
export function mixHex(hexA, hexB, t) {
  const a = parseHex(hexA)
  const b = parseHex(hexB)
  return toHex([
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t
  ])
}

export function hexToRgba(hex, alpha) {
  const c = parseHex(hex)
  return 'rgba(' + c[0] + ', ' + c[1] + ', ' + c[2] + ', ' + alpha + ')'
}

function rgbToHsl(r, g, b) {
  r = r / 255
  g = g / 255
  b = b / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  let s = 0
  if (max !== min) s = l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min)
  return { s: s, l: l }
}

function distance(a, b) {
  const dr = a.r - b.r
  const dg = a.g - b.g
  const db = a.b - b.b
  return Math.sqrt(dr * dr * 0.9 + dg * dg * 1.3 + db * db * 0.8)
}

// 提取主色：先做颜色量化统计，再按「占比 + 饱和度 + 色相差异」挑出 count 个
// img 必须是同源图片；失败返回 null，由调用方回退到预设色
export function extractPalette(img, count) {
  const n = count || 5
  const size = 56
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  ctx.drawImage(img, 0, 0, size, size)

  let data
  try {
    data = ctx.getImageData(0, 0, size, size).data
  } catch (e) {
    return null
  }

  const buckets = new Map()
  let total = 0
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 140) continue
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4)
    let cell = buckets.get(key)
    if (!cell) {
      cell = { n: 0, r: 0, g: 0, b: 0 }
      buckets.set(key, cell)
    }
    cell.n += 1
    cell.r += r
    cell.g += g
    cell.b += b
    total += 1
  }
  if (!total) return null

  const list = []
  buckets.forEach(function (cell) {
    const r = cell.r / cell.n
    const g = cell.g / cell.n
    const b = cell.b / cell.n
    const hsl = rgbToHsl(r, g, b)
    const center = 1 - Math.min(1, Math.abs(hsl.l - 0.52) * 1.5)
    const score = cell.n * (0.42 + hsl.s * 1.65) * (0.32 + center * 0.78)
    list.push({ r: r, g: g, b: b, n: cell.n, score: score, hex: toHex([r, g, b]) })
  })
  list.sort(function (a, b) { return b.score - a.score })

  const picked = []
  const minGap = [118, 92, 62, 0, 0]
  for (let slot = 0; slot < n && list.length; slot++) {
    let best = null
    for (let i = 0; i < list.length; i++) {
      const c = list[i]
      if (picked.indexOf(c) !== -1) continue
      let nearest = Infinity
      for (let j = 0; j < picked.length; j++) nearest = Math.min(nearest, distance(c, picked[j]))
      if (picked.length && nearest < minGap[Math.min(slot - 1, minGap.length - 1)]) continue
      const spread = picked.length ? Math.pow(Math.min(nearest, 190) / 190, 0.75) + 0.22 : 1
      const rank = c.score * spread
      if (!best || rank > best.rank) best = { c: c, rank: rank }
    }
    if (!best) break
    picked.push(best.c)
  }
  for (let i = 0; picked.length < n && i < list.length; i++) {
    if (picked.indexOf(list[i]) === -1) picked.push(list[i])
  }
  if (!picked.length) return null

  const pickedTotal = picked.reduce(function (s, c) { return s + c.n }, 0) || 1
  const out = picked.slice(0, n).map(function (c) {
    return { hex: c.hex, ratio: Math.max(3, Math.round(c.n / pickedTotal * 100)) }
  })
  const sum = out.reduce(function (s, c) { return s + c.ratio }, 0)
  out[out.length - 1].ratio = Math.max(3, out[out.length - 1].ratio + (100 - sum))
  return out
}

/* ---------- 色号输入 ---------- */

// 解析用户输入的多个色号：支持 #A1B2C3 / a1b2c3 / #abc / rgb(12, 34, 56)
// 分隔符支持换行、空格、英文逗号、中文逗号、分号、竖线
export function parseColorInput(input) {
  const raw = String(input || '')
  const tokens = raw
    .split(/[\s,，;；|、]+/)
    .map(function (t) { return t.trim() })
    .filter(function (t) { return t.length > 0 })

  const colors = []
  const invalid = []

  tokens.forEach(function (token) {
    const rgbMatch = token.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i)
    if (rgbMatch) {
      const rgb = [Number(rgbMatch[1]), Number(rgbMatch[2]), Number(rgbMatch[3])]
      if (rgb.every(function (v) { return v >= 0 && v <= 255 })) {
        colors.push(toHex(rgb))
        return
      }
    }

    let h = token.replace(/^#/, '').replace(/^0x/i, '').replace(/["'`]/g, '')
    if (/^[0-9a-f]{3}$/i.test(h)) {
      h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
    }
    if (/^[0-9a-f]{6}$/i.test(h)) {
      colors.push('#' + h.toUpperCase())
      return
    }
    invalid.push(token)
  })

  const unique = []
  colors.forEach(function (hex) {
    if (unique.indexOf(hex) === -1) unique.push(hex)
  })

  return { colors: unique, invalid: invalid, total: tokens.length }
}

// 默认权重表：数量越少，主色权重越高
const DEFAULT_WEIGHTS = {
  1: [100],
  2: [62, 38],
  3: [48, 32, 20],
  4: [40, 27, 20, 13],
  5: [36, 25, 18, 13, 8],
  6: [32, 22, 16, 12, 10, 8]
}

// 把一组色号转成带占比的色板对象
export function paletteFromHexes(hexes) {
  const list = (hexes || []).slice(0, 6)
  if (!list.length) return []
  const weights = DEFAULT_WEIGHTS[list.length] || DEFAULT_WEIGHTS[6]
  return list.map(function (hex, index) {
    return {
      hex: hex,
      ratio: weights[Math.min(index, weights.length - 1)]
    }
  })
}

/* ---------- 色彩属性 ---------- */

export function hexLuminance(hex) {
  const c = parseHex(hex)
  return (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255
}

export function hexSaturation(hex) {
  const c = parseHex(hex)
  return rgbToHsl(c[0], c[1], c[2]).s
}

// 提高颜色饱和度（保持三通道均值，只拉开色彩差）
// amount 0.4 ≈ 在原基础上加四成彩度，用来把封面主色变成更沉浸的背景色
export function boostSaturation(hex, amount) {
  const c = parseHex(hex)
  const avg = (c[0] + c[1] + c[2]) / 3
  const k = 1 + (amount || 0)
  return toHex([
    avg + (c[0] - avg) * k,
    avg + (c[1] - avg) * k,
    avg + (c[2] - avg) * k
  ])
}

function colorDistance(a, b) {
  const ca = parseHex(a)
  const cb = parseHex(b)
  return Math.sqrt(
    Math.pow(ca[0] - cb[0], 2) * 0.9 +
    Math.pow(ca[1] - cb[1], 2) * 1.3 +
    Math.pow(ca[2] - cb[2], 2) * 0.8
  )
}

// 从色板里挑出最浅 / 最深 / 最鲜艳的颜色，作为搭配角色
export function resolveRoles(palette) {
  const list = (palette || []).filter(function (c) {
    return c && /^#[0-9A-F]{6}$/i.test(c.hex || '')
  })
  if (!list.length) return null

  const sorted = list.slice().sort(function (a, b) {
    return (b.ratio || 0) - (a.ratio || 0)
  })
  const base = sorted[0]

  const byLight = list.slice().sort(function (a, b) {
    return hexLuminance(b.hex) - hexLuminance(a.hex)
  })
  const lightest = byLight[0]
  const darkest = byLight[byLight.length - 1]

  const bySat = list.slice().sort(function (a, b) {
    return hexSaturation(b.hex) - hexSaturation(a.hex)
  })
  let accent = bySat[0]
  // 点缀色尽量和主色拉开距离，避免整身同色
  for (let i = 0; i < bySat.length; i++) {
    if (colorDistance(bySat[i].hex, base.hex) > 70) { accent = bySat[i]; break }
  }

  const rest = list.filter(function (c) {
    return c.hex !== lightest.hex && c.hex !== darkest.hex && c.hex !== accent.hex
  })
  // 辅助色优先选一个和主色不同的颜色，实在没有才回落到主色
  const mid = rest.filter(function (c) { return c.hex !== base.hex })[0] || rest[0] || base

  return { base: base, light: lightest, dark: darkest, accent: accent, mid: mid }
}

/* ---------- 配色权重方案 ---------- */

const ROLE_META = {
  base: { role: '主色', area: '外套 / 下装等大面积', note: '决定整体色调' },
  mid: { role: '辅助色', area: '上装 / 针织 / 包袋', note: '制造层次过渡' },
  light: { role: '中性色', area: '内搭 / 衬衫 / 袜口', note: '留白，压住花哨感' },
  dark: { role: '压深色', area: '下装 / 鞋履 / 腰带', note: '稳住重心' },
  accent: { role: '点缀色', area: '帽子 / 内搭边 / 配饰', note: '小面积提亮' }
}

const SCHEME_TEMPLATES = [
  {
    id: 'stable',
    name: '稳态日常',
    kicker: 'STABLE',
    summary: '主色占大面积，颜色少而稳，适合通勤上课、面试这类需要可信度的场合。',
    weights: { base: 55, mid: 22, light: 13, dark: 0, accent: 10 }
  },
  {
    id: 'layered',
    name: '分层质感',
    kicker: 'LAYERED',
    summary: '深浅各占一半，靠材质和明度差做层次，适合想要细节但不吵闹的日常。',
    weights: { base: 40, mid: 20, light: 15, dark: 17, accent: 8 }
  },
  {
    id: 'accent',
    name: '点睛高对比',
    kicker: 'ACCENT',
    summary: '中性色打底，深色压住轮廓，鲜艳色只留一小块，适合拍摄、约会、演出。',
    weights: { base: 32, mid: 15, light: 23, dark: 20, accent: 10 }
  }
]

// 根据色板生成 3 套「颜色权重配比建议」
export function buildColorSchemes(palette) {
  const roles = resolveRoles(palette)
  if (!roles) return []

  return SCHEME_TEMPLATES.map(function (template) {
    const used = []
    const entries = Object.keys(template.weights)
      .filter(function (key) {
        if (!template.weights[key] || !roles[key]) return false
        // 同一色号只承担一个角色，避免配比表里重复出现
        if (used.indexOf(roles[key].hex) !== -1) return false
        used.push(roles[key].hex)
        return true
      })
      .map(function (key) {
        const meta = ROLE_META[key]
        return {
          key: key,
          hex: roles[key].hex,
          ratio: template.weights[key],
          role: meta.role,
          area: meta.area,
          note: meta.note
        }
      })

    if (!entries.length) return null

    // 去掉重复角色后按原比例归一化到 100%
    const sum = entries.reduce(function (s, e) { return s + e.ratio }, 0) || 1
    let running = 0
    entries.forEach(function (entry, index) {
      if (index === entries.length - 1) {
        entry.ratio = 100 - running
      } else {
        entry.ratio = Math.round(entry.ratio / sum * 100)
        running += entry.ratio
      }
    })
    entries.sort(function (a, b) { return b.ratio - a.ratio })

    return {
      id: template.id,
      name: template.name,
      kicker: template.kicker,
      summary: template.summary,
      colors: entries
    }
  }).filter(function (scheme) { return scheme && scheme.colors.length > 1 })
}
