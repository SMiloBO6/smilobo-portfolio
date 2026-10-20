export function assetUrl(path) {
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) {
    return path
  }

  const base = import.meta.env.BASE_URL || '/'
  return base.replace(/\/+$/, '') + '/' + path.replace(/^\/+/, '')
}
