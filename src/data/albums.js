import rawData from './albums.json'
import { assetUrl } from '../utils/assetUrl.js'

function resolveAssetPaths(value) {
  if (typeof value === 'string') return assetUrl(value)
  if (Array.isArray(value)) return value.map(resolveAssetPaths)
  if (!value || typeof value !== 'object') return value

  return Object.fromEntries(
    Object.entries(value).map(function ([key, item]) {
      return [key, resolveAssetPaths(item)]
    })
  )
}

const data = resolveAssetPaths(rawData)

export default data
