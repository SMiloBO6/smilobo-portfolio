import { useState } from 'react'
import { Link } from 'react-router-dom'
import data from '../../data/albums.json'

const LIBRARY_MODES = [
  { id: 'outfit', label: '穿搭' },
  { id: 'album', label: '专辑' }
]

function splitIntoShelves(items) {
  const shelves = []

  for (let index = 0; index < items.length; index += 4) {
    shelves.push(items.slice(index, index + 4))
  }

  return shelves
}

export default function Works() {
  const [mode, setMode] = useState('outfit')
  const shelves = splitIntoShelves(data.albums)

  return (
    <main className="works-shelf-page">
      <header className="works-shelf-head">
        <h1 className="works-shelf-title">作品集</h1>

        <div className="works-shelf-switch" role="tablist" aria-label="选择作品类型">
          {LIBRARY_MODES.map(function (item) {
            const active = mode === item.id

            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                className={active ? 'is-active' : ''}
                onClick={function () { setMode(item.id) }}
              >
                {item.label}
              </button>
            )
          })}
        </div>
      </header>

      <div className={'works-shelf-gallery is-' + mode}>
        {shelves.map(function (shelf, shelfIndex) {
          return (
            <section className="works-shelf-set" key={(shelfIndex + 1) + '-' + mode}>
              <div className="works-shelf-grid">
                {shelf.map(function (album, index) {
                  const image = mode === 'outfit' ? album.outfit : album.cover

                  return (
                    <Link
                      to={'/works/' + album.id}
                      className="works-shelf-piece"
                      key={album.id}
                      style={{ '--piece-delay': ((shelfIndex * 4 + index) * 55) + 'ms' }}
                      aria-label={'查看 ' + album.title + (mode === 'outfit' ? ' 穿搭作品' : ' 专辑作品')}
                    >
                      <span className="works-shelf-object">
                        <span className="works-shelf-disc" aria-hidden="true" />
                        <span className="works-shelf-cover">
                          <img
                            src={image}
                            alt={album.title + (mode === 'outfit' ? ' 穿搭' : ' 专辑封面')}
                            loading="lazy"
                            decoding="async"
                          />
                        </span>
                      </span>

                      <span className="works-shelf-meta">
                        <strong>{album.title}</strong>
                        <small>{album.artist}</small>
                      </span>
                    </Link>
                  )
                })}
              </div>
              <span className="works-shelf-board" aria-hidden="true" />
            </section>
          )
        })}
      </div>
    </main>
  )
}
