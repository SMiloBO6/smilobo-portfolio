import { Link, useParams } from 'react-router-dom'
import data from '../../data/albums.json'
import PaletteRail from '../PaletteRail.jsx'
import { useAlbumPalette } from '../../utils/useAlbumPalette.js'

function pad(value) {
  return String(value).padStart(2, '0')
}

const storySections = [
  {
    title: '灵感来源',
    kicker: 'INSPIRATION',
    note: '把最初听到这张专辑时想到的场景、材质和时间写在这里。'
  },
  {
    title: '色彩推导',
    kicker: 'COLOR STUDY',
    note: '记录主色取舍、面积比例以及最终为什么选择这套组合。'
  },
  {
    title: '单品拆解',
    kicker: 'WARDROBE',
    note: '把上衣、下装、鞋履与配饰的版型、材质和购买信息补充在这里。'
  },
  {
    title: '实拍记录',
    kicker: 'ON BODY',
    note: '整理试穿记录、不同光线下的效果，以及下一次想调整的细节。'
  }
]

export default function OutfitStory() {
  const { id } = useParams()
  const album = data.albums.find(function (item) { return item.id === id }) || data.albums[0]
  const index = data.albums.findIndex(function (item) { return item.id === album.id })
  const prev = data.albums[(index - 1 + data.albums.length) % data.albums.length]
  const next = data.albums[(index + 1) % data.albums.length]
  const palette = useAlbumPalette(album)

  const theme = {
    '--look-a': palette[0] ? palette[0].hex : '#C9A24B',
    '--look-b': palette[1] ? palette[1].hex : '#4A5C3A',
    '--look-c': palette[2] ? palette[2].hex : '#F2EBDC',
    '--look-d': palette[4] ? palette[4].hex : '#9B7BD8'
  }

  return (
    <article className="outfit-story" style={theme}>
      <header className="outfit-story-hero">
        <div className="outfit-story-copy">
          <div className="mono outfit-story-kicker">
            OUTFIT STORY {pad(index + 1)} / {pad(data.albums.length)}
          </div>
          <h1>{album.title}</h1>
          <p className="outfit-story-lead">{album.shortIntro}</p>
          <div className="outfit-story-actions">
            <Link to={'/works/' + album.id} className="outfit-story-back">
              ← 返回穿搭展示
            </Link>
            <Link to="/tool" className="outfit-story-tool">
              AI 色彩实验室
            </Link>
          </div>
        </div>

        <div className="outfit-story-visual">
          <div className="outfit-story-visual-color" aria-hidden="true" />
          <img src={album.outfit} alt={album.title + ' 穿搭实拍'} />
          <div className="outfit-story-visual-label mono">
            <span>LOOK / {pad(index + 1)}</span>
            <span>{album.artist}</span>
          </div>
        </div>
      </header>

      <div className="outfit-story-layout">
        <section className="outfit-story-sections">
          <div className="mono outfit-story-section-title">STORY SECTIONS / 点击标题展开</div>
          {storySections.map(function (section, sectionIndex) {
            return (
              <details className="outfit-story-detail" key={section.title} open={sectionIndex === 0}>
                <summary>
                  <span className="mono">{pad(sectionIndex + 1)} / {section.kicker}</span>
                  <strong>{section.title}</strong>
                  <i aria-hidden="true" />
                </summary>
                <div className="outfit-story-detail-body">
                  <div className="outfit-story-placeholder-image">
                    <span className="mono">IMAGE PLACEHOLDER / {pad(sectionIndex + 1)}</span>
                    <small>后续在这里放入配图</small>
                  </div>
                  <div className="outfit-story-placeholder-text">
                    <span className="mono">TEXT PLACEHOLDER / {pad(sectionIndex + 1)}</span>
                    <p>{section.note}</p>
                    <p>
                      {sectionIndex === 1
                        ? '可以通过上方右侧色板继续补充每个颜色的使用面积、材质对应关系和最终调整记录。'
                        : album.emotion}
                    </p>
                  </div>
                </div>
              </details>
            )
          })}
        </section>

        <PaletteRail palette={palette} title={album.title + ' 色板'} />
      </div>

      <nav className="detail-nav outfit-detail-nav">
        <Link to={'/works/' + prev.id + '/story'} className="detail-nav-btn">
          <div className="mono">PREV STORY</div>
          <div className="detail-nav-title">{prev.title}</div>
        </Link>
        <Link to={'/works/' + album.id} className="detail-nav-back">返回穿搭展示</Link>
        <Link to={'/works/' + next.id + '/story'} className="detail-nav-btn right">
          <div className="mono">NEXT STORY</div>
          <div className="detail-nav-title">{next.title}</div>
        </Link>
      </nav>
    </article>
  )
}
