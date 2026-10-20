import { useLayoutEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { gsap } from 'gsap'

export default function PageTransition(props) {
  const rootRef = useRef()
  const sweepRef = useRef()
  const location = useLocation()

  useLayoutEffect(function () {
    const root = rootRef.current
    const sweep = sweepRef.current
    if (!root || !sweep) return
    const isHome = location.pathname === '/'

    const ctx = gsap.context(function () {
      gsap.fromTo(
        root,
        {
          autoAlpha: 0,
          x: isHome ? 0 : 54,
          y: isHome ? 0 : 12,
          scale: isHome ? 0.985 : 1
        },
        {
          autoAlpha: 1,
          x: 0,
          y: 0,
          scale: 1,
          duration: 0.72,
          ease: 'power3.out',
          clearProps: 'transform,opacity,visibility,scale'
        }
      )
      gsap.fromTo(
        sweep,
        { xPercent: -120 },
        { xPercent: 120, duration: 0.82, ease: 'power3.inOut' }
      )
    }, root)

    return function () { ctx.revert() }
  }, [location.pathname])

  return (
    <div className="route-transition" ref={rootRef}>
      <div className="route-sweep" ref={sweepRef} aria-hidden="true" />
      {props.children}
    </div>
  )
}
