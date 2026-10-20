import { useState } from 'react'
import { Link } from 'react-router-dom'

function fallbackCopy(text) {
  const input = document.createElement('textarea')
  input.value = text
  input.setAttribute('readonly', '')
  input.style.position = 'fixed'
  input.style.opacity = '0'
  document.body.appendChild(input)
  input.select()
  document.execCommand('copy')
  document.body.removeChild(input)
}

export default function PaletteRail(props) {
  const { palette, title, compact = false } = props
  const [copied, setCopied] = useState('')
  const visiblePalette = palette.slice(0, 4)
  const colorCount = String(visiblePalette.length).padStart(2, '0')

  async function copyColor(hex) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(hex)
      } else {
        fallbackCopy(hex)
      }
      setCopied(hex)
      window.setTimeout(function () {
        setCopied(function (current) { return current === hex ? '' : current })
      }, 1400)
    } catch (error) {
      fallbackCopy(hex)
      setCopied(hex)
    }
  }

  return (
    <aside
      className={'palette-rail' + (compact ? ' is-compact' : '')}
      aria-label={compact ? (title || '色板') : undefined}
    >
      {compact ? null : (
        <div className="palette-rail-head">
          <div>
            <div className="mono palette-rail-kicker">COLOR PANEL</div>
            <h2 className="palette-rail-title">{title || '专辑色彩提取'}</h2>
          </div>
          <span className="mono palette-rail-count">{colorCount} COLORS</span>
        </div>
      )}

      <div className="palette-rail-panel">
        <div className="palette-rail-list">
          {visiblePalette.map(function (color, index) {
            const active = copied === color.hex
            return (
              <button
                type="button"
                className={'palette-rail-item' + (active ? ' is-copied' : '')}
                key={color.hex + '-' + index}
                onClick={function () { copyColor(color.hex) }}
                title={'点击复制 ' + color.hex}
                aria-label={'复制色号 ' + color.hex}
              >
                <span className="palette-rail-swatch" style={{ background: color.hex }} />
                <span className="palette-rail-meta mono">
                  <strong>{active ? '已复制' : color.hex}</strong>
                  {compact ? null : <span>{color.ratio}%</span>}
                </span>
              </button>
            )
          })}
        </div>

        {compact ? (
          <span className="palette-rail-announcement" aria-live="polite">
            {copied ? copied + ' 已复制' : ''}
          </span>
        ) : (
          <div className="palette-rail-status mono" aria-live="polite">
            {copied ? copied + ' 已复制' : '点击色块复制色号'}
          </div>
        )}
      </div>

      {compact ? null : (
        <Link className="palette-rail-tool" to="/tool">
          <span className="palette-rail-tool-icon mono">AI</span>
          <span>
            <strong>AI 实验室</strong>
            <small>色彩 · 穿搭建议</small>
          </span>
          <span aria-hidden="true">→</span>
        </Link>
      )}
    </aside>
  )
}
