import { useRef, useEffect, useState, useMemo, Fragment } from 'react'
import { Link } from 'react-router-dom'
import { gsap } from 'gsap'
import { extractPalette, mixHex, hexToRgba, boostSaturation } from '../utils/color.js'

// 线上音乐平台：没有单独配置专辑直达链接时，退回「歌手 + 专辑名」的站内搜索页
const MUSIC_SERVICES = [
  {
    id: 'netease',
    label: '网易云音乐',
    search: 'https://music.163.com/#/search/m/?type=1&s='
  },
  {
    id: 'qq',
    label: 'QQ 音乐',
    search: 'https://y.qq.com/n/ryqq/search?t=song&remoteplace=txt.yqq.center&w='
  }
]

function musicHref(service, album) {
  const direct = album.links ? album.links[service.id] : ''
  if (direct) return direct
  const query = String((album.artist || '') + ' ' + (album.title || '')).trim()
  return service.search + encodeURIComponent(query)
}

function IconNote() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  )
}

function IconExternal() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 17 17 7" />
      <path d="M8 7h9v9" />
    </svg>
  )
}

// 把卡片复制 3 份做无缝滚动轨道
function makeTrack(items) {
  return [...items, ...items, ...items]
}

// 卡片沿弧线的最大倾角
const CARD_TILT = 9

function clampUnit(v) {
  return v < -1 ? -1 : v > 1 ? 1 : v
}

// 圆弧剖面：n = -1 / 1 是弧线两端，n = 0 是弧顶。
// 返回 -1 ~ 1，弧顶朝内、两端朝外，整排卡片真正落在一条弧上。
function arcProfile(n) {
  const x = clampUnit(n)
  return (Math.sqrt(Math.max(0, 1 - x * x)) - 0.5) * 2
}

// 第一帧的估算位置，轨道跑起来后每一帧会按卡片在屏幕中的实际位置重算
function waveOffset(i, total, side) {
  const t = total > 1 ? (i % total) / (total - 1) : 0.5
  const n = t * 2 - 1
  // 上排中心向下鼓、下排中心向上鼓，两排像一对朝内张开的括号
  const inset = side === 'top' ? 1 : -1
  return { yf: arcProfile(n) * inset, rot: -n * inset * CARD_TILT }
}

// 标题按词拆分：词内不断行，动画以一个词为一拍
function titleWords(title) {
  return String(title || '').split(/\s+/).filter(Boolean)
}

// 标题越长字号越小，避免长专辑名被挤成三四行
function titleSizeClass(title) {
  const len = String(title || '').length
  if (len > 18) return ' is-long'
  if (len > 10) return ' is-mid'
  return ''
}

// 取色失败时的兜底：把预设色补足成 4 个，占比归一到 100
function buildFallback(album) {
  const out = album.palette.map(function (c) {
    return { hex: c.hex, ratio: c.ratio }
  })
  let guard = 0
  while (out.length < 4 && guard < 3) {
    out.push({
      hex: mixHex(out[0].hex, out[out.length - 1].hex, 0.35 + guard * 0.18),
      ratio: 10
    })
    guard += 1
  }
  const sum = out.reduce(function (s, c) { return s + c.ratio }, 0) || 1
  const scaled = out.slice(0, 4).map(function (c) {
    return { hex: c.hex, ratio: Math.max(3, Math.round(c.ratio / sum * 100)) }
  })
  const total = scaled.reduce(function (s, c) { return s + c.ratio }, 0)
  scaled[scaled.length - 1].ratio = Math.max(3, scaled[scaled.length - 1].ratio + (100 - total))
  return scaled
}

// 复制色号的兼容写法：优先用 Clipboard API，失败时退回选中复制
function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text)
  }
  return new Promise(function (resolve, reject) {
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', 'readonly')
    area.style.position = 'fixed'
    area.style.top = '-1000px'
    document.body.appendChild(area)
    area.select()
    let ok = false
    try { ok = document.execCommand('copy') } catch (e) { ok = false }
    area.remove()
    if (ok) resolve()
    else reject(new Error('copy failed'))
  })
}

// 色卡：竖向排列，点任意一行复制色号
function PaletteList(props) {
  const { palette, extraClass } = props
  const [copied, setCopied] = useState('')
  const timerRef = useRef(0)

  useEffect(function () {
    return function () { window.clearTimeout(timerRef.current) }
  }, [])

  function handleCopy(hex) {
    const text = String(hex).toUpperCase()
    copyText(text).then(
      function () {
        setCopied(text)
        window.clearTimeout(timerRef.current)
        timerRef.current = window.setTimeout(function () { setCopied('') }, 1500)
      },
      function () {}
    )
  }

  return (
    <div className={'waterfall-info-palette' + (extraClass ? ' ' + extraClass : '')}>
      {palette.map(function (c, i) {
        const isCopied = copied === String(c.hex).toUpperCase()
        return (
          <button
            type="button"
            className={'waterfall-swatch' + (isCopied ? ' is-copied' : '')}
            key={c.hex + '-' + i}
            onClick={function () { handleCopy(c.hex) }}
            title={'点击复制 ' + c.hex}
            aria-label={'复制色号 ' + c.hex}
          >
            <span className="waterfall-swatch-color" style={{ background: c.hex }} />
            <span className="waterfall-swatch-hex mono">{c.hex}</span>
          </button>
        )
      })}
    </div>
  )
}

// 音乐平台直达：点一下就能跳到对应专辑，不用自己再搜
function MusicLinks(props) {
  const { album } = props
  return (
    <div className="waterfall-music">
      <div className="waterfall-music-links">
        {MUSIC_SERVICES.map(function (service) {
          return (
            <a
              key={service.id}
              className="waterfall-music-link"
              href={musicHref(service, album)}
              target="_blank"
              rel="noreferrer"
              title={'在' + service.label + '打开 ' + album.title}
            >
              <IconNote />
              <span>{service.label}</span>
              <IconExternal />
            </a>
          )
        })}
      </div>
    </div>
  )
}

function WaterfallRow(props) {
  const { items, direction, side, hoverKey, setHoverKey, onPick, baseSpeed, velocityRef, focusId } = props
  const trackRef = useRef()
  const rowRef = useRef()
  const offsetRef = useRef(0)
  const lastTimeRef = useRef(0)
  const speedRef = useRef(baseSpeed)
  const track = useMemo(function () { return makeTrack(items) }, [items])
  const total = items.length
  const dirSign = direction === 'rtl' ? -1 : 1

  useEffect(function () {
    const el = trackRef.current
    if (!el) return
    let raf
    function tick(now) {
      if (lastTimeRef.current === 0) lastTimeRef.current = now
      const dt = Math.min(0.05, (now - lastTimeRef.current) / 1000)
      lastTimeRef.current = now

      const target = velocityRef.current * dirSign
      // 指数插值：速度平缓趋近目标值，不会瞬间跳变
      const k = 1 - Math.pow(0.03, dt)
      speedRef.current = speedRef.current + (target - speedRef.current) * k
      offsetRef.current += speedRef.current * dt

      // 用「第一组」与「第二组」首张卡片的位移差得到精确单组宽度，避免接缝跳动
      const first = el.children[0]
      const secondSetFirst = el.children[total]
      const third =
        first && secondSetFirst
          ? secondSetFirst.offsetLeft - first.offsetLeft
          : el.scrollWidth / 3
      if (third > 0) {
        if (offsetRef.current >= third) offsetRef.current -= third
        if (offsetRef.current < 0) offsetRef.current += third
      }
      el.style.transform = 'translate3d(' + (-offsetRef.current).toFixed(2) + 'px,0,0)'

      const row = rowRef.current
      if (row) {
        const rowRect = row.getBoundingClientRect()
        // 整排滚出视口时不再逐张计算，省掉无意义的重排
        if (rowRect.bottom > -240 && rowRect.top < window.innerHeight + 240) {
          const viewportCenter = window.innerWidth / 2
          // 弧线跨度取屏宽的 40%，跨度越窄弯度越明显
          const curveSpan = Math.max(240, window.innerWidth * 0.4)
          // 1 = 上排中心向下鼓，-1 = 下排中心向上鼓：两排对称，凸面都朝向中央唱片
          const inset = side === 'top' ? 1 : -1
          const cards = el.children
          for (let i = 0; i < cards.length; i += 1) {
            const card = cards[i]
            const cardCenter =
              rowRect.left +
              card.offsetLeft +
              card.offsetWidth / 2 -
              offsetRef.current
            const n = clampUnit((cardCenter - viewportCenter) / curveSpan)
            card.style.setProperty('--curve-y', (arcProfile(n) * inset).toFixed(4))
            // 卡片顺着弧线切线旋转，越靠两端越朝外张开
            card.style.setProperty('--curve-rot', (-n * inset * CARD_TILT).toFixed(2) + 'deg')
          }
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return function () { cancelAnimationFrame(raf) }
  }, [dirSign, side, velocityRef, total])

  // 鼠标越靠近这条轨道，目标速度越低：全局监听 + smoothstep，让减速是渐进的
  useEffect(function () {
    function onGlobalMove(e) {
      const row = rowRef.current
      if (!row) return
      const rect = row.getBoundingClientRect()
      const centerY = rect.top + rect.height / 2
      const dist = Math.abs(e.clientY - centerY)
      const range = rect.height / 2 + 300
      const raw = 1 - dist / range
      const c = raw <= 0 ? 0 : raw >= 1 ? 1 : raw * raw * (3 - 2 * raw)
      // 最慢降到基础速度的 4%，接近时是渐变而不是直接归零
      velocityRef.current = baseSpeed * (1 - c * 0.96)
    }
    window.addEventListener('mousemove', onGlobalMove)
    return function () { window.removeEventListener('mousemove', onGlobalMove) }
  }, [baseSpeed, velocityRef])

  return (
    <div
      className={'waterfall-row dir-' + direction}
      ref={rowRef}
      onMouseLeave={function () { setHoverKey(null) }}
    >
      <div className="waterfall-track" ref={trackRef}>
        {track.map(function (item, i) {
          const off = waveOffset(i, total, side)
          return (
            <button
              type="button"
              className={
                'waterfall-card' +
                (hoverKey === item.key ? ' is-hover' : '') +
                (focusId && item.album.id === focusId ? ' is-focus' : '')
              }
              key={item.key + '-' + i}
              style={{
                '--curve-y': off.yf,
                '--curve-rot': off.rot + 'deg'
              }}
              onMouseEnter={function () { setHoverKey(item.key) }}
              onClick={function (e) { onPick(item.album, item.face, e) }}
              aria-label={item.album.title + (item.face === 'outfit' ? ' 穿搭实拍' : ' 专辑封面')}
            >
              <img src={item.src} alt={item.album.title} />
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function AlbumArcWaterfall(props) {
  const { albums, initialAlbumId = '' } = props
  const requestedAlbum = useMemo(function () {
    return albums.find(function (album) { return album.id === initialAlbumId }) || albums[0]
  }, [albums, initialAlbumId])
  const [active, setActive] = useState(requestedAlbum)
  const [opened, setOpened] = useState(false)
  const [hoverKey, setHoverKey] = useState(null)
  const [focusId, setFocusId] = useState(requestedAlbum ? requestedAlbum.id : '')
  const [extracted, setExtracted] = useState({})
  const featuredRef = useRef()
  const cardRef = useRef()
  const shineRef = useRef()
  const ambientRef = useRef()
  const infoRef = useRef()
  const titleRef = useRef()
  const tiltRef = useRef({ x: 0, y: 0 })
  const openedRef = useRef(false)
  const flyingRef = useRef(false)
  // 首次进入不播标题动画，用户点过专辑之后才开始播
  const pickedRef = useRef(false)
  const paletteRef = useRef(null)
  // 记录已经应用过的 URL 参数，避免用户点选其它专辑时被同步逻辑拉回
  const appliedRequestRef = useRef(requestedAlbum ? requestedAlbum.id : '')
  const baseSpeed = 128
  const topVelRef = useRef(baseSpeed)
  const bottomVelRef = useRef(baseSpeed)

  useEffect(function () {
    openedRef.current = opened
  }, [opened])

  // 从首页指定光碟进入时，直接选中对应专辑；只有路由参数变化才同步，
  // 这样在瀑布流里点其它作品仍然可以自由切换中间的专辑。
  useEffect(function () {
    if (!requestedAlbum) return
    if (appliedRequestRef.current === requestedAlbum.id) return
    appliedRequestRef.current = requestedAlbum.id
    pickedRef.current = false
    setActive(requestedAlbum)
    setOpened(false)
    setFocusId(requestedAlbum.id)
  }, [requestedAlbum])

  const albumItems = useMemo(function () {
    return albums.map(function (album) {
      return { key: album.id + '-cover', album: album, face: 'cover', src: album.cover }
    })
  }, [albums])

  const fallback = useMemo(function () {
    const map = {}
    albums.forEach(function (a) { map[a.id] = buildFallback(a) })
    return map
  }, [albums])

  // 进页面时把所有封面读一遍，提取主色缓存起来，切换专辑就不用等
  useEffect(function () {
    let cancelled = false
    albums.forEach(function (a) {
      const img = new Image()
      img.decoding = 'async'
      img.onload = function () {
        if (cancelled) return
        const p = extractPalette(img, 4)
        if (p && p.length >= 3) {
          setExtracted(function (prev) {
            const next = { ...prev }
            next[a.id] = p
            return next
          })
        }
      }
      img.src = a.cover
    })
    return function () { cancelled = true }
  }, [albums])

  const palette = extracted[active.id] || fallback[active.id]
  useEffect(function () { paletteRef.current = palette }, [palette])

  // 页面底色跟随当前专辑主色变化，退出首页时还原
  useEffect(function () {
    const p = extracted[active.id] || fallback[active.id]
    const root = document.documentElement
    // 混向暖白的比例越低，背景越饱和、越沉浸
    const paper = '#F7F0E7'
    const deep = '#1B1512'
    const c0 = p[0].hex
    const c1 = (p[1] || p[0]).hex
    const c2 = (p[2] || p[0]).hex
    const c3 = (p[3] || p[1] || p[0]).hex
    const v0 = boostSaturation(c0, 0.42)
    const v1 = boostSaturation(c1, 0.62)
    const v2 = boostSaturation(c2, 0.55)
    const v3 = boostSaturation(c3, 0.40)
    gsap.killTweensOf(root)
    gsap.to(root, {
      '--dyn-a': mixHex(v0, paper, 0.30),
      '--dyn-b': mixHex(v1, paper, 0.16),
      '--dyn-c': mixHex(v2, paper, 0.22),
      '--dyn-d': mixHex(v3, paper, 0.40),
      '--dyn-deep': mixHex(v0, deep, 0.46),
      '--dyn-deep2': mixHex(v2, deep, 0.32),
      duration: 0.85,
      ease: 'power2.out',
      overwrite: 'auto'
    })
    return function () { gsap.killTweensOf(root) }
  }, [active.id, extracted, fallback])

  useEffect(function () {
    return function () {
      const root = document.documentElement
      const keys = ['--dyn-a', '--dyn-b', '--dyn-c', '--dyn-d', '--dyn-deep', '--dyn-deep2']
      keys.forEach(function (k) { root.style.removeProperty(k) })
    }
  }, [])

  useEffect(function () {
    function onMove(e) {
      if (openedRef.current) {
        const featured = featuredRef.current
        if (!featured) return
        const rect = featured.getBoundingClientRect()
        const inside =
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom
        if (!inside) {
          tiltRef.current.x = 0
          tiltRef.current.y = 0
          return
        }
        tiltRef.current.x = clampUnit((e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2))
        tiltRef.current.y = clampUnit((e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2))
        return
      }
      const w = window.innerWidth
      const h = window.innerHeight
      tiltRef.current.x = (e.clientX / w) * 2 - 1
      tiltRef.current.y = (e.clientY / h) * 2 - 1
    }
    window.addEventListener('mousemove', onMove)
    return function () { window.removeEventListener('mousemove', onMove) }
  }, [])

  useEffect(function () {
    let raf
    function tick() {
      const el = featuredRef.current
      const tx = tiltRef.current.x
      const ty = tiltRef.current.y
      if (el) {
        const t = performance.now() * 0.001
        const expanded = openedRef.current
        const breath = 1 + Math.sin(t * 1.25) * (expanded ? 0.010 : 0.032)
        const floatX = Math.cos(t * 0.72) * (expanded ? 1.5 : 5)
        const floatY = Math.sin(t * 0.92) * (expanded ? 2.5 : 9)
        const rx = ty * (expanded ? -7 : -13)
        const ry = tx * (expanded ? 9 : 17)
        el.style.transform =
          'translate3d(' + floatX.toFixed(2) + 'px,' + floatY.toFixed(2) + 'px,0) ' +
          'perspective(1200px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg) scale(' + breath.toFixed(4) + ')'
      }
      const px = 50 + tx * 38
      const py = 40 + ty * 32
      const shine = shineRef.current
      if (shine) {
        const shineAngle = 104 + tx * 12
        shine.style.background =
          'linear-gradient(' + shineAngle.toFixed(1) + 'deg, ' +
          'rgba(255,255,255,0) 8%, rgba(255,255,255,0.025) 28%, ' +
          'rgba(255,255,255,0.17) 46%, rgba(255,255,255,0.035) 60%, rgba(255,255,255,0) 78%)'
        shine.style.backgroundPosition = (50 + tx * 34).toFixed(1) + '% ' + (50 + ty * 34).toFixed(1) + '%'
      }
      // 环境色反光：用当前专辑里饱和度更高的两个颜色，跟着鼠标反向移动
      const ambient = ambientRef.current
      if (ambient) {
        const p = paletteRef.current || []
        const colA = p[1] ? p[1].hex : '#FFFFFF'
        const colB = p[2] ? p[2].hex : (p[0] ? p[0].hex : '#FFFFFF')
        const colC = p[3] ? p[3].hex : (p[0] ? p[0].hex : '#FFFFFF')
        const ax = 100 - px
        const ay = 100 - py
        ambient.style.background =
          'radial-gradient(330px circle at ' + ax.toFixed(1) + '% ' + ay.toFixed(1) + '%, ' + hexToRgba(colA, 0.30) + ', transparent 72%),' +
          'radial-gradient(250px circle at ' + px.toFixed(1) + '% ' + (py * 0.7 + 20).toFixed(1) + '%, ' + hexToRgba(colB, 0.22) + ', transparent 68%),' +
          'radial-gradient(210px circle at ' + (100 - px * 0.45).toFixed(1) + '% ' + (py * 0.45 + 8).toFixed(1) + '%, ' + hexToRgba(colC, 0.16) + ', transparent 72%)'
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return function () { cancelAnimationFrame(raf) }
  }, [])

  useEffect(function () {
    if (!opened) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKeyDown(event) {
      if (event.key === 'Escape') setOpened(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return function () {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [opened])

  useEffect(function () {
    if (infoRef.current) {
      gsap.fromTo(
        infoRef.current,
        { opacity: 0.35, y: 14 },
        { opacity: 1, y: 0, duration: 0.55, ease: 'power2.out' }
      )
    }
  }, [active.id, opened])

  // 专辑名逐字从下往上揭幕
  function playTitle() {
    const line = titleRef.current
    if (!line) return
    const parts = line.querySelectorAll('.waterfall-info-title-char')
    if (!parts.length) return
    gsap.killTweensOf(parts)
    gsap.fromTo(
      parts,
      { yPercent: 116, opacity: 0, rotate: 4 },
      {
        yPercent: 0,
        opacity: 1,
        rotate: 0,
        duration: 0.72,
        ease: 'power4.out',
        stagger: 0.06,
        overwrite: true
      }
    )
  }

  // 点击专辑后才播标题动画，首次进入保持静止
  useEffect(function () {
    if (!pickedRef.current) return
    playTitle()
  }, [active.id, opened])

  function handlePick(album, nextFace, e) {
    const nextOpened = nextFace === 'outfit'
    pickedRef.current = true
    setFocusId(album.id)
    if (album.id === active.id && nextOpened === opened) {
      // 重复点同一张也让标题再演一次
      playTitle()
      return
    }
    const featured = featuredRef.current
    const img = e && e.currentTarget ? e.currentTarget.querySelector('img') : null

    // 连续点击时直接切换，避免动画叠加
    if (!featured || !img || flyingRef.current) {
      setActive(album)
      setOpened(nextOpened)
      return
    }

    const from = img.getBoundingClientRect()
    const to = featured.getBoundingClientRect()
    const clone = document.createElement('img')
    clone.src = img.currentSrc || img.src
    clone.alt = ''
    clone.className = 'waterfall-flight'
    clone.style.left = from.left + 'px'
    clone.style.top = from.top + 'px'
    clone.style.width = from.width + 'px'
    clone.style.height = from.height + 'px'
    document.body.appendChild(clone)

    flyingRef.current = true
    setActive(album)
    setOpened(nextOpened)
    gsap.to(featured, { opacity: 0, duration: 0.16, ease: 'power1.out' })

    let finished = false
    function finishFlight() {
      if (finished) return
      finished = true
      if (clone.isConnected) clone.remove()
      flyingRef.current = false
      gsap.to(featured, { opacity: 1, duration: 0.3, ease: 'power2.out' })
    }

    gsap.to(clone, {
      left: to.left,
      top: to.top,
      width: to.width,
      height: to.height,
      duration: 0.6,
      ease: 'power3.inOut',
      onComplete: finishFlight
    })
    window.setTimeout(finishFlight, 900)
  }

  function handleFlip() {
    if (flyingRef.current) return
    setOpened(function (current) { return !current })
  }

  return (
    <div className={'album-waterfall' + (opened ? ' is-expanded' : '')}>
      {opened ? (
        <button
          type="button"
          className="waterfall-immersive-backdrop"
          onClick={handleFlip}
          aria-label="收起沉浸式专辑展示"
        />
      ) : null}
      <WaterfallRow
        items={albumItems}
        direction="rtl"
        side="top"
        hoverKey={hoverKey}
        setHoverKey={setHoverKey}
        onPick={handlePick}
        baseSpeed={baseSpeed}
        velocityRef={topVelRef}
        focusId={focusId}
      />

      <div className="waterfall-stage">
        <button
          type="button"
          className="waterfall-featured"
          ref={featuredRef}
          onClick={handleFlip}
          aria-label={opened ? '收起专辑并返回瀑布流' : '打开唱片封套并沉浸查看穿搭'}
          aria-pressed={opened}
        >
          <div className={'vinyl-card' + (opened ? ' is-open' : '')} ref={cardRef}>
            <div className="vinyl-disc" aria-hidden="true">
              <div className="vinyl-grooves" />
              <div className="vinyl-label">
                <img src={active.cover} alt="" />
              </div>
              <div className="vinyl-hole" />
            </div>
            <div className="vinyl-sleeve">
              <div className="vinyl-sleeve-face vinyl-sleeve-outside">
                <img src={active.cover} alt={active.title + ' 专辑封面'} />
              </div>
              <div className="vinyl-sleeve-face vinyl-sleeve-inside">
                <img
                  className="vinyl-sleeve-look"
                  src={active.outfit}
                  alt={active.title + ' 穿搭实拍'}
                />
              </div>
            </div>
          </div>
          <div className="waterfall-gloss" />
          <div className="waterfall-ambient" ref={ambientRef} />
          <div className="waterfall-shine" ref={shineRef} />
          <div className="waterfall-featured-shadow" />
        </button>
        {!opened ? (
          <div className="waterfall-info" ref={infoRef}>
            <div className="waterfall-album-info">
              <h3 className={'waterfall-info-title' + titleSizeClass(active.title)}>
                <span className="waterfall-info-title-line" ref={titleRef}>
                  {titleWords(active.title).map(function (word, i) {
                    return (
                      <Fragment key={active.id + '-w' + i}>
                        {i > 0 ? ' ' : null}
                        <span className="waterfall-info-title-char">{word}</span>
                      </Fragment>
                    )
                  })}
                </span>
              </h3>
              <div className="waterfall-info-meta">{active.artist} · {active.year}</div>
              <PaletteList palette={palette} />
              <MusicLinks album={active} />
            </div>
            <Link
              className="waterfall-player"
              to={'/works/' + active.id}
              aria-label={'播放 ' + active.title + ' 的穿搭方案'}
            >
              <span className="waterfall-player-play" aria-hidden="true">
                <i />
              </span>
              <span className="waterfall-player-copy">
                <strong>进入穿搭方案</strong>
              </span>
              <span className="waterfall-player-pause" aria-hidden="true">
                <i />
                <i />
              </span>
            </Link>
          </div>
        ) : null}
      </div>

      <WaterfallRow
        items={albumItems}
        direction="ltr"
        side="bottom"
        hoverKey={hoverKey}
        setHoverKey={setHoverKey}
        onPick={handlePick}
        baseSpeed={baseSpeed}
        velocityRef={bottomVelRef}
        focusId={focusId}
      />

    </div>
  )
}
