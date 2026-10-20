import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import data from '../../data/albums.js'
import CarrotMascot from '../CarrotMascot.jsx'
import { assetUrl } from '../../utils/assetUrl.js'
import {
  buildColorSchemes,
  extractPalette,
  paletteFromHexes,
  parseColorInput
} from '../../utils/color.js'
import {
  GENDER_OPTIONS,
  SCENE_OPTIONS,
  SEASON_OPTIONS,
  STYLE_OPTIONS
} from '../../services/outfitAdvisor.js'

const SOURCES = [
  { id: 'image', label: '导入图片' },
  { id: 'hex', label: '输入色号' },
  { id: 'preset', label: '预设专辑' }
]

const SAMPLE_HEX = '#2B3A67, #C9A24B, #F2EBDC, #4A5C3A, #1A1A1A'
const HEX_TOKEN = /^(#[0-9a-f]{6})$/i

// ===== 穿搭预览卡（OUTFIT PREVIEW）=====

const PRODUCT_ASSETS = {
  blackDotCami: '/tool/products/top-black-dot-cami.png',
  rustCardigan: '/tool/products/cardigan-rust-rib.png',
  pinkSheerSet: '/tool/products/set-pink-sheer.png',
  creamPleatedSkirt: '/tool/products/skirt-cream-pleated.png',
  creamBlazer: '/tool/products/blazer-cream.png',
  greyRuffleKnit: '/tool/products/top-grey-ruffle-knit.png',
  rhinestoneCami: '/tool/products/top-black-rhinestone-cami.png',
  blackLaceFlaredSkirt: '/tool/products/skirt-black-lace-flared.png',
  blackLaceStraightSkirt: '/tool/products/skirt-black-lace-straight.png',
  polkaPuffTop: '/tool/products/top-polka-puff.png',
  ivoryStripeVest: '/tool/products/vest-stripe-ivory.png',
  greyBowKnit: '/tool/products/top-grey-bow-knit.png',
  creamStripeSet: '/tool/products/set-cream-stripe-knit.png',
  brownTweedBlazer: '/tool/products/blazer-brown-tweed.png',
  furTrimCardigan: '/tool/products/cardigan-fur-trim.png',
  brownPatternCardigan: '/tool/products/cardigan-brown-pattern.png',
  plaidDress: '/tool/products/dress-plaid-red-blue.png',
  mintFluffySweater: '/tool/products/sweater-mint-fluffy.png',
  greyDotCami: '/tool/products/top-grey-dot-cami.png'
}

const OUTFIT_LIBRARY = {
  main: [
    { key: 'blackDotCami', label: '波点吊带', family: 'top' },
    { key: 'greyRuffleKnit', label: '木耳边针织', family: 'top' },
    { key: 'rhinestoneCami', label: '水钻字母吊带', family: 'top' },
    { key: 'polkaPuffTop', label: '波点泡泡袖', family: 'top' },
    { key: 'ivoryStripeVest', label: '米色条纹背心', family: 'top' },
    { key: 'greyBowKnit', label: '蝴蝶结针织', family: 'top' },
    { key: 'mintFluffySweater', label: '薄荷绿针织', family: 'top' },
    { key: 'greyDotCami', label: '灰波点吊带', family: 'top' },
    { key: 'pinkSheerSet', label: '粉色针织套装', family: 'set' },
    { key: 'creamStripeSet', label: '米色条纹套装', family: 'set' },
    { key: 'plaidDress', label: '红蓝格纹连衣裙', family: 'dress' }
  ],
  outer: [
    { key: 'rustCardigan', label: '铁锈棕罗纹开衫' },
    { key: 'creamBlazer', label: '奶油白西装' },
    { key: 'brownTweedBlazer', label: '棕色呢质西装' },
    { key: 'furTrimCardigan', label: '毛领针织外套' },
    { key: 'brownPatternCardigan', label: '复古花纹开衫' }
  ],
  bottom: [
    { key: 'creamPleatedSkirt', label: '奶油白百褶裙' },
    { key: 'blackLaceFlaredSkirt', label: '黑色蕾丝短裙' },
    { key: 'blackLaceStraightSkirt', label: '黑色直筒蕾丝裙' }
  ]
}

const productImageCache = new Map()
const tintedProductCache = new Map()

function selectOutfitLook(scheme) {
  const palette = (scheme.colors || []).map(function (item) { return item.hex }).join('')
  const seed = Array.from(palette + (scheme.id || '')).reduce(function (total, char) {
    return (total * 31 + char.charCodeAt(0)) >>> 0
  }, 7)
  const schemeOffset = { accent: 0, layered: 4, default: 8 }[scheme.id] || 0
  return {
    main: OUTFIT_LIBRARY.main[(seed + schemeOffset) % OUTFIT_LIBRARY.main.length],
    outer: OUTFIT_LIBRARY.outer[(seed * 3 + schemeOffset + 1) % OUTFIT_LIBRARY.outer.length],
    bottom: OUTFIT_LIBRARY.bottom[(seed * 5 + schemeOffset + 2) % OUTFIT_LIBRARY.bottom.length]
  }
}

function findAlbumFromLabel(label) {
  if (!label) return null
  const lower = String(label).toLowerCase()
  return data.albums.filter(function (a) {
    return lower.indexOf(String(a.title).toLowerCase()) !== -1
  })[0] || null
}

function loadProductImage(key) {
  if (productImageCache.has(key)) return productImageCache.get(key)
  const src = assetUrl(PRODUCT_ASSETS[key])
  if (!src) return Promise.reject(new Error('Unknown product asset: ' + key))

  const promise = new Promise(function (resolve, reject) {
    const image = new Image()
    image.onload = function () { resolve(image) }
    image.onerror = function () { reject(new Error('Unable to load product asset: ' + src)) }
    image.src = src
  })
  productImageCache.set(key, promise)
  return promise
}

function tintedProduct(key, image, hex) {
  const cacheKey = key + '|' + hex
  if (tintedProductCache.has(cacheKey)) return tintedProductCache.get(cacheKey)

  const tinted = document.createElement('canvas')
  tinted.width = image.naturalWidth
  tinted.height = image.naturalHeight
  const tintedContext = tinted.getContext('2d', { willReadFrequently: true })
  tintedContext.drawImage(image, 0, 0)

  const target = [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16)
  ]
  const imageData = tintedContext.getImageData(0, 0, tinted.width, tinted.height)
  const pixels = imageData.data
  for (let index = 0; index < pixels.length; index += 4) {
    if (pixels[index + 3] < 4) continue
    const luminance = (
      pixels[index] * 0.2126 +
      pixels[index + 1] * 0.7152 +
      pixels[index + 2] * 0.0722
    ) / 255
    const shade = 0.48 + Math.pow(luminance, 0.9) * 0.64
    const highlight = Math.max(0, luminance - 0.73) * 120
    pixels[index] = Math.min(255, target[0] * shade + highlight)
    pixels[index + 1] = Math.min(255, target[1] * shade + highlight)
    pixels[index + 2] = Math.min(255, target[2] * shade + highlight)
  }
  tintedContext.putImageData(imageData, 0, 0)
  tintedProductCache.set(cacheKey, tinted)
  return tinted
}

function drawContainedImage(ctx, image, x, y, width, height) {
  const ratio = Math.min(width / image.width, height / image.height)
  const drawWidth = image.width * ratio
  const drawHeight = image.height * ratio
  ctx.drawImage(
    image,
    x + (width - drawWidth) / 2,
    y + (height - drawHeight) / 2,
    drawWidth,
    drawHeight
  )
}

async function drawOutfitCard(canvas, options) {
  const scheme = options.scheme
  const profile = options.profile || {}
  if (!scheme || !scheme.colors || !scheme.colors.length) return
  const look = selectOutfitLook(scheme)
  const productEntries = await Promise.all(
    [look.main.key, look.outer.key, look.bottom.key].map(function (key) {
      return loadProductImage(key).then(function (image) {
        return [key, image]
      })
    })
  )
  const products = Object.fromEntries(productEntries)
  const scale = 2
  const W = 720
  const H = 920
  canvas.width = W * scale
  canvas.height = H * scale
  const ctx = canvas.getContext('2d')
  ctx.scale(scale, scale)

  function color(key, fallback) {
    const found = scheme.colors.filter(function (c) { return c.key === key })[0]
    return found ? found.hex : fallback
  }
  const baseHex = color('base', scheme.colors[0].hex)
  const darkHex = color('dark', color('mid', scheme.colors[scheme.colors.length - 1].hex))
  const accentHex = color('accent', scheme.colors[scheme.colors.length - 1].hex)
  const midHex = color('mid', baseHex)

  function rounded(x, y, w, h, r, fill, stroke) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
    if (fill) { ctx.fillStyle = fill; ctx.fill() }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke() }
  }

  function tag(text, x, y, color) {
    ctx.font = '600 16px system-ui, sans-serif'
    ctx.fillStyle = color
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(text, x, y)
  }

  function piece(item, role, box) {
    const pieceColor = color(role, baseHex)
    const image = tintedProduct(item.key, products[item.key], pieceColor)
    ctx.save()
    ctx.shadowColor = 'rgba(42, 26, 14, 0.13)'
    ctx.shadowBlur = 18
    ctx.shadowOffsetY = 10
    drawContainedImage(ctx, image, box[0], box[1], box[2], box[3])
    ctx.restore()

    const labelText = item.label + ' · ' + pieceColor
    ctx.font = '600 16px system-ui, sans-serif'
    const chipWidth = Math.min(ctx.measureText(labelText).width + 32, box[2] - 20)
    rounded(box[0] + 10, box[1] + box[3] - 38, chipWidth, 28, 14, 'rgba(255,255,255,0.92)')
    tag(labelText, box[0] + 24, box[1] + box[3] - 18, '#5E402C')
  }

  function accessoryIcon(type, x, y, accessoryColor, detailColor) {
    ctx.save()
    ctx.strokeStyle = detailColor
    ctx.fillStyle = accessoryColor
    ctx.lineWidth = 2.2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    if (type === 'bag') {
      ctx.beginPath()
      ctx.arc(x + 23, y + 15, 12, Math.PI, 0)
      ctx.stroke()
      rounded(x, y + 14, 46, 34, 8, accessoryColor, detailColor)
      ctx.beginPath()
      ctx.moveTo(x + 23, y + 17)
      ctx.lineTo(x + 23, y + 46)
      ctx.stroke()
    } else if (type === 'cap') {
      ctx.beginPath()
      ctx.arc(x + 23, y + 31, 19, Math.PI, 0)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      ctx.beginPath()
      ctx.ellipse(x + 29, y + 32, 29, 8, 0, 0, Math.PI * 2)
      ctx.stroke()
    } else {
      ctx.beginPath()
      ctx.arc(x + 12, y + 25, 10, 0, Math.PI * 2)
      ctx.arc(x + 36, y + 25, 10, 0, Math.PI * 2)
      ctx.moveTo(x + 22, y + 25)
      ctx.lineTo(x + 26, y + 25)
      ctx.stroke()
      ctx.globalAlpha = 0.72
      ctx.fill()
    }
    ctx.restore()
  }

  // 背景
  ctx.fillStyle = '#F7F0E4'
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#FFFFFF'
  rounded(18, 18, W - 36, H - 36, 26, '#FFFFFF')

  // 顶部信息
  ctx.textBaseline = 'alphabetic'
  ctx.font = '700 34px system-ui, sans-serif'
  ctx.fillStyle = '#2A1A0E'
  ctx.fillText(scheme.name || '穿搭方案', 44, 78)
  ctx.font = '500 16px system-ui, sans-serif'
  ctx.fillStyle = '#8A6B51'
  ctx.fillText(
    (profile.season || '') + '季 · ' + (profile.scene || '') + ' · ' + (profile.style || '') + ' · 主色 ' + baseHex + ' ' + (scheme.colors[0] ? scheme.colors[0].ratio : '') + '%',
    44,
    112
  )

  // 真实白底单品经过动态染色后组成造型板，换色卡时会同步重绘
  rounded(34, 136, 652, 528, 22, '#FBF8F2', '#EDE2D3')
  piece(
    look.main,
    look.main.family === 'dress' ? 'light' : 'base',
    look.main.family === 'set' ? [48, 164, 360, 438] : [60, 164, 304, 438]
  )
  piece(look.outer, 'mid', [374, 172, 248, 250])
  piece(look.bottom, 'dark', [342, 414, 342, 240])

  // 配饰只提供色彩、轮廓和材质提示，不使用固定商品图
  ctx.strokeStyle = '#EADFCE'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(44, 680)
  ctx.lineTo(W - 44, 680)
  ctx.stroke()
  ctx.font = '600 14px system-ui, sans-serif'
  ctx.fillStyle = '#B0642E'
  ctx.fillText('配饰参考', 44, 710)

  rounded(350, 678, 88, 40, 12, '#FFFFFF', '#EADFCE')
  accessoryIcon('bag', 360, 681, accentHex, darkHex)
  rounded(446, 678, 88, 40, 12, '#FFFFFF', '#EADFCE')
  accessoryIcon('cap', 459, 681, midHex, darkHex)
  rounded(542, 678, 88, 40, 12, '#FFFFFF', '#EADFCE')
  accessoryIcon('glasses', 556, 681, 'rgba(255,255,255,0)', darkHex)
  ctx.font = '600 12px system-ui, sans-serif'
  ctx.fillStyle = '#7F634C'
  ctx.textAlign = 'center'
  ctx.fillText('包袋', 394, 737)
  ctx.fillText('帽饰', 490, 737)
  ctx.fillText('金属点缀', 586, 737)
  ctx.textAlign = 'left'

  // 分隔线 + 色板条
  ctx.strokeStyle = '#EADFCE'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(44, 760)
  ctx.lineTo(W - 44, 760)
  ctx.stroke()

  let x = 44
  scheme.colors.forEach(function (c) {
    rounded(x, 784, Math.max(38, c.ratio * 4.2), 82, 12, c.hex)
    ctx.font = '700 14px "Courier New", monospace'
    ctx.fillStyle = '#2A1A0E'
    ctx.fillText(c.hex.toUpperCase(), x + 8, 818)
    ctx.font = '500 13px system-ui, sans-serif'
    ctx.fillStyle = '#8A6B51'
    ctx.fillText((c.role || '') + ' · ' + c.ratio + '%', x + 8, 840)
    x += Math.max(38, c.ratio * 4.2) + 10
  })
}

function downloadPreview(canvas, scheme) {
  const name = (scheme ? scheme.name || 'outfit' : 'outfit')
    .replace(/[\\/:*?"<>|]/g, '-')
  const link = document.createElement('a')
  link.href = canvas.toDataURL('image/png')
  link.download = 'SMilE萝卜-穿搭预览-' + name + '.png'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

function OutfitPreview(props) {
  const scheme = props.scheme
  const profile = props.profile
  const label = props.label
  const canvasRef = useRef(null)
  const album = findAlbumFromLabel(label)
  const [saved, setSaved] = useState(false)
  const [rendering, setRendering] = useState(true)

  useEffect(function () {
    let ignored = false
    if (!canvasRef.current) return undefined
    setRendering(true)
    drawOutfitCard(canvasRef.current, { scheme: scheme, profile: profile })
      .catch(function () {
        // 绘制失败不阻断页面，下载时会再次尝试
      })
      .finally(function () {
        if (!ignored) setRendering(false)
      })
    return function () { ignored = true }
  }, [scheme, profile])

  useEffect(function () {
    setSaved(false)
  }, [scheme])

  async function onSave() {
    if (!canvasRef.current) return
    try {
      await drawOutfitCard(canvasRef.current, { scheme: scheme, profile: profile })
      downloadPreview(canvasRef.current, scheme)
      setSaved(true)
      window.setTimeout(function () { setSaved(false) }, 2200)
    } catch (error) {
      setSaved(false)
    }
  }

  if (!scheme || !scheme.colors || !scheme.colors.length) return null

  const first = scheme.colors[0]
  const last = scheme.colors[scheme.colors.length - 1]
  const darkPiece =
    scheme.colors.filter(function (c) { return c.key === 'dark' })[0] ||
    scheme.colors.filter(function (c) { return c.key === 'mid' })[0] ||
    last

  return (
    <div className="tool-preview">
      <div className="tool-preview-head">
        <strong>穿搭预览</strong>
      </div>

      <div className="tool-preview-body">
        <figure className="tool-preview-figure">
          <canvas
            ref={canvasRef}
            className={'tool-preview-canvas' + (rendering ? ' is-rendering' : '')}
            aria-label={'穿搭预览图 ' + scheme.name}
          />
        </figure>

        <div className="tool-preview-side">
          <div className="tool-preview-speech">
            <CarrotMascot size={36} className="tool-preview-speech-avatar" aria-hidden="true" />
            <div className="tool-preview-speech-bubble">
              <span className="mono tool-preview-speech-kicker">小萝卜说</span>
              <p className="tool-preview-desc">
                用 {first.hex} 定主调，{last.hex} 做层次，{darkPiece.hex} 压住下装重心。
              </p>
            </div>
          </div>

          <div className="tool-preview-actions">
            <button type="button" className="tool-preview-save" onClick={onSave} disabled={rendering}>
              {saved ? '✓ 已保存' : rendering ? '正在组合单品…' : '下载预览图 PNG'}
            </button>
          </div>

          {album ? (
            <div className="tool-preview-album">
              <span className="tool-preview-album-kicker">关联穿搭</span>
              <Link to={'/works/' + album.id} className="tool-preview-album-link">
                <span className="tool-preview-album-cover">
                  <img src={album.cover} alt={album.title + ' 封面'} />
                </span>
                <span className="tool-preview-album-meta">
                  <strong>{album.title}</strong>
                  <small>{album.artist}</small>
                </span>
                <span aria-hidden="true">→</span>
              </Link>
              {(album.wardrobe || []).length ? (
                <div className="tool-preview-pieces">
                  {(album.wardrobe || []).slice(0, 4).map(function (piece) {
                    return (
                      <Link to={'/works/' + album.id} key={piece.name} className="tool-preview-piece">
                        <i style={{ background: piece.color }} aria-hidden="true" />
                        <span>{piece.name}</span>
                      </Link>
                    )
                  })}
                </div>
              ) : null}
            </div>
          ) : (
            <p className="tool-preview-noalbum mono">
              手动配色暂无关联专辑。
            </p>
          )}

          <button
            type="button"
            className="tool-preview-chat-launch"
            onClick={function () {
              window.dispatchEvent(new CustomEvent('smile:open-carrot-chat'))
            }}
          >
            <span className="tool-preview-chat-launch-avatar" aria-hidden="true">
              <CarrotMascot size={30} />
            </span>
            <span className="tool-preview-chat-launch-copy">
              <strong>问小萝卜</strong>
              <small>继续聊这套穿搭</small>
            </span>
            <span className="tool-preview-chat-launch-arrow" aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </div>
  )
}

async function writeClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch (error) {
    // Fall through to the compatibility path.
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  textarea.style.pointerEvents = 'none'
  document.body.appendChild(textarea)
  textarea.select()
  const copied = document.execCommand('copy')
  document.body.removeChild(textarea)
  return copied
}

function OptionRow(props) {
  const { label, options, value, onChange, note, step, wide } = props
  const delay = Math.max(0, Number(step || 1) - 1) * 65
  return (
    <div
      className={'tool-field' + (wide ? ' is-wide' : '')}
      style={{ '--field-delay': delay + 'ms' }}
    >
      <div className="tool-field-head">
        <span className="tool-field-title">
          <span className="mono tool-field-step">STEP {step}</span>
          <span className="tool-field-label">{label}</span>
        </span>
        {note && <span className="mono tool-field-note">{note}</span>}
      </div>
      <div className="tool-chips">
        {options.map(function (option) {
          return (
            <button
              key={option}
              type="button"
              className={'tool-chip' + (value === option ? ' active' : '')}
              onClick={function () { onChange(option) }}
            >
              {option}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function Tool(props) {
  const setMessages = props.setCarrotMessages
  const [step, setStep] = useState(1)
  const [source, setSource] = useState('preset')
  const [status, setStatus] = useState('idle')
  const [notice, setNotice] = useState('')
  const [preview, setPreview] = useState('')
  const [hexInput, setHexInput] = useState(SAMPLE_HEX)
  const [palette, setPalette] = useState([])
  const [paletteLabel, setPaletteLabel] = useState('')
  const [profile, setProfile] = useState({
    season: '秋',
    gender: '中性',
    scene: '通勤 / 上课',
    style: '极简',
    skin: '不确定',
    wardrobe: ''
  })
  const [activeSchemeId, setActiveSchemeId] = useState('stable')
  const [copiedHex, setCopiedHex] = useState('')
  const copiedTimerRef = useRef(null)

  useEffect(function () {
    document.body.classList.add('lab-theme')
    return function () { document.body.classList.remove('lab-theme') }
  }, [])

  useEffect(function () {
    return function () { window.clearTimeout(copiedTimerRef.current) }
  }, [])

  const parsedHex = useMemo(function () { return parseColorInput(hexInput) }, [hexInput])
  const liveSchemes = useMemo(function () {
    if (parsedHex.colors.length < 2) return []
    return buildColorSchemes(paletteFromHexes(parsedHex.colors))
  }, [parsedHex])
  const schemes = useMemo(function () { return buildColorSchemes(palette) }, [palette])
  const activeScheme =
    schemes.filter(function (s) { return s.id === activeSchemeId })[0] || schemes[0] || null

  function updateProfile(key, value) {
    setProfile(function (current) {
      const next = Object.assign({}, current)
      next[key] = value
      return next
    })
  }

  function applyPalette(list, label) {
    setPalette(list)
    setPaletteLabel(label)
    setActiveSchemeId('stable')
    setNotice(list.length < 3 ? '色板少于 3 个颜色，建议再补 1-2 个，方案会更稳。' : '')
    setStep(2)
  }

  async function copyHex(hex, event) {
    if (event) event.stopPropagation()
    const normalized = String(hex).toUpperCase()
    const copied = await writeClipboard(normalized)
    if (!copied) {
      setNotice('浏览器未允许自动复制，请手动选择色号。')
      return
    }
    setCopiedHex(normalized)
    window.clearTimeout(copiedTimerRef.current)
    copiedTimerRef.current = window.setTimeout(function () {
      setCopiedHex('')
    }, 1500)
  }

  function onHexKeyDown(hex, event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      copyHex(hex, event)
    }
  }

  function renderHexCopy(hex, variant) {
    const normalized = String(hex).toUpperCase()
    const copied = copiedHex === normalized
    return (
      <span
        className={'tool-hex-copy' + (variant ? ' is-' + variant : '') + (copied ? ' is-copied' : '')}
        role="button"
        tabIndex={0}
        aria-label={'复制色号 ' + normalized}
        title="点击复制色号"
        onClick={function (event) { copyHex(normalized, event) }}
        onKeyDown={function (event) { onHexKeyDown(normalized, event) }}
      >
        <i className="tool-hex-dot" style={{ background: normalized }} />
        <span className="tool-hex-code">{normalized}</span>
        <span className="tool-hex-copied" aria-live="polite">{copied ? '已复制' : ''}</span>
      </span>
    )
  }

  function onFile(event) {
    const file = event.target.files && event.target.files[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setStatus('error')
      setNotice('这不是图片文件，换一张试试。')
      return
    }
    setStatus('loading')
    setNotice('')
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = function () {
      const extracted = extractPalette(image, 5)
      setPreview(url)
      setStatus('done')
      if (extracted && extracted.length) {
        applyPalette(extracted, '图片提取 · ' + file.name)
      } else {
        setStatus('error')
        setNotice('这张图没能读出颜色，换一张对比更清楚的图，或者直接用色号输入。')
      }
    }
    image.onerror = function () {
      setStatus('error')
      setNotice('图片读取失败，换一张试试。')
    }
    image.src = url
  }

  function applyHexInput() {
    if (!parsedHex.colors.length) {
      setNotice('没有识别到有效色号，格式像 #C9A24B 这样就行。')
      return
    }
    const invalidNote = parsedHex.invalid.length
      ? '已忽略：' + parsedHex.invalid.slice(0, 3).join('、') + '。'
      : ''
    applyPalette(
      paletteFromHexes(parsedHex.colors),
      '色号输入 · ' + parsedHex.colors.length + ' 色'
    )
    if (invalidNote) setNotice(invalidNote)
  }

  function applyPreset(album) {
    applyPalette(album.palette.slice(0, 5), '预设专辑 · ' + album.title)
  }

  function startAdvice() {
    if (!schemes.length) {
      setNotice('先给我一组颜色，最少两个。')
      return
    }
    setStep(3)
    setNotice('')
    setActiveSchemeId(schemes[0].id)
    setMessages(function (current) {
      return current.concat([{
        role: 'advisor',
        source: 'local',
        at: Date.now(),
        text:
          '奥凯，' + profile.season + '季、' + profile.scene + '、' + profile.style +
          '这条线小萝卜记下啦！先看左边三套，有想细聊的直接问我呀。'
      }])
    })
  }

  return (
    <div className="tool">
      <header className="tool-header">
        <div className="tool-header-num mono">02 / AI COLOR LAB</div>
        <h1 className="tool-title">AI 穿搭色彩实验室</h1>
        <p className="tool-sub">给我一组颜色，还你一套能穿出门的配比。</p>
      </header>

      {step === 1 && (
        <section className="tool-panel">
          <div className="tool-source-picker">
            <div className="tool-source-picker-head">
              <span className="tool-source-picker-title">颜色来源</span>
            </div>
            <div className="tool-tabs" role="radiogroup" aria-label="颜色来源，三选一">
              {SOURCES.map(function (item) {
                const active = source === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    className={'tool-tab' + (active ? ' active' : '')}
                    onClick={function () { setSource(item.id); setNotice('') }}
                  >
                    <span className="tool-tab-label">{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {source === 'image' && (
            <div className="tool-source tool-upload-source">
              <label className="tool-upload-zone">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  onChange={onFile}
                  hidden
                />
                <div className="tool-upload-visual">
                  {preview ? (
                    <img className="tool-upload-preview" src={preview} alt="已上传图片预览" />
                  ) : (
                    <div className="tool-upload-placeholder" aria-hidden="true">
                      <CarrotMascot size={82} className="tool-upload-mascot" />
                      <span className="mono">IMAGE → COLOR</span>
                    </div>
                  )}
                </div>
                <div className="tool-upload-content">
                  <span className="mono tool-upload-eyebrow">LOCAL COLOR EXTRACTION</span>
                  <strong>
                    {status === 'loading'
                      ? '正在读取图片颜色'
                      : preview ? '图片已读取，可以更换' : '上传图片，提取主色'}
                  </strong>
                  <p>仅本地提取，图片不会上传。</p>
                  <span className="tool-upload-action">
                    {preview ? '更换一张图片' : '点击选择图片'}
                    <b aria-hidden="true">＋</b>
                  </span>
                </div>
              </label>
            </div>
          )}

          {source === 'hex' && (
            <div className="tool-source">
              <label className="tool-hex">
                <span className="mono tool-hex-label">HEX / RGB · 逗号或换行分隔</span>
                <textarea
                  value={hexInput}
                  onChange={function (e) { setHexInput(e.target.value) }}
                  rows={5}
                  spellCheck="false"
                  placeholder="#2B3A67, #C9A24B, #F2EBDC"
                />
              </label>
              <div className="tool-hex-row">
                <div className="tool-parse">
                  <span className="mono tool-parse-label">
                    识别到 {parsedHex.colors.length} 个色号
                  </span>
                  <div className="tool-parse-chips">
                    {parsedHex.colors.map(function (hex) {
                      return (
                        <span className="tool-parse-chip" key={hex}>
                          {renderHexCopy(hex, 'parse')}
                        </span>
                      )
                    })}
                    {parsedHex.invalid.map(function (token, index) {
                      return (
                        <span className="tool-parse-chip invalid mono" key={token + index}>
                          {token}
                        </span>
                      )
                    })}
                  </div>
                </div>
                <button type="button" className="tool-cta" onClick={applyHexInput}>
                  生成配比建议
                </button>
              </div>

              {liveSchemes.length > 0 && (
                <div className="tool-live">
                  <div className="tool-live-head">
                    <span className="mono tool-live-label">LIVE · 实时权重建议</span>
                    <span className="mono tool-live-hint">点任意一套即可使用</span>
                  </div>
                  <div className="tool-live-list">
                    {liveSchemes.map(function (scheme) {
                      return (
                        <button
                          key={scheme.id}
                          type="button"
                          className="tool-live-scheme"
                          onClick={function () {
                            applyPalette(paletteFromHexes(parsedHex.colors), '色号输入 · 实时')
                            setActiveSchemeId(scheme.id)
                          }}
                        >
                          <span className="tool-scheme-top">
                            <span className="mono tool-scheme-kicker">{scheme.kicker}</span>
                            <strong>{scheme.name}</strong>
                          </span>
                          <span className="tool-scheme-bar is-compact">
                            {scheme.colors.map(function (color) {
                              return (
                                <i
                                  key={color.key + color.hex}
                                  style={{ background: color.hex, flexGrow: color.ratio }}
                                />
                              )
                            })}
                          </span>
                          <span className="tool-scheme-legend">
                            {scheme.colors.map(function (color) {
                              return (
                                <span className="mono tool-scheme-color" key={color.key}>
                                  {renderHexCopy(color.hex, 'legend')} · {color.ratio}%
                                </span>
                              )
                            })}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {source === 'preset' && (
            <div className="tool-source">
              <p className="tool-source-hint mono">
                点专辑，直接出配比
              </p>
              <div className="tool-preset-grid">
                {data.albums.map(function (album) {
                  return (
                    <button
                      type="button"
                      className="tool-preset-card"
                      key={album.id}
                      onClick={function () { applyPreset(album) }}
                    >
                      <img src={album.cover} alt={album.title + ' 封面'} loading="lazy" />
                      <span className="tool-preset-meta">
                        <strong>{album.title}</strong>
                        <small>{album.artist}</small>
                      </span>
                      <span className="tool-preset-swatches">
                        {album.palette.slice(0, 5).map(function (color) {
                          return <i key={color.hex} style={{ background: color.hex }} />
                        })}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {notice && <div className="tool-notice">{notice}</div>}

          {palette.length > 0 && (
            <div className="tool-current">
              <div className="tool-current-head">
                <span className="mono tool-current-label">CURRENT PALETTE</span>
                <span className="mono tool-current-source">{paletteLabel}</span>
              </div>
              <div className="tool-current-bar">
                {palette.map(function (color) {
                  return (
                    <span
                      key={color.hex}
                      style={{ background: color.hex, flexGrow: color.ratio || 1 }}
                      title={color.hex}
                    />
                  )
                })}
              </div>
              <button
                type="button"
                className="tool-cta"
                onClick={function () { setStep(2); setNotice('') }}
              >
                下一步：补充风格资料
              </button>
            </div>
          )}
        </section>
      )}

      {step === 2 && (
        <section className="tool-panel tool-profile-panel">
          <div className="tool-profile">
            <header className="tool-profile-head">
              <span className="mono">STEP 02 / STYLE PROFILE</span>
              <div>
                <h2>补齐你的日常条件</h2>
              </div>
            </header>

            <div className="tool-profile-grid">
              <OptionRow
                step="01"
                label="季节"
                options={SEASON_OPTIONS}
                value={profile.season}
                onChange={function (v) { updateProfile('season', v) }}
                note="决定材质"
              />
              <OptionRow
                step="02"
                label="性别取向"
                options={GENDER_OPTIONS}
                value={profile.gender}
                onChange={function (v) { updateProfile('gender', v) }}
                note="影响廓形"
              />
              <OptionRow
                step="03"
                label="场合"
                options={SCENE_OPTIONS}
                value={profile.scene}
                onChange={function (v) { updateProfile('scene', v) }}
                note="决定正式度"
              />
              <OptionRow
                step="04"
                label="风格倾向"
                options={STYLE_OPTIONS}
                value={profile.style}
                onChange={function (v) { updateProfile('style', v) }}
                note="决定视觉语言"
              />
            </div>

            <div className="tool-panel-actions">
              <button type="button" className="tool-ghost" onClick={function () { setStep(1) }}>
                ← 回到颜色
              </button>
              <button type="button" className="tool-cta" onClick={startAdvice}>
                生成穿搭建议
              </button>
            </div>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="tool-panel tool-result-panel">
          <div className="tool-schemes">
            <div className="tool-scheme-list">
              {schemes.map(function (scheme) {
                const active = activeScheme && scheme.id === activeScheme.id
                return (
                  <button
                    key={scheme.id}
                    type="button"
                    className={'tool-scheme' + (active ? ' active' : '')}
                    onClick={function () { setActiveSchemeId(scheme.id) }}
                  >
                    <span className="tool-scheme-top">
                      <strong>{scheme.name}</strong>
                    </span>
                    <span className="tool-scheme-bar">
                      {scheme.colors.map(function (color) {
                        return (
                          <i
                            key={color.key + color.hex}
                            style={{ background: color.hex, flexGrow: color.ratio }}
                          />
                        )
                      })}
                    </span>
                    <span className="tool-scheme-legend">
                      {scheme.colors.map(function (color) {
                        return (
                          <span className="mono tool-scheme-color" key={color.key}>
                            {renderHexCopy(color.hex, 'legend')} · {color.ratio}%
                          </span>
                        )
                      })}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {activeScheme && (
            <OutfitPreview
              scheme={activeScheme}
              profile={profile}
              label={paletteLabel}
            />
          )}

          <div className="tool-panel-actions">
            <button type="button" className="tool-ghost" onClick={function () { setStep(2) }}>
              ← 调整风格资料
            </button>
            <button
              type="button"
              className="tool-ghost"
              onClick={function () { setStep(1); setNotice('') }}
            >
              换一组颜色
            </button>
          </div>
        </section>
      )}

    </div>
  )
}
