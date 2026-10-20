import { useRef, useEffect, useState, Suspense } from 'react'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { TextureLoader } from 'three'
import { useNavigate } from 'react-router-dom'
import { gsap } from 'gsap'

// 卡片：带厚度的 box，正面贴封面
function AlbumCard({ album, index, total, rotationOffset, onClick }) {
  const meshRef = useRef()
  const tex = useLoader(TextureLoader, album.cover)

  // 弧形参数：中心在 (0, 0, -4)，弧宽 5，弧深 3
  // 索引从中心向两侧扩散
  const step = (Math.PI / 14) // 相邻卡片角度间距，~12.8°
  const angle = (index - Math.floor(total / 2)) * step + rotationOffset
  const radiusX = 5
  const radiusZ = 3
  const x = Math.sin(angle) * radiusX
  const z = -4 - (1 - Math.cos(angle)) * radiusZ
  // 中心卡片最大，越往两边越小
  const distFromCenter = Math.abs(index - Math.floor(total / 2))
  const scale = 1.1 - distFromCenter * 0.13

  useFrame((state) => {
    if (!meshRef.current) return
    const t = state.clock.getElapsedTime()
    // 微微悬浮
    meshRef.current.position.y = Math.sin(t * 0.8 + index * 0.5) * 0.06
  })

  return (
    <group
      ref={meshRef}
      position={[x, 0, z]}
      rotation={[0, -angle, 0]}
      scale={[scale, scale, scale]}
      onClick={(e) => { e.stopPropagation(); onClick(album) }}
      onPointerOver={() => { document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { document.body.style.cursor = 'default' }}
    >
      <mesh castShadow>
        <boxGeometry args={[2.2, 2.2, 0.12]} />
        <meshStandardMaterial map={tex} roughness={0.55} metalness={0.0} />
      </mesh>
    </group>
  )
}

function Arc({ albums, rotation, onCardClick }) {
  const groupRef = useRef()

  useFrame(() => {
    if (!groupRef.current) return
    groupRef.current.rotation.y = gsap.utils.interpolate(
      groupRef.current.rotation.y,
      rotation,
      0.12
    )
  })

  return (
    <group ref={groupRef}>
      {albums.map((album, i) => (
        <AlbumCard
          key={album.id}
          album={album}
          index={i}
          total={albums.length}
          rotationOffset={0}
          onClick={onCardClick}
        />
      ))}
    </group>
  )
}

export default function AlbumArc3D({ albums }) {
  const navigate = useNavigate()
  const [rotation, setRotation] = useState(0)
  const dragRef = useRef({ dragging: false, startX: 0, startRot: 0 })
  const wheelRef = useRef({ accum: 0, last: 0 })

  const handleCardClick = (album) => {
    navigate('/works/' + album.id)
  }

  useEffect(() => {
    const onDown = (e) => {
      dragRef.current.dragging = true
      const x = e.touches?.[0]?.clientX ?? e.clientX
      dragRef.current.startX = x
      dragRef.current.startRot = rotation
    }
    const onMove = (e) => {
      if (!dragRef.current.dragging) return
      const x = e.touches?.[0]?.clientX ?? e.clientX
      const dx = x - dragRef.current.startX
      setRotation(dragRef.current.startRot + dx * 0.006)
    }
    const onUp = () => { dragRef.current.dragging = false }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchstart', onDown, { passive: true })
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('touchend', onUp)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchstart', onDown)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)
    }
  }, [rotation])

  useEffect(() => {
    const onWheel = (e) => {
      wheelRef.current.accum += e.deltaY
      const now = Date.now()
      if (now - wheelRef.current.last > 50 && Math.abs(wheelRef.current.accum) > 4) {
        const step = wheelRef.current.accum > 0 ? 0.35 : -0.35
        setRotation((r) => r + step)
        wheelRef.current.accum = 0
        wheelRef.current.last = now
      }
    }
    window.addEventListener('wheel', onWheel, { passive: true })
    return () => window.removeEventListener('wheel', onWheel)
  }, [])

  return (
    <div className="album-arc">
      <Canvas
        camera={{ position: [0, 0.4, 2.2], fov: 42 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />
        <directionalLight position={[-5, 3, 3]} intensity={0.3} />
        <Suspense fallback={null}>
          <Arc albums={albums} rotation={rotation} onCardClick={handleCardClick} />
        </Suspense>
      </Canvas>
      <div className="album-arc-hint">
        <span className="mono">DRAG</span>
        <span className="dot">·</span>
        <span className="mono">SCROLL</span>
        <span className="dot">·</span>
        <span className="mono">CLICK</span>
      </div>
    </div>
  )
}
