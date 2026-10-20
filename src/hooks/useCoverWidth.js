import { useEffect, useState } from 'react'

function preferredCoverWidth() {
  if (typeof window === 'undefined') return 960
  return window.matchMedia('(max-width: 900px)').matches ? 480 : 960
}

export default function useCoverWidth() {
  const [width, setWidth] = useState(preferredCoverWidth)

  useEffect(function () {
    const query = window.matchMedia('(max-width: 900px)')
    function syncWidth() {
      setWidth(query.matches ? 480 : 960)
    }
    syncWidth()
    query.addEventListener('change', syncWidth)
    return function () { query.removeEventListener('change', syncWidth) }
  }, [])

  return width
}
