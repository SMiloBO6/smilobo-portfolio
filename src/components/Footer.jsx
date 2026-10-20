import { useLocation } from 'react-router-dom'
import data from '../data/albums.js'
import { getSocialLinks } from '../utils/socialLinks.js'

export default function Footer() {
  const p = data.personal
  const location = useLocation()
  const social = getSocialLinks(p)

  if (location.pathname === '/') return null

  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-left">
          <div className="footer-name">{p.name}</div>
          <div className="footer-tagline">{p.tagline}</div>
        </div>
        <div className="footer-right">
          <a href={social.email.href} className="footer-link">{social.email.value}</a>
          <span className="footer-sep">/</span>
          <a
            href={social.xiaohongshu.href}
            target={social.xiaohongshu.target}
            rel={social.xiaohongshu.rel}
            className="footer-link footer-xhs"
          >
            小红书 {social.xiaohongshu.value}
          </a>
          <span className="footer-sep">/</span>
          <a
            href={social.douyin.href}
            target={social.douyin.target}
            rel={social.douyin.rel}
            className="footer-link footer-douyin"
          >
            抖音 {social.douyin.value}
          </a>
        </div>
      </div>
      <div className="footer-bottom">
        <span className="footer-mono">© 2026 {p.name}. All rights reserved.</span>
        <span className="footer-mono">{p.city}</span>
      </div>
    </footer>
  )
}
