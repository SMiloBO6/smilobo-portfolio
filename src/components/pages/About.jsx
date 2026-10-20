import { Fragment, useEffect, useRef, useState } from 'react'
import data from '../../data/albums.js'
import CarrotMascot from '../CarrotMascot.jsx'
import { getSocialLinks } from '../../utils/socialLinks.js'

// 章节进入视口后再浮现，让长页面纵向浏览时有节奏
function useScrollReveal() {
  const nodesRef = useRef([])

  useEffect(function () {
    const nodes = nodesRef.current.filter(Boolean)
    if (!nodes.length) return undefined

    function reveal(node) {
      node.classList.add('is-visible')
    }

    if (!('IntersectionObserver' in window)) {
      nodes.forEach(reveal)
      return undefined
    }

    // 快速跳转或滚动时 observer 可能整段跳过，用滚动巡检补齐已经越过的章节。
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
        if (!entry.isIntersecting) return
        reveal(entry.target)
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
  }, [])

  return function (index) {
    return function (node) { nodesRef.current[index] = node }
  }
}

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

export default function About() {
  const p = data.personal
  const [form, setForm] = useState({ name: '', email: '', reach: '', message: '' })
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [delivered, setDelivered] = useState(false)
  const [copied, setCopied] = useState('')
  const revealRef = useScrollReveal()
  const social = getSocialLinks(p)

  const contactRows = [
    social.email,
    social.xiaohongshu,
    social.douyin,
    social.website,
    social.instagram,
    social.city
  ]

  function update(key, value) {
    setForm(function (current) {
      const next = Object.assign({}, current)
      next[key] = value
      return next
    })
  }

  async function copyValue(value) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(value)
      } else {
        fallbackCopy(value)
      }
    } catch (error) {
      fallbackCopy(value)
    }
    setCopied(value)
    window.setTimeout(function () {
      setCopied(function (current) { return current === value ? '' : current })
    }, 1400)
  }

  async function submit(event) {
    event.preventDefault()
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) return
    if (sending) return
    setSending(true)
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const result = await response.json()
      if (response.ok && result.ok) {
        setDelivered(true)
        setForm({ name: '', email: '', reach: '', message: '' })
      } else {
        setDelivered(false)
      }
    } catch (error) {
      setDelivered(false)
    }
    setSent(true)
    setSending(false)
  }

  const mailtoHref =
    'mailto:' + p.email +
    '?subject=' + encodeURIComponent('来自作品集的联系 · ' + (form.name || '访客')) +
    '&body=' + encodeURIComponent(
      '姓名：' + form.name + '\n' +
      '邮箱：' + form.email + '\n' +
      '其他联系方式：' + form.reach + '\n\n' +
      form.message
    )

  return (
    <div className="about">
      <div className="about-glow" aria-hidden="true" />
      <aside className="about-side">
        <div className="about-side-num mono">03 / ABOUT</div>
        <h1 className="about-side-name">{p.name}</h1>
        <div className="about-author-signal" aria-label="网站作者形象：小萝卜">
          <div className="about-author-portrait">
            <span className="about-author-orbit" aria-hidden="true" />
            <CarrotMascot size={104} className="about-author-mascot" />
          </div>
        </div>
        <dl className="about-side-info">
          <dt>方向</dt><dd>{p.role}</dd>
          <dt>学校</dt><dd>{p.school}</dd>
          <dt>毕业</dt><dd>{p.year}</dd>
          <dt>城市</dt><dd>{p.city}</dd>
        </dl>
        <div className="about-side-contact">
          <div className="mono about-side-contact-label">CONTACT CHANNELS</div>
          <a
            className="about-contact-channel"
            href={social.xiaohongshu.href}
            target={social.xiaohongshu.target}
            rel={social.xiaohongshu.rel}
          >
            <span className="about-contact-channel-label">小红书</span>
            <strong>{social.xiaohongshu.value}</strong>
            <i aria-hidden="true">↗</i>
          </a>
          <a
            className="about-contact-channel"
            href={social.douyin.href}
            target={social.douyin.target}
            rel={social.douyin.rel}
          >
            <span className="about-contact-channel-label">抖音</span>
            <strong>{social.douyin.value}</strong>
            <i aria-hidden="true">↗</i>
          </a>
          <a href="#contact" className="about-side-cta">
            <span className="about-side-cta-dot" aria-hidden="true" />
            <span className="about-side-cta-text">联系我</span>
            <span className="about-side-cta-arrow mono" aria-hidden="true">↓</span>
          </a>
        </div>
      </aside>

      <main className="about-main">
        <section className="about-section about-manifesto-section about-reveal" ref={revealRef(0)}>
          <div className="about-manifesto-content">
            <span className="about-manifesto-kicker">关于本站</span>
            <div className="about-manifesto-layout">
              <h2 className="about-manifesto-title">
                <span className="about-manifesto-line">
                  <span className="about-manifesto-soft">把听见的</span>
                  <span className="about-manifesto-accent">情绪</span>
                  <span className="about-manifesto-punctuation">，</span>
                </span>
                <span className="about-manifesto-line">
                  <span className="about-manifesto-strong">穿在</span>
                  <span>身上</span>
                  <span className="about-manifesto-punctuation">。</span>
                </span>
              </h2>
              <div className="about-manifesto-copy">
                <p>我用颜色、材质与搭配，翻译每首歌带来的画面。</p>
                <p>这里记录我的音乐穿搭实验。希望你也找到属于自己的那一帧。</p>
              </div>
            </div>
          </div>
        </section>

        <section
          className="about-section about-contact about-reveal"
          id="contact"
          ref={revealRef(1)}
          style={{ '--reveal-delay': '80ms' }}
        >
          <div className="about-section-num mono">03</div>
          <div className="contact-grid">
            <div className="contact-intro">
              <span className="contact-eyebrow mono">CONTACT / 联系我</span>
              <h2 className="contact-title">联系我</h2>
              <p className="contact-lead">{p.contactNote}</p>
              <div className="contact-list">
                {contactRows.map(function (row) {
                  const active = copied === row.value
                  return (
                    <div className="contact-row" key={row.label}>
                      <span className="mono contact-row-label">{row.label}</span>
                      {row.href ? (
                        <a
                          className="contact-row-value"
                          href={row.href}
                          target={row.target}
                          rel={row.rel}
                        >
                          {row.value}
                          {row.target && <span className="contact-row-external mono">↗</span>}
                        </a>
                      ) : (
                        <span className="contact-row-value">{row.value}</span>
                      )}
                      <button
                        type="button"
                        className={'mono contact-row-copy' + (active ? ' is-copied' : '')}
                        onClick={function () { copyValue(row.value) }}
                      >
                        {active ? 'COPIED' : 'COPY'}
                      </button>
                    </div>
                  )
                })}
              </div>
              <p className="mono contact-reply">{p.replyTime}</p>
            </div>

            <form className="contact-form" onSubmit={submit}>
              <div className="contact-form-row">
                <label className="contact-field">
                  <span className="contact-field-label">姓名 / Name</span>
                  <input
                    value={form.name}
                    onChange={function (e) { update('name', e.target.value) }}
                    placeholder="怎么称呼你"
                    required
                  />
                </label>
                <label className="contact-field">
                  <span className="contact-field-label">邮箱 / Email</span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={function (e) { update('email', e.target.value) }}
                    placeholder="you@example.com"
                    required
                  />
                </label>
              </div>
              <label className="contact-field">
                <span className="contact-field-label">其他联系方式 / Reach</span>
                <input
                  value={form.reach}
                  onChange={function (e) { update('reach', e.target.value) }}
                  placeholder="抖音 / 小红书 / 电话（可选）"
                />
              </label>
              <label className="contact-field">
                <span className="contact-field-label">留言 / Message</span>
                <textarea
                  rows={6}
                  value={form.message}
                  onChange={function (e) { update('message', e.target.value) }}
                  placeholder="想聊的项目、合作方向，或者只是打个招呼"
                  required
                />
              </label>

              <div className="contact-actions">
                <button type="submit" className="contact-submit" disabled={sending}>
                  {sending ? '提交中…' : '提交 Submit'} <span aria-hidden="true">→</span>
                </button>
                {sent && (
                  <div className="contact-sent">
                    {delivered ? (
                      <Fragment>
                        <strong>已收到，谢谢！</strong>
                        <span className="mono">已存入本地收件箱，主人可在 /inbox 查看。</span>
                        <a href={mailtoHref}>同时用邮件客户端发送 →</a>
                      </Fragment>
                    ) : (
                      <Fragment>
                        <strong>已收到，但本地收件箱暂时不可用。</strong>
                        <span className="mono">已为你生成邮件草稿：</span>
                        <a href={mailtoHref}>用邮件客户端发送 →</a>
                      </Fragment>
                    )}
                  </div>
                )}
              </div>
            </form>
          </div>
        </section>

        <section
          className="about-section about-reveal"
          ref={revealRef(4)}
          style={{ '--reveal-delay': '60ms' }}
        >
          <div className="about-section-num mono">04</div>
          <h2 className="about-section-title">Ethics & License</h2>
          <p className="about-section-text about-section-muted">{p.ethics}</p>
        </section>
      </main>
    </div>
  )
}
