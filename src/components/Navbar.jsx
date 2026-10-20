import { Link, NavLink } from 'react-router-dom'
import data from '../data/albums.json'
import SignatureMark from './SignatureMark.jsx'

function ThemeIcon(props) {
  if (props.theme === 'dark') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20.5 14.1A8.5 8.5 0 0 1 9.9 3.5 8.5 8.5 0 1 0 20.5 14.1Z" />
    </svg>
  )
}

export default function Navbar(props) {
  const p = data.personal
  const isDark = props.theme === 'dark'

  return (
    <header className="nav">
      <div className="nav-inner">
        <Link to="/" className="nav-logo" aria-label={p.name + ' · 首页'}>
          <SignatureMark className="nav-logo-signature" />
          <span className="nav-logo-en">/ 首页</span>
        </Link>
        <nav className="nav-links">
          <NavLink to="/works" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
            <span className="nav-link-num">01</span> 作品
          </NavLink>
          <NavLink to="/waterfall" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
            <span className="nav-link-num">02</span> 专辑陈列
          </NavLink>
          <NavLink to="/tool" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
            <span className="nav-link-num">03</span> 帮我穿
          </NavLink>
          <NavLink to="/about" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
            <span className="nav-link-num">04</span> 关于
          </NavLink>
          <button
            type="button"
            className="nav-theme-toggle"
            onClick={props.onToggleTheme}
            aria-label={isDark ? '切换到浅色模式' : '切换到深色模式'}
            aria-pressed={isDark}
            title={isDark ? '切换到浅色模式' : '切换到深色模式'}
          >
            <ThemeIcon theme={props.theme} />
          </button>
        </nav>
      </div>
    </header>
  )
}
