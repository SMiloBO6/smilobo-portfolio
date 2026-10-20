const OPTIMIZED_IMAGE_PATH = /^(?:\/(?:covers|works|tool|brand)\/.+|\/carrot-mascot)\.(?:jpe?g|png)(?=$|\?)/i
const OPTIMIZED_COVER_PATH = /\/covers\/.+\.webp(?=$|\?)/i

function optimizedImagePath(path, enabled) {
  if (!enabled || !OPTIMIZED_IMAGE_PATH.test(path)) return path
  return path.replace(/\.(?:jpe?g|png)(?=$|\?)/i, '.webp')
}

export function assetUrl(path, options) {
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) {
    return path
  }

  const shouldOptimize = !options || options.optimized !== false
  const resolvedPath = optimizedImagePath(path, shouldOptimize)
  const base = import.meta.env.BASE_URL || '/'
  return base.replace(/\/+$/, '') + '/' + resolvedPath.replace(/^\/+/, '')
}

export function coverImageVariant(path, width) {
  if (typeof path !== 'string' || !OPTIMIZED_COVER_PATH.test(path)) return undefined
  if (width === 960) return path
  return path.replace(/\.webp(?=$|\?)/i, '-' + width + '.webp')
}
