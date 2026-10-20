import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import SignatureMark from './SignatureMark.jsx'

const CORNER_RAIL_WIDTH = 38
const CORNER_PANEL_WIDTH = 252

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function smoothstep(value) {
  const t = clamp(value, 0, 1)
  return t * t * (3 - 2 * t)
}

const WAVE_BARS = Array.from({ length: 34 }, function (_, index) {
  return index
})

function HandDrawnFrame() {
  return (
    <svg
      className="disc-home-hand"
      viewBox="0 0 360 360"
      fill="none"
      aria-hidden="true"
    >
      <path
        className="disc-home-hand-line disc-home-hand-line-a"
        d="M181 13C110 9 48 57 25 124C4 185 25 259 78 302C131 346 218 349 275 314C331 280 351 208 334 143C317 77 260 25 193 17C151 12 109 25 77 53"
      />
      <path
        className="disc-home-hand-line disc-home-hand-line-b"
        d="M166 21C96 27 41 82 30 151C19 219 57 291 123 319C182 344 254 321 294 269C331 220 331 148 301 99C272 52 218 26 166 21"
      />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="7.5" y="5.5" width="3.4" height="13" rx="1.2" fill="currentColor" />
      <rect x="13.1" y="5.5" width="3.4" height="13" rx="1.2" fill="currentColor" />
    </svg>
  )
}

function StepIcon(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" style={{ transform: props.flip ? 'scaleX(-1)' : 'none' }}>
      <path d="M18 6v12l-8-6z" fill="currentColor" />
      <rect x="5" y="6" width="2.4" height="12" rx="1" fill="currentColor" />
    </svg>
  )
}

export default function HomeDiscDeck(props) {
  const albums = props.albums || []
  const [focus, setFocus] = useState({ index: 0, progress: 0 })
  const [paused, setPaused] = useState(false)
  const [stageReady, setStageReady] = useState(false)
  const rootRef = useRef(null)
  const entryRef = useRef(null)
  const cornerRef = useRef(null)
  const cornerHoverRef = useRef(false)
  const discRefs = useRef(new Map())
  const pointerRef = useRef({ x: 0, y: 0, active: false })
  const progressRef = useRef(0)
  const focusRef = useRef(0)
  const cursorRef = useRef(0)
  const navigationRef = useRef(null)
  const pausedRef = useRef(false)
  const stageReadyRef = useRef(false)

  const focusedAlbum = albums[focus.index] || albums[0]
  const progressPercent = Math.round(clamp(focus.progress, 0, 1) * 100)

  useLayoutEffect(function () {
    document.body.classList.add('home-theme')
    return function () { document.body.classList.remove('home-theme') }
  }, [])

  useEffect(function () {
    pausedRef.current = paused
  }, [paused])

  useEffect(function () {
    const timer = window.setTimeout(function () {
      stageReadyRef.current = true
      setStageReady(true)
    }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 2760)
    return function () { window.clearTimeout(timer) }
  }, [])

  useEffect(function () {
    function onPointerMove(event) {
      pointerRef.current.x = event.clientX
      pointerRef.current.y = event.clientY
      pointerRef.current.active = true
    }

    function onPointerLeave(event) {
      if (event && event.relatedTarget) return
      pointerRef.current.active = false
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerout', onPointerLeave)
    window.addEventListener('blur', onPointerLeave)
    return function () {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerout', onPointerLeave)
      window.removeEventListener('blur', onPointerLeave)
    }
  }, [])

  useEffect(function () {
    if (!albums.length) return

    const total = albums.length
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    let previousTime = performance.now()
    let uiPulse = 0

    function updateDisc(index, offset, progress, clock) {
      const node = discRefs.current.get(index)
      if (!node) return

      const distance = Math.abs(offset)
      const discSize = Math.min(460, Math.max(230, window.innerWidth * 0.315))
      const slideX = Math.min(292, Math.max(150, discSize * 0.64))
      const slideY = Math.min(86, Math.max(46, discSize * 0.16))
      const x = offset * slideX
      // 越远离中心的光碟，上下浮动幅度越大，并按索引错开相位，形成挨个起伏的队列感
      const floatAmplitude = 5 + Math.min(17, distance * 6.5)
      const floatY = Math.sin(clock * 1.35 + index * 0.9) * floatAmplitude
      const floatDrift = Math.cos(clock * 0.82 + index * 1.37) * floatAmplitude * 0.42
      const y = offset * -slideY + floatY + floatDrift
      const rotateWobble = Math.sin(clock * 1.05 + index * 1.2) * (1.2 + Math.min(2.2, distance * 0.9))
      const rotate = offset * -2.6 + rotateWobble
      const scale = offset >= 0
        ? Math.max(0.54, 1 - offset * 0.12)
        : Math.max(0.58, 1 + offset * 0.11)

      // 越靠近轨道两端，唱片越轻、越模糊，像在空间中逐渐失焦
      const edgeFade = smoothstep((distance - 0.45) / 2.35)
      const opacity = clamp(1 - edgeFade * 0.88, 0.12, 1)
      const blur = clamp((distance - 0.55) * 2.7, 0, 10.5)
      const brightness = clamp(1 - edgeFade * 0.24, 0.72, 1)
      const saturation = clamp(1 - edgeFade * 0.16, 0.78, 1)
      const zIndex = Math.max(1, Math.round(80 - distance * 10))
      const yaw = offset * -1.45
      const pitch = offset * 0.82
      const cardRoll = offset * -1.1
      const depth = -Math.pow(distance, 1.34) * 34
      const shineX = clamp(52 - offset * 5.5, 12, 88)
      const shineY = clamp(46 + offset * 4.2, 14, 84)

      node.style.setProperty('--disc-size', discSize.toFixed(1) + 'px')
      node.style.setProperty('--disc-x', x.toFixed(2) + 'px')
      node.style.setProperty('--disc-y', y.toFixed(2) + 'px')
      node.style.setProperty('--disc-rotate', rotate.toFixed(2) + 'deg')
      node.style.setProperty('--disc-scale', scale.toFixed(3))
      node.style.setProperty('--disc-opacity', opacity.toFixed(3))
      node.style.setProperty('--disc-blur', blur.toFixed(2) + 'px')
      node.style.setProperty('--disc-brightness', brightness.toFixed(3))
      node.style.setProperty('--disc-saturate', saturation.toFixed(3))
      node.style.setProperty('--disc-yaw', yaw.toFixed(2) + 'deg')
      node.style.setProperty('--disc-pitch', pitch.toFixed(2) + 'deg')
      node.style.setProperty('--disc-card-roll', cardRoll.toFixed(2) + 'deg')
      node.style.setProperty('--disc-depth', depth.toFixed(1) + 'px')
      node.style.setProperty('--disc-shine-x', shineX.toFixed(1) + '%')
      node.style.setProperty('--disc-shine-y', shineY.toFixed(1) + '%')
      node.style.zIndex = String(zIndex)
      node.style.pointerEvents = opacity > 0.08 ? 'auto' : 'none'
    }

    function tick(now) {
      const elapsed = Math.min(0.05, (now - previousTime) / 1000)
      previousTime = now

      const pointer = pointerRef.current
      const viewportWidth = Math.max(1, window.innerWidth)
      const viewportHeight = Math.max(1, window.innerHeight)
      let pointerX = 0.5
      let pointerY = 0.5

      if (pointer.active) {
        pointerX = clamp(pointer.x / viewportWidth, 0, 1)
        pointerY = clamp(pointer.y / viewportHeight, 0, 1)

        const cornerDistance = Math.sqrt(
          Math.pow(Math.max(0, pointer.x - 24), 2) +
          Math.pow(Math.max(0, pointer.y - 70), 2)
        )
        const cornerOpen = smoothstep((400 - cornerDistance) / 300)
        if (cornerRef.current) {
          const resolvedOpen = cornerHoverRef.current ? 1 : cornerOpen
          cornerRef.current.style.width =
            (CORNER_RAIL_WIDTH + resolvedOpen * CORNER_PANEL_WIDTH).toFixed(1) + 'px'
          cornerRef.current.style.setProperty('--corner-open', resolvedOpen.toFixed(3))
          cornerRef.current.style.setProperty(
            '--corner-shift',
            ((1 - resolvedOpen) * -12).toFixed(2) + 'px'
          )
        }
      } else if (cornerRef.current) {
        const resolvedOpen = cornerHoverRef.current ? 1 : 0
        cornerRef.current.style.width =
          (CORNER_RAIL_WIDTH + resolvedOpen * CORNER_PANEL_WIDTH).toFixed(1) + 'px'
        cornerRef.current.style.setProperty('--corner-open', resolvedOpen)
        cornerRef.current.style.setProperty(
          '--corner-shift',
          ((1 - resolvedOpen) * -12).toFixed(2) + 'px'
        )
      }

      const stage = rootRef.current
      if (stage) {
        const tiltX = pointer.active ? (pointerX * 2 - 1) * 7 : 0
        const tiltY = pointer.active ? (pointerY * 2 - 1) * -5 : 0
        stage.style.setProperty('--tilt-x', tiltX.toFixed(2) + 'deg')
        stage.style.setProperty('--tilt-y', tiltY.toFixed(2) + 'deg')
      }

      // 光碟自行运转；鼠标越靠近转速越慢，贴近时几乎停住
      let slowdown = 1
      if (pointer.active) {
        let nearestDistance = Number.POSITIVE_INFINITY
        discRefs.current.forEach(function (node) {
          const rect = node.getBoundingClientRect()
          const centerX = rect.left + rect.width / 2
          const centerY = rect.top + rect.height / 2
          nearestDistance = Math.min(
            nearestDistance,
            Math.hypot(pointer.x - centerX, pointer.y - centerY)
          )
        })
        if (!Number.isFinite(nearestDistance)) {
          nearestDistance = Math.hypot(
            pointer.x - viewportWidth * 0.5,
            pointer.y - viewportHeight * 0.51
          )
        }
        slowdown = 0.04 + 0.96 * smoothstep((nearestDistance - 42) / 500)
      }
      const speed = reducedMotion || !stageReadyRef.current ? 0 : 0.4 * slowdown

      const navigation = navigationRef.current
      if (navigation) {
        const navigationProgress = clamp((now - navigation.startedAt) / navigation.duration, 0, 1)
        const navigationEase = 1 - Math.pow(1 - navigationProgress, 4)
        cursorRef.current =
          navigation.from + (navigation.target - navigation.from) * navigationEase

        if (navigationProgress >= 1) {
          cursorRef.current = navigation.target
          navigationRef.current = null
        }
      } else if (!pausedRef.current && speed > 0) {
        cursorRef.current += elapsed * speed
      }

      const clock = now / 1000

      // 使用连续游标而不是在 0/1 之间跳转，换轨和循环回位都不会再顿一下
      const cursor = ((cursorRef.current % total) + total) % total
      const focusIndex = Math.floor(cursor) % total
      const nextProgress = cursor - Math.floor(cursor)
      focusRef.current = focusIndex
      progressRef.current = nextProgress

      discRefs.current.forEach(function (node, index) {
        let offset = index - cursor
        if (offset > total / 2) offset -= total
        if (offset < -total / 2) offset += total
        updateDisc(index, offset, nextProgress, clock)
      })

      if (entryRef.current) {
        entryRef.current.style.setProperty(
          '--play-progress',
          (progressRef.current * 100).toFixed(2) + '%'
        )
      }

      uiPulse += elapsed
      if (uiPulse > 0.08) {
        uiPulse = 0
        const nextIndex = focusIndex
        setFocus(function (previous) {
          return previous.index === nextIndex && Math.abs(previous.progress - nextProgress) < 0.004
            ? previous
            : { index: nextIndex, progress: nextProgress }
        })
      }

      raf = requestAnimationFrame(tick)
    }

    const initialClock = performance.now() / 1000
    discRefs.current.forEach(function (node, index) { updateDisc(index, index, 0, initialClock) })

    raf = requestAnimationFrame(tick)
    return function () { cancelAnimationFrame(raf) }
  }, [albums])

  function switchDisc(direction) {
    const total = albums.length
    if (total < 2) return

    const activeNavigation = navigationRef.current
    const anchor = activeNavigation ? activeNavigation.target : Math.floor(cursorRef.current)
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    navigationRef.current = {
      from: cursorRef.current,
      target: anchor + direction,
      startedAt: performance.now(),
      duration: reducedMotion ? 1 : 320
    }
  }

  if (!albums.length) return null

  return (
    <section
      className={'disc-home ' + (stageReady ? 'is-ready' : 'is-intro')}
      ref={rootRef}
      aria-label="SMiloBo album and outfit portfolio"
    >
      <div className="disc-home-atmosphere" aria-hidden="true" />
      <div className="disc-home-signature" aria-hidden="true">
        <SignatureMark className="disc-home-signature-mark" decorative />
      </div>

      <aside
        className="disc-corner-nav"
        ref={cornerRef}
        aria-label="Portfolio index"
        onPointerEnter={function () { cornerHoverRef.current = true }}
        onPointerLeave={function () { cornerHoverRef.current = false }}
      >
        <div className="disc-corner-rail">
          <span className="disc-corner-rail-zh">导视</span>
          <i />
        </div>
        <div className="disc-corner-panel">
          <div className="disc-corner-brand">
            <SignatureMark className="disc-corner-signature" />
          </div>
          <nav className="disc-corner-links">
            <Link to="/waterfall">
              <span className="mono">01</span>
              <span className="disc-corner-link-text">
                <strong>专辑与穿搭瀑布流</strong>
                <em>Vinyl Archive</em>
              </span>
            </Link>
            <Link to={'/works/' + focusedAlbum.id}>
              <span className="mono">02</span>
              <span className="disc-corner-link-text">
                <strong>穿搭展示</strong>
                <em>Outfit Display</em>
              </span>
            </Link>
            <Link to="/tool">
              <span className="mono">03</span>
              <span className="disc-corner-link-text">
                <strong>AI 色彩实验室</strong>
                <em>AI Color Lab</em>
              </span>
            </Link>
            <Link to="/about">
              <span className="mono">04</span>
              <span className="disc-corner-link-text">
                <strong>关于我 · 联系我</strong>
                <em>About</em>
              </span>
            </Link>
          </nav>
        </div>
      </aside>

      <div className="disc-home-stage">
        <div className="disc-home-arc-guide" aria-hidden="true" />
        <div className="disc-home-discs">
          {albums.map(function (album, index) {
            return (
              <Link
                className={
                  'disc-home-disc-wrap' +
                  (index === 0 ? ' is-origin-disc' : '')
                }
                key={album.id}
                ref={function (node) {
                  if (node) discRefs.current.set(index, node)
                  else discRefs.current.delete(index)
                }}
                style={{ '--disc-order': index }}
                to={'/waterfall?album=' + album.id}
                aria-label={'打开专辑 ' + album.title + ' 的穿搭瀑布流；悬停或聚焦唱片可预览穿搭照片'}
              >
                <div className="disc-home-disc-entry">
                  <div className="disc-home-disc-float">
                    <div className="disc-home-disc-tilt">
                      <div className="disc-home-disc-flipper">
                        <div className="disc-home-disc disc-home-disc-front">
                          <img src={album.cover} alt={album.title + ' 专辑封面'} />
                          <span className="disc-home-disc-wash" aria-hidden="true" />
                          <span className="disc-home-disc-grooves" aria-hidden="true" />
                          <span className="disc-home-disc-rim" aria-hidden="true" />
                          <span className="disc-home-disc-hole" aria-hidden="true" />
                        </div>
                        <div className="disc-home-disc disc-home-disc-back" aria-hidden="true">
                          <img
                            src={album.outfit || album.cover}
                            alt=""
                            loading="lazy"
                            style={{ objectPosition: album.discOutfitPosition || 'center 36%' }}
                          />
                          <span className="disc-home-disc-back-vignette" />
                          <span className="disc-home-disc-back-grooves" />
                          <span className="disc-home-disc-back-rim" />
                        </div>
                      </div>
                    </div>
                    <HandDrawnFrame />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      <nav className="disc-home-player" ref={entryRef} aria-label="Player controls">
        <div className="disc-home-player-track" aria-hidden="true">
          <span className="disc-home-player-bar">
            <i />
          </span>
          <span className="disc-home-player-wave">
            {WAVE_BARS.map(function (bar) {
              return (
                <b
                  key={bar}
                  style={{
                    '--wave-delay': (-bar * 0.072).toFixed(3) + 's',
                    '--wave-height': (8 + ((bar * 7) % 11) * 0.95).toFixed(2) + 'px'
                  }}
                />
              )
            })}
          </span>
        </div>
        <div className="disc-home-player-controls">
          <button
            type="button"
            className="disc-home-player-step"
            onClick={function () { switchDisc(-1) }}
            aria-label="切换至上一张光碟"
          >
            <StepIcon />
          </button>
          <button
            type="button"
            className={'disc-home-player-toggle' + (paused ? ' is-paused' : '')}
            onClick={function () { setPaused(function (value) { return !value }) }}
            aria-label={paused ? '继续转动光碟' : '暂停光碟转动'}
          >
            {paused ? <PlayIcon /> : <PauseIcon />}
          </button>
          <button
            type="button"
            className="disc-home-player-step is-right"
            onClick={function () { switchDisc(1) }}
            aria-label="切换至下一张光碟"
          >
            <StepIcon flip />
          </button>
        </div>
        <div className="disc-home-player-time mono">
          <span>{String(focus.index + 1).padStart(2, '0')}</span>
          <span>{String(progressPercent).padStart(2, '0')}%</span>
          <span>{String(albums.length).padStart(2, '0')}</span>
        </div>
      </nav>

    </section>
  )
}
