import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import data from '../../data/albums.js'
import PaletteRail from '../PaletteRail.jsx'
import { useAlbumPalette } from '../../utils/useAlbumPalette.js'

function pad(value) {
  return String(value).padStart(2, '0')
}

function getBrief(text) {
  const value = String(text || '').trim()
  if (!value) return ''
  const match = value.match(/^[^。！？!?]+[。！？!?]?/)
  return match ? match[0] : value
}

function getPieceReason(piece, album, index) {
  if (piece.reason) return piece.reason

  const reasons = {
    外套: '负责建立外轮廓和第一视觉重心，大面积色块先把专辑的情绪压住。',
    上衣: '靠近面部，决定整体气色，也负责把封面主色转成更适合日常穿着的明度。',
    内搭: '用来留出呼吸感，隔开外套与肤色，让层次不会挤在一起。',
    裤装: '控制下半身重量，和上装形成纵向比例，也让行走时的轮廓更完整。',
    裙装: '负责增加移动时的体积变化，让静态封面里的情绪变成更柔和的动态线条。',
    鞋履: '把整套造型落回地面，颜色和材质决定最终是利落、复古还是松弛。',
    配饰: '作为小面积重点，重复专辑主色或对比色，让视线在造型里有停顿点。'
  }

  return (reasons[piece.type] || reasons['配饰']) +
    ' 这件' + (piece.name || '单品') + '取自《' + album.title + '》的' +
    (album.genre || '音乐情绪') + '，色值 ' + piece.color + '，在当前顺序中排第' +
    String(index + 1).padStart(2, '0') + '。'
}

const storySections = [
  {
    key: 'inspiration',
    title: '灵感来源',
    kicker: 'INSPIRATION',
    note: '把最初听到这张专辑时想到的场景、材质和时间写在这里。'
  },
  {
    key: 'wardrobe',
    title: '单品拆解',
    kicker: 'WARDROBE',
    note: '把上衣、下装、鞋履与配饰的版型、材质和购买信息补充在这里。'
  },
  {
    key: 'color',
    title: '色彩推导',
    kicker: 'COLOR STUDY',
    note: '记录主色取舍、面积比例以及最终为什么选择这套组合。'
  },
  {
    key: 'onbody',
    title: '实拍记录',
    kicker: 'ON BODY',
    note: '整理试穿记录、不同光线下的效果，以及下一次想调整的细节。'
  }
]

function StoryGallery({ photos = [] }) {
  if (!photos.length) return null

  return (
    <div className={'outfit-story-gallery' + (photos.length > 1 ? ' is-multiple' : '')}>
      {photos.map(function (photo, photoIndex) {
        return (
          <figure
            className={'outfit-story-photo is-' + (photo.shape || 'landscape')}
            key={photo.src}
          >
            <img src={photo.src} alt={photo.alt} loading="lazy" decoding="async" />
            <figcaption>
              <span>{photo.caption}</span>
              <small className="mono">{pad(photoIndex + 1)}</small>
            </figcaption>
          </figure>
        )
      })}
    </div>
  )
}

export default function WorkDetail() {
  const { id } = useParams()
  const album = data.albums.find(function (item) { return item.id === id }) || data.albums[0]
  const index = data.albums.findIndex(function (item) { return item.id === album.id })
  const palette = useAlbumPalette(album)
  const story = album.story
  const detailRefs = useRef([])
  const summaryRef = useRef(null)
  const storyRef = useRef(null)
  const [activePiece, setActivePiece] = useState(null)
  const [queueOpen, setQueueOpen] = useState(false)
  const itemPositions = [
    { left: '6%', top: '16%' },
    { right: '5%', top: '29%' },
    { left: '5%', top: '55%' },
    { right: '6%', top: '66%' },
    { left: '14%', top: '82%' }
  ]

  const theme = {
    '--look-a': palette[0] ? palette[0].hex : '#C9A24B',
    '--look-b': palette[1] ? palette[1].hex : '#4A5C3A',
    '--look-c': palette[2] ? palette[2].hex : '#F2EBDC',
    '--look-d': palette[4] ? palette[4].hex : '#9B7BD8'
  }

  function scrollToStory() {
    if (!storyRef.current) return
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    storyRef.current.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'start'
    })
  }

  useEffect(function () {
    const nodes = detailRefs.current.filter(Boolean)
    if (summaryRef.current) nodes.push(summaryRef.current)
    if (!nodes.length) return

    function reveal(node) {
      node.classList.add('is-visible')
    }

    if (!('IntersectionObserver' in window)) {
      nodes.forEach(reveal)
      return
    }

    // 快速滚动/跳转时 observer 可能漏掉整段内容，用滚动巡检兜底。
    let frame = 0
    function pass() {
      frame = 0
      const limit = window.innerHeight * 0.92
      nodes.forEach(function (node) {
        if (node.classList.contains('is-visible')) return
        if (node.getBoundingClientRect().top < limit) reveal(node)
      })
    }
    function onScroll() {
      if (frame) return
      frame = window.requestAnimationFrame(pass)
    }

    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          reveal(entry.target)
        }
      })
    }, {
      threshold: 0.16,
      rootMargin: '0px 0px -8% 0px'
    })

    nodes.forEach(function (node) { observer.observe(node) })
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    pass()

    return function () {
      observer.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [album.id])

  useEffect(function () {
    setActivePiece(null)
    setQueueOpen(false)
  }, [album.id])

  return (
    <article className="outfit-display" style={theme}>
      <header className="outfit-display-header">
        <div>
          <div className="mono outfit-display-kicker">
            COLLECTION {pad(index + 1)} / {pad(data.albums.length)}
          </div>
          <h1 className="outfit-display-title">穿搭展示</h1>
        </div>
        <div className="outfit-display-headmeta mono">
          <span>REAL WEAR</span>
          <span>{album.year}</span>
        </div>
      </header>

      <div className="outfit-display-layout">
        <aside className="outfit-album-panel">
          <Link
            className="outfit-album-sleeve"
            to="/waterfall"
            aria-label={'返回专辑瀑布流，浏览 ' + album.title}
          >
            <span className="outfit-album-vinyl" aria-hidden="true" />
            <span className="outfit-album-cover">
              <img src={album.cover} alt={album.title + ' 专辑封面'} />
            </span>
            <span className="outfit-album-return mono">← BACK TO VINYL</span>
          </Link>

          <div className="outfit-album-copy">
            <div className="mono outfit-album-kicker">ALBUM SLEEVE</div>
            <h2>{album.title}</h2>
            <p className="outfit-album-artist">{album.artist} · {album.year}</p>

            <div className="outfit-album-concept-spacer" aria-hidden="true" />

            <button
              type="button"
              className="outfit-album-journey"
              onClick={scrollToStory}
              aria-label="向下浏览当前穿搭的过程介绍"
            >
              <span className="outfit-album-journey-icon" aria-hidden="true">↓</span>
              <span className="outfit-album-journey-copy">
                <small>向下浏览</small>
                <strong>查看穿搭过程</strong>
              </span>
              <span className="outfit-album-journey-action" aria-hidden="true">↓</span>
            </button>
          </div>
        </aside>

        <section className="outfit-stage">
          <div className="outfit-stage-visual">
            <div className="outfit-stage-photo">
              <img src={album.outfit} alt={album.title + ' 穿搭实拍'} />
              <div className="outfit-stage-index mono">{pad(index + 1)}</div>
            </div>
          </div>

          <div className="outfit-stage-foot mono">
            <span>1 LOOK</span>
            <span>MUSIC × COLOR × BODY</span>
          </div>
        </section>

        <aside className="outfit-display-aside">
          <PaletteRail
            palette={palette}
            title={album.title + ' 色板'}
            compact
          />

          <section className="outfit-guide-panel" id="outfit-look-guide" aria-labelledby="outfit-guide-title">
            <header className="outfit-guide-head">
              <div>
                <span>共 {pad((album.wardrobe || []).length)} 件单品</span>
                <strong id="outfit-guide-title">穿搭介绍</strong>
              </div>
            </header>

            <div className="outfit-guide-piece-list">
              {(album.wardrobe || []).map(function (piece, pieceIndex) {
                const isOpen = activePiece === pieceIndex
                const reasonId = 'outfit-piece-' + album.id + '-' + pieceIndex
                return (
                  <button
                    type="button"
                    className={
                      'outfit-item-tag outfit-guide-piece' +
                      (isOpen ? ' is-open' : '')
                    }
                    key={piece.name}
                    onClick={function () {
                      setActivePiece(isOpen ? null : pieceIndex)
                    }}
                    aria-expanded={isOpen}
                    aria-controls={reasonId}
                  >
                    <span className="outfit-item-tag-main">
                      <i style={{ background: piece.color }} aria-hidden="true" />
                      <span className="outfit-item-tag-copy">
                        <small className="mono">
                          {pad(pieceIndex + 1)} / {piece.type}
                        </small>
                        <strong>{piece.name}</strong>
                      </span>
                      <span className="outfit-item-tag-toggle" aria-hidden="true">
                        {isOpen ? '−' : '+'}
                      </span>
                    </span>
                    {isOpen ? (
                      <span className="outfit-item-tag-reason" id={reasonId}>
                        <span>搭配理由</span>
                        {getPieceReason(piece, album, pieceIndex)}
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </div>
          </section>
        </aside>
      </div>

      <section
        className="outfit-display-summary is-longform outfit-reveal"
        ref={summaryRef}
        style={{ '--reveal-delay': '80ms' }}
      >
        <div className="outfit-summary-copy">
          <div className="mono outfit-summary-kicker">LOOK NOTES</div>
          <h2>把专辑的情绪穿成一套完整的造型。</h2>
          <p>{album.experiment}</p>
          <div className="outfit-wardrobe-list">
            {(album.wardrobe || []).map(function (piece) {
              return (
                <span key={piece.name}>
                  <i style={{ background: piece.color }} />
                  {piece.name}
                </span>
              )
            })}
          </div>
        </div>
      </section>

      <aside
        className={'outfit-longform-queue' + (queueOpen ? ' is-open' : '')}
        aria-label="作品集歌单导览"
      >
        <button
          type="button"
          className="outfit-longform-queue-toggle"
          onClick={function () { setQueueOpen(!queueOpen) }}
          aria-expanded={queueOpen}
          aria-controls="outfit-project-playlist"
        >
          <span className="mono">{queueOpen ? 'CLOSE' : 'PLAYLIST'}</span>
          <strong>{queueOpen ? '收起作品栏' : '作品'}</strong>
          <i aria-hidden="true" />
        </button>

        <div className="outfit-longform-queue-panel" id="outfit-project-playlist">
          <div className="waterfall-queue-head">
            <span className="mono">PLAYLIST / 作品集</span>
            <span className="mono waterfall-queue-count">
              {String(data.albums.length).padStart(2, '0')} TRACKS
            </span>
          </div>
          <ul className="waterfall-queue-list">
            {data.albums.map(function (item, itemIndex) {
              const on = item.id === album.id
              return (
                <li key={item.id}>
                  <Link
                    className={'waterfall-queue-item' + (on ? ' is-active' : '')}
                    to={'/works/' + item.id}
                    aria-current={on ? 'page' : undefined}
                  >
                    <span className="waterfall-queue-index mono">
                      {pad(itemIndex + 1)}
                    </span>
                    <span className="waterfall-queue-thumb">
                      <img src={item.cover} alt="" />
                    </span>
                    <span className="waterfall-queue-meta">
                      <span className="waterfall-queue-title">{item.title}</span>
                      <span className="waterfall-queue-artist mono">{item.artist}</span>
                    </span>
                    <span className="waterfall-queue-bars" aria-hidden="true">
                      <i />
                      <i />
                      <i />
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
          <Link className="outfit-longform-lab" to="/tool">
            <span>
              <small className="mono">AI COLOR LAB</small>
              <strong>进入色彩实验室</strong>
            </span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </aside>

      <section
        className="outfit-longform"
        aria-labelledby="outfit-longform-title"
        ref={storyRef}
      >
        <header className="outfit-longform-heading">
          <div className="mono">OUTFIT STORY / {album.title}</div>
          <h2 id="outfit-longform-title">穿搭细节</h2>
          <p>{story && story.sections && story.sections.inspiration
            ? story.sections.inspiration.lead
            : album.shortIntro}
          </p>
        </header>

        <div className="outfit-longform-layout">
          <section className="outfit-story-sections">
            {storySections.map(function (section, sectionIndex) {
              const sectionData = story && story.sections ? story.sections[section.key] : null
              return (
                <details
                  className="outfit-story-detail outfit-reveal"
                  key={section.title}
                  open={sectionIndex === 0}
                  ref={function (node) { detailRefs.current[sectionIndex] = node }}
                  style={{ '--reveal-delay': (sectionIndex * 70) + 'ms' }}
                >
                  <summary>
                    <span className="mono">{pad(sectionIndex + 1)} / {section.kicker}</span>
                    <strong>{section.title}</strong>
                    <i aria-hidden="true" />
                  </summary>
                  <div className="outfit-story-detail-body">
                    {sectionData ? (
                      <>
                        <StoryGallery photos={sectionData.photos} />
                        <div className="outfit-story-editorial">
                          <div className="mono outfit-story-eyebrow">
                            {sectionData.eyebrow || section.kicker}
                          </div>
                          <p className="outfit-story-lead">{sectionData.lead}</p>
                          <div className="outfit-story-paragraphs">
                            {(sectionData.paragraphs || []).map(function (paragraph) {
                              return <p key={paragraph}>{paragraph}</p>
                            })}
                          </div>

                          {section.key === 'wardrobe' ? (
                            <div className="outfit-story-piece-list">
                              {(album.wardrobe || []).map(function (piece, pieceIndex) {
                                return (
                                  <div className="outfit-story-piece" key={piece.name}>
                                    <i style={{ background: piece.color }} aria-hidden="true" />
                                    <span className="mono">{pad(pieceIndex + 1)} / {piece.type}</span>
                                    <strong>{piece.name}</strong>
                                  </div>
                                )
                              })}
                            </div>
                          ) : null}

                          {section.key === 'color' ? (
                            <div className="outfit-story-palette" aria-label="专辑封面提取色板">
                              {palette.slice(0, 5).map(function (color) {
                                return (
                                  <div className="outfit-story-palette-item" key={color.hex}>
                                    <i style={{ background: color.hex }} aria-hidden="true" />
                                    <span className="mono">{color.hex}</span>
                                    <small>{color.ratio}%</small>
                                  </div>
                                )
                              })}
                            </div>
                          ) : null}

                          {sectionData.facts && sectionData.facts.length ? (
                            <dl className="outfit-story-facts">
                              {sectionData.facts.map(function (fact) {
                                return (
                                  <div key={fact.label}>
                                    <dt className="mono">{fact.label}</dt>
                                    <dd>{fact.value}</dd>
                                  </div>
                                )
                              })}
                            </dl>
                          ) : null}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="outfit-story-placeholder-image">
                          <span className="mono">IMAGE PLACEHOLDER / {pad(sectionIndex + 1)}</span>
                          <small>后续在这里放入配图</small>
                        </div>
                        <div className="outfit-story-placeholder-text">
                          <span className="mono">TEXT PLACEHOLDER / {pad(sectionIndex + 1)}</span>
                          <p>{section.note}</p>
                          <p>
                            {section.key === 'color'
                              ? '可以通过上方色板继续补充每个颜色的使用面积、材质对应关系和最终调整记录。'
                              : album.emotion}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </details>
              )
            })}
          </section>

        </div>
      </section>
    </article>
  )
}
