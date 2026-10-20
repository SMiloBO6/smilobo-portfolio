import { Routes, Route } from 'react-router-dom'
import { lazy, Suspense, useEffect, useState } from 'react'
import Navbar from './components/Navbar.jsx'
import Footer from './components/Footer.jsx'
import PageTransition from './components/PageTransition.jsx'
import { Navigate, useParams } from 'react-router-dom'
import GlobalCarrotAssistant from './components/GlobalCarrotAssistant.jsx'
import Home from './components/pages/Home.jsx'

const Works = lazy(function () { return import('./components/pages/Works.jsx') })
const Waterfall = lazy(function () { return import('./components/pages/Waterfall.jsx') })
const WorkDetail = lazy(function () { return import('./components/pages/WorkDetail.jsx') })
const About = lazy(function () { return import('./components/pages/About.jsx') })
const Tool = lazy(function () { return import('./components/pages/Tool.jsx') })

function StoryRedirect() {
  const { id } = useParams()
  return <Navigate to={'/works/' + (id || '')} replace />
}

function getInitialTheme() {
  if (typeof window === 'undefined') return 'light'
  const saved = window.localStorage.getItem('portfolio-theme')
  if (saved === 'dark' || saved === 'light') return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function RouteLoading() {
  return (
    <div className="route-loading" role="status" aria-label="页面加载中">
      <i aria-hidden="true" />
    </div>
  )
}

export default function App() {
  const [theme, setTheme] = useState(getInitialTheme)
  const [carrotMessages, setCarrotMessages] = useState([
    {
      role: 'bot',
      at: Date.now(),
      text: '嗨嗨，小萝卜上线！（萝卜叶子晃了晃）看作品、聊穿搭、随便唠都奥凯！'
    }
  ])

  useEffect(function () {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
    window.localStorage.setItem('portfolio-theme', theme)
  }, [theme])

  function toggleTheme() {
    setTheme(function (current) { return current === 'dark' ? 'light' : 'dark' })
  }

  return (
    <div className="app-shell">
      <Navbar theme={theme} onToggleTheme={toggleTheme} />
      <main className="app-main">
        <PageTransition>
          <Suspense fallback={<RouteLoading />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/works" element={<Works />} />
              <Route path="/waterfall" element={<Waterfall />} />
              <Route path="/works/:id" element={<WorkDetail />} />
              <Route path="/works/:id/story" element={<StoryRedirect />} />
              <Route path="/about" element={<About />} />
              <Route
                path="/tool"
                element={
                  <Tool
                    carrotMessages={carrotMessages}
                    setCarrotMessages={setCarrotMessages}
                  />
                }
              />
            </Routes>
          </Suspense>
        </PageTransition>
      </main>
      <Footer />
      <GlobalCarrotAssistant
        messages={carrotMessages}
        setMessages={setCarrotMessages}
      />
    </div>
  )
}
