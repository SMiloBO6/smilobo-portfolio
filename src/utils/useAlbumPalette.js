import { useEffect, useMemo, useState } from 'react'
import { extractPalette, mixHex } from './color.js'

function normalizePalette(colors) {
  const source = (colors || []).map(function (color) {
    return { hex: color.hex, ratio: color.ratio || 5 }
  })

  let guard = 0
  while (source.length < 5 && source.length > 0 && guard < 5) {
    const first = source[0]
    const last = source[source.length - 1]
    source.push({
      hex: mixHex(first.hex, last.hex, 0.32 + guard * 0.16),
      ratio: 6
    })
    guard += 1
  }

  if (source.length === 0) {
    return ['#C9A24B', '#4A5C3A', '#F2EBDC', '#1A1A1A', '#9B7BD8'].map(function (hex) {
      return { hex, ratio: 20 }
    })
  }

  const sliced = source.slice(0, 5)
  const total = sliced.reduce(function (sum, color) { return sum + color.ratio }, 0) || 1
  const normalized = sliced.map(function (color) {
    return {
      hex: color.hex,
      ratio: Math.max(3, Math.round(color.ratio / total * 100))
    }
  })
  const normalizedTotal = normalized.reduce(function (sum, color) { return sum + color.ratio }, 0)
  normalized[normalized.length - 1].ratio = Math.max(
    3,
    normalized[normalized.length - 1].ratio + (100 - normalizedTotal)
  )
  return normalized
}

export function useAlbumPalette(album) {
  const fallback = useMemo(function () {
    return normalizePalette(album ? album.palette : [])
  }, [album])
  const [palette, setPalette] = useState(fallback)

  useEffect(function () {
    setPalette(fallback)
    if (!album || !album.cover) return undefined

    let cancelled = false
    const image = new Image()
    image.decoding = 'async'
    image.onload = function () {
      if (cancelled) return
      const extracted = extractPalette(image, 5)
      if (extracted && extracted.length >= 3) setPalette(normalizePalette(extracted))
    }
    image.src = album.cover

    return function () { cancelled = true }
  }, [album, fallback])

  return palette
}
