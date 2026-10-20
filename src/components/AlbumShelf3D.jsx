import { useRef, useEffect, useState, useMemo, Suspense } from 'react'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { TextureLoader, CanvasTexture, SRGBColorSpace } from 'three'
import { useNavigate } from 'react-router-dom'
import { gsap } from 'gsap'

// 书脊贴图：把专辑名旋转 -90 度写在细长 canvas 上
function makeSpineTexture(title, bgHex, fgHex) {
  const fg = fgHex || '#FFFFFF'
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = bgHex
  ctx.fillRect(0, 0, 64, 512)
  ctx.fillStyle = 'rgba(0,0,0,0.18)'
  ctx.fillRect(0, 0, 64, 8)
  ctx.fillRect(0, 504, 64, 8)
  ctx.fillStyle = fg
  ctx.font = '500 30px "Inter", "PingFang SC", sans-serif'
  ctx.save()
  ctx.translate(32, 256)
  ctx.rotate(-Math.PI / 2)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const max = 14
  const t = title.length > max ? title.slice(0, max) + '…' : title
  ctx.fillText(t, 0, 6)
  ctx.restore()
  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  tex.anisotropy = 8
  return tex
}

// 单张专辑：封面盒子 + 右侧书脊 + 顶/底横条
function AlbumCard(props) {
  const { album, angle, isActive, onClick, onHover } = props
  const coverTex = useLoader(TextureLoader, album.cover)
  const spineTex = useMemo(
    function () { return makeSpineTexture(album.title, album.palette[0].hex) },
    [album]
  )
  const groupRef = useRef()

  // 弧形上的位置：接近参考图「书架式透视」，不是大圆弧
  const radius = 5.2
  const x = Math.sin(angle) * radius
  const z = -Math.cos(angle) * radius * 0.7 - 2.0
  const distFromCenter = Math.abs(angle)
  const scale = 1.10 - distFromCenter * 0.32
  const yRot = -angle

  useFrame(function (state) {
    if (!groupRef.current) return
    const t = state.clock.getElapsedTime()
    groupRef.current.position.y = Math.sin(t * 0.6 + angle * 4) * 0.04
    const targetScale = scale * (isActive ? 1.10 : 1)
    groupRef.current.scale.x = gsap.utils.interpolate(groupRef.current.scale.x, targetScale, 0.1)
    groupRef.current.scale.y = gsap.utils.interpolate(groupRef.current.scale.y, targetScale, 0.1)
    groupRef.current.scale.z = gsap.utils.interpolate(groupRef.current.scale.z, targetScale, 0.1)
  })

  return (
    <group
      ref={groupRef}
      position={[x, 0, z]}
      rotation={[0, yRot, 0]}
      onClick={function (e) { e.stopPropagation(); onClick(album) }}
      onPointerOver={function (e) {
        e.stopPropagation()
        document.body.style.cursor = 'pointer'
        if (onHover) onHover(album.id)
      }}
      onPointerOut={function () { document.body.style.cursor = 'default' }}
    >
      <mesh castShadow receiveShadow>
        <boxGeometry args={[2.0, 2.0, 0.18]} />
        <meshStandardMaterial map={coverTex} roughness={0.55} metalness={0.0} />
      </mesh>
      <mesh position={[1.0, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[0.18, 2.0]} />
        <meshStandardMaterial map={spineTex} roughness={0.7} metalness={0.0} />
      </mesh>
      <mesh position={[0, 1.0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.0, 0.18]} />
        <meshStandardMaterial color={album.palette[0].hex} roughness={0.6} />
      </mesh>
      <mesh position={[0, -1.0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.0, 0.18]} />
        <meshStandardMaterial color={album.palette[0].hex} roughness={0.6} />
      </mesh>
    </group>
  )
}

// 整面书架：鼠标驱动整体倾斜，弧度排布所有卡片
function Shelf(props) {
  const { albums, activeId, onCardClick, onHover, mouseTilt } = props
  const groupRef = useRef()
  const step = Math.PI / 8.5

  useFrame(function () {
    if (!groupRef.current) return
    const targetY = mouseTilt.x * 0.32
    const targetX = -mouseTilt.y * 0.10
    groupRef.current.rotation.y = gsap.utils.interpolate(
      groupRef.current.rotation.y, targetY, 0.08
    )
    groupRef.current.rotation.x = gsap.utils.interpolate(
      groupRef.current.rotation.x, targetX, 0.08
    )
  })

  return (
    <group ref={groupRef}>
      {albums.map(function (album, i) {
        const center = Math.floor(albums.length / 2)
        const angle = (i - center) * step
        return (
          <AlbumCard
            key={album.id}
            album={album}
            angle={angle}
            isActive={album.id === activeId}
            onClick={onCardClick}
            onHover={onHover}
          />
        )
      })}
    </group>
  )
}

export default function AlbumShelf3D(props) {
  const { albums } = props
  const navigate = useNavigate()
  const [activeId, setActiveId] = useState(albums[Math.floor(albums.length / 2)].id)
  const mouseTilt = useRef({ x: 0, y: 0 })

  useEffect(function () {
    function onMove(e) {
      const x = (e.clientX / window.innerWidth) * 2 - 1
      const y = (e.clientY / window.innerHeight) * 2 - 1
      mouseTilt.current.x = x
      mouseTilt.current.y = y
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('touchmove', onMove, { passive: true })
    return function () {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('touchmove', onMove)
    }
  }, [])

  const active = albums.find(function (a) { return a.id === activeId }) || albums[0]
  const activeIdx = albums.findIndex(function (a) { return a.id === activeId })
  const prev = albums[(activeIdx - 1 + albums.length) % albums.length]
  const next = albums[(activeIdx + 1) % albums.length]

  function goDetail() { navigate('/works/' + active.id) }
  function goPrev() { setActiveId(prev.id) }
  function goNext() { setActiveId(next.id) }

  return (
    <div className="album-shelf">
      <div className="shelf-topbar">
        <button className="shelf-menu" aria-label="menu">
          <span /><span /><span />
        </button>
        <div className="shelf-toggle">
          <button className="shelf-toggle-btn active">Albums</button>
          <button className="shelf-toggle-btn">Playlists</button>
        </div>
        <button className="shelf-search" aria-label="search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>
      </div>

      <div className="shelf-canvas-wrap">
        <Canvas
          camera={{ position: [0, 0.4, 5.0], fov: 36 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: true }}
          onCreated={function (ctx) { ctx.gl.setClearColor('#F5F2EC', 1) }}
        >
          <ambientLight intensity={0.85} />
          <directionalLight position={[4, 5, 4]} intensity={0.7} />
          <directionalLight position={[-3, 2, 3]} intensity={0.35} />
          <Suspense fallback={null}>
            <Shelf
              albums={albums}
              activeId={activeId}
              onCardClick={function (a) { navigate('/works/' + a.id) }}
              onHover={setActiveId}
              mouseTilt={mouseTilt.current}
            />
          </Suspense>
        </Canvas>
        <div className="shelf-hint mono">MOVE CURSOR · CLICK</div>
      </div>

      <div className="shelf-bottombar">
        <div className="shelf-bottom-left">
          <div className="shelf-bottom-thumb" style={{ background: active.palette[0].hex }}>
            <img src={active.cover} alt={active.title} />
          </div>
          <div className="shelf-bottom-meta">
            <div className="shelf-bottom-title">{active.title}</div>
            <div className="shelf-bottom-artist">{active.artist}</div>
          </div>
        </div>
        <div className="shelf-bottom-mid mono">
          0{activeIdx + 1} / 0{albums.length}
        </div>
        <div className="shelf-bottom-right">
          <button className="shelf-bottom-btn" onClick={goPrev} aria-label="prev">‹</button>
          <button className="shelf-bottom-btn shelf-bottom-play" onClick={goDetail} aria-label="open">▶</button>
          <button className="shelf-bottom-btn" onClick={goNext} aria-label="next">›</button>
        </div>
      </div>
    </div>
  )
}

