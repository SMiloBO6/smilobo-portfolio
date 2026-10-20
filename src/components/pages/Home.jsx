import data from '../../data/albums.json'
import HomeDiscDeck from '../HomeDiscDeck.jsx'

export default function Home() {
  return <HomeDiscDeck albums={data.albums} />
}
