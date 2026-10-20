import data from '../../data/albums.js'
import AlbumArcWaterfall from '../AlbumArcWaterfall.jsx'
import { useSearchParams } from 'react-router-dom'

export default function Waterfall() {
  const [searchParams] = useSearchParams()
  const initialAlbumId = searchParams.get('album') || ''

  return (
    <AlbumArcWaterfall
      albums={data.albums}
      initialAlbumId={initialAlbumId}
    />
  )
}
