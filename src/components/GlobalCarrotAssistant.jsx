import { Fragment, useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import CarrotMascot from './CarrotMascot.jsx'
import { askAdvisor, checkAdvisorStatus } from '../services/outfitAdvisor.js'

const IDLE_PROMPTS = [
  '老大，来和小萝卜唠两句呀！',
  '今天想看哪张专辑？小萝卜我带路！',
  '纠结穿什么？把色号丢给我看看呀',
  '我服了呀，今天到底穿成哪张专辑好呢',
  '刚被上课封印了？来挑套战袍解封！',
  '心情灰灰的也没事，衣服可以蓝一点呀',
  '别光看，点进来试试，小萝卜我挺好聊的',
  '在纠结穿搭？太正常了，进来一起纠结',
  'oi，这里有根萝卜等你半天了！',
  '随便问，答不上来我就钻土里宕机。。'
]

const QUICK_PROMPTS = [
  {
    id: 'outfit',
    label: '去「帮我穿」',
    question: '带我去「帮我穿」搭一套呀？'
  },
  {
    id: 'album',
    label: '逛「作品」',
    question: '带我去「作品」看看作品集！'
  },
  {
    id: 'contact',
    label: '怎么找到你',
    question: '怎么联系 SMilE萝卜呀？'
  },
  {
    id: 'recommend',
    label: '去「专辑陈列」',
    question: '带我去「专辑陈列」逛逛，第一次来先看哪张专辑呀？'
  },
  {
    id: 'fail',
    label: '搭配翻车了',
    question: '穿衣服老是像交通指挥服，难绷，怎么办呀？'
  },
  {
    id: 'mood',
    label: '今天有点难绷',
    question: '我今天心情不怎么样，想让你陪我聊两句。'
  }
]

function pick(list) {
  return list[Math.floor(Math.random() * list.length)]
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), Math.max(min, max))
}

function formatChatTime(value) {
  const date = new Date(value)
  if (!value || Number.isNaN(date.getTime())) return ''
  return String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0')
}

function initialViewport() {
  return {
    w: typeof window === 'undefined' ? 1440 : window.innerWidth,
    h: typeof window === 'undefined' ? 900 : window.innerHeight
  }
}

function mascotSizeFor(width) {
  return width <= 640 ? 86 : 104
}

function initialPosition() {
  const viewport = initialViewport()
  const size = mascotSizeFor(viewport.w)
  return {
    x: viewport.w - size - 28,
    y: viewport.h - size - 104
  }
}

function localReply(text) {
  const value = text.toLowerCase()

  // 姓名 / 身份
  if (
    value.includes('叫什么') ||
    value.includes('名字') ||
    value.includes('你是谁') ||
    value.includes('介绍一下自己')
  ) {
    return {
      text: '小萝卜呀！SMilE萝卜在二次元里的分身，陪你聊作品和穿搭。'
    }
  }

  // 打招呼 / 你是谁
  if (
    value.includes('你好') ||
    value.includes('在吗') ||
    value.includes('hello') ||
    value.includes('hi')
  ) {
    return {
      text: pick([
        '嗨嗨，小萝卜在！（开心地手舞足蹈）',
        '在的在的，萝卜在线！你直接说就行呀。',
        'oi，老大来啦！今天想看作品还是聊穿搭？'
      ])
    }
  }

  // 心情 / 情绪 / 焦虑 / 累
  if (
    value.includes('心情') ||
    value.includes('emo') ||
    value.includes('难过') ||
    value.includes('焦虑') ||
    value.includes('累') ||
    value.includes('压力') ||
    value.includes('烦') ||
    value.includes('丧') ||
    value.includes('不开心') ||
    value.includes('低落')
  ) {
    return {
      text: pick([
        '哦莫，抱一下。先别撑了，我陪你坐会儿。。',
        '累了就先别管穿搭法则，穿舒服点，剩下的明天再说！',
        '听到啦，先给你一个隔空抱抱！要是现在非得选一套，我会投《100 种生活》的米白配军绿，松一点，人也松一点呀。',
        '心情低低就先别碰高饱和，蓝白搭一下会清爽很多呀。'
      ]),
      actions: [
        { type: 'link', label: '去看看《100 种生活》', to: '/works/01-100' },
        { type: 'link', label: '去「作品」随便逛逛', to: '/works' }
      ]
    }
  }

  // 专辑陈列
  if (value.includes('专辑陈列')) {
    return {
      text: pick([
        '「专辑陈列」就在导航栏呀，进去直接翻唱片封面，点开还能看整套穿搭。',
        '走，去「专辑陈列」翻封面！不知道看哪张就先点《100 种生活》，最稳。'
      ]),
      actions: [
        { type: 'link', label: '打开「专辑陈列」→', to: '/waterfall' },
        { type: 'link', label: '去「作品」看全部 →', to: '/works' }
      ]
    }
  }

  // 推荐专辑 / 第一次来
  if (
    value.includes('推荐') ||
    value.includes('哪张') ||
    value.includes('第一次') ||
    value.includes('入门')
  ) {
    return {
      text: pick([
        '第一次来，我推荐《100 种生活》：温暖民谣配大地色，35% 芥末黄 + 25% 军绿 + 25% 米白，通勤上课都扛得住，最不容易出错。喜欢冷一点的就去《4 Your Eyez Only》，黑大衣配高领针织，人设直接拉满。',
        '入门首选《100 种生活》，校园感、松弛感、安全感三合一。想刺激点的，试试《Legends Never Die》的黑色 oversized 卫衣路线。',
        '推荐看缘分：今天心情平静就《100 种生活》，想炸一点就《Graduation》的粉色运动外套 + 深紫卫衣，校园感直接超标。报个心情，我给你对号入座。'
      ]),
      actions: [
        { type: 'link', label: '查看《100 种生活》', to: '/works/01-100' },
        { type: 'link', label: '去「作品」看全部', to: '/works' }
      ]
    }
  }

  // 穿搭踩雷 / 翻车 / 土
  if (
    value.includes('踩雷') ||
    value.includes('翻车') ||
    value.includes('丑') ||
    value.includes('失败') ||
    value.includes('土') ||
    value.includes('指挥服')
  ) {
    return {
      text: pick([
        '交通指挥服？那说明黄色没配好。我的经验：亮色必须配深压色，黄色上身别超 1/3，剩下交给军绿或深灰。详情可以看《100 种生活》的实验记录，我踩过的坑你别再踩。',
        '翻车不可怕，可怕的是不知道为啥翻车。90% 的翻车都是颜色太多、没有主色。先定一个主色，其他全部压低饱和度，马上能救回来。',
        '土不土是玄学，但配色有科学。记住一句话：一个主色 + 两个中性色 + 小面积点缀，基本不会翻车到沟里。',
        '你这不是不会穿，是色卡开太大。参考 Madvillainy 的做法：黑白灰打底，只留 8% 的橘色当信号——克制才是高级感。'
      ]),
      actions: [
        { type: 'link', label: '看配色实验记录', to: '/works/01-100' },
        { type: 'link', label: '去「帮我穿」算配色', to: '/tool' }
      ]
    }
  }

  // 联系 / 合作 / 招聘
  if (
    value.includes('联系') ||
    value.includes('邮箱') ||
    value.includes('招聘') ||
    value.includes('合作') ||
    value.includes('微信') ||
    value.includes('电话')
  ) {
    return {
      text: '想找 SMilE萝卜呀？联系方式都在这儿，点一下就能复制！合作、招聘和闲聊都欢迎，不过真人回复要等 1-2 个工作日：',
      actions: [
        { type: 'copy', label: '复制邮箱 SMiloBo6@proton.me', value: 'SMiloBo6@proton.me' },
        { type: 'copy', label: '复制小红书 @LOBO568', value: '@LOBO568' },
        { type: 'copy', label: '复制抖音 SMilE萝卜', value: 'SMilE萝卜' },
        { type: 'copy', label: '复制 IG @smilobo6', value: '@smilobo6' },
        { type: 'link', label: '去「关于」查看更多 →', to: '/about' }
      ]
    }
  }

  // 实验室 / AI / 工具
  if (
    value.includes('实验室') ||
    value.includes('帮我穿') ||
    value.includes('ai') ||
    value.includes('工具') ||
    value.includes('色号')
  ) {
    return {
      text: pick([
        '「帮我穿」能上传图片、输入多个色号或选已有专辑，再按季节、场合和风格生成颜色权重与穿搭建议。相当于一个会算数的搭配师。',
        '「帮我穿」就在导航栏：先定季节场合，再丢色号给我，我帮你算比例、避雷、出方案。用完记得回来夸我。',
        '把色号给我，我给你算权重。不想动脑就选一张已有专辑，我按它的配色直接给你出穿搭方案。'
      ]),
      actions: [
        { type: 'link', label: '打开「帮我穿」→', to: '/tool' }
      ]
    }
  }

  // 风格 / 场合
  if (
    value.includes('风格') ||
    value.includes('复古') ||
    value.includes('街头') ||
    value.includes('极简') ||
    value.includes('通勤') ||
    value.includes('校园') ||
    value.includes('上班') ||
    value.includes('约会') ||
    value.includes('正式')
  ) {
    const styleReply = pick([
      '极简：黑白灰打底 + 一个信号色点缀，参考 Madvillainy 那套——纸白、金属灰，就留 8% 的橘色在头发和耳机线上。',
      '校园通勤：宽松工装裤 + 军绿夹克 + 米白 T，一套下来又松弛又有型，正是《100 种生活》的日常。',
      '约会：别全听我的，但我会建议参考 Flower Boy 的鹅黄 + 格纹阔腿裤，明亮但克制，看起来像认真收拾过又没太用力。',
      '街头感就《Legends Never Die》：黑色 oversized 卫衣 + 破洞牛仔裤 + 厚底靴，紫色腰包当点睛。帅是帅，就是回头率有点高。'
    ])
    const target =
      value.includes('极简') || value.includes('街头') || value.includes('地下')
        ? '/works/08-madvillainy'
        : value.includes('约会') || value.includes('复古')
          ? '/works/03-flower'
          : value.includes('校园') || value.includes('通勤')
            ? '/works/01-100'
            : '/works'
    return {
      text: styleReply,
      actions: [
        { type: 'link', label: '看这套的完整方案 →', to: target },
        { type: 'link', label: '去「作品」看全部风格', to: '/works' }
      ]
    }
  }

  // 音乐 / 专辑 / 歌单
  if (
    value.includes('音乐') ||
    value.includes('歌') ||
    value.includes('说唱') ||
    value.includes('嘻哈') ||
    value.includes('民谣') ||
    value.includes('专辑') ||
    value.includes('歌单')
  ) {
    const musicReply = pick([
      '我这儿 8 张专辑，从 Crowd Lu 的温暖民谣到 Madvillain 的地下采样都有。每张都配了穿搭方案和色卡，去「专辑陈列」看封面最好逛。',
      '说唱的话推荐《4 Your Eyez Only》和《Legends Never Die》，一个冷静一个炸，穿搭也是两个极端：黑色大衣 vs oversized 卫衣。',
      '民谣就《100 种生活》，校园感拉满；R&B 的话《Miseducation》那套橘色灯芯绒西装很有力量感。你报歌单，我报穿搭。'
    ])
    const musicTarget =
      value.includes('说唱') || value.includes('嘻哈')
        ? '/works/02-eyez'
        : value.includes('民谣')
          ? '/works/01-100'
          : '/waterfall'
    return {
      text: musicReply,
      actions: [
        { type: 'link', label: '去「专辑陈列」逛 →', to: musicTarget },
        { type: 'link', label: '去「作品」看全部', to: '/works' }
      ]
    }
  }

  // 穿搭 / 搭配 / 颜色 / 色彩
  if (
    value.includes('穿搭') ||
    value.includes('搭配') ||
    value.includes('颜色') ||
    value.includes('色彩') ||
    value.includes('配色') ||
    value.includes('穿')
  ) {
    return {
      text: pick([
        '先定一个主色，再用低饱和颜色压住画面，最后留 10% 到 20% 给配饰或材质反光。你也可以去「帮我穿」输入具体色号，我帮你算权重。',
        '搭配公式送你一个：主色 60% + 辅助 30% + 点缀 10%。比如芥末黄配军绿配米白，就是《100 种生活》的 35/25/25。',
        '配色别超过三种主色，颜色越多越像调色盘成精。拿不准就去「帮我穿」，把色号丢给我，比你自己纠结快。'
      ]),
      actions: [
        { type: 'link', label: '去「帮我穿」算配色 →', to: '/tool' },
        { type: 'link', label: '去「作品」看配色案例', to: '/works' }
      ]
    }
  }

  // 作品 / 专辑陈列
  if (value.includes('作品') || value.includes('专辑陈列') || value.includes('瀑布')) {
    return {
      text: pick([
        '作品都在「作品」里，可以按穿搭风格、穿搭色彩或音乐风格筛选；想看每张专辑和对应造型，就去「专辑陈列」。',
        '「作品」里有 8 张专辑、8 套完整穿搭；「专辑陈列」适合直接翻封面，点进去还能看单品拆解，逛完记得回来找我。'
      ]),
      actions: [
        { type: 'link', label: '打开「作品」→', to: '/works' },
        { type: 'link', label: '打开「专辑陈列」→', to: '/waterfall' }
      ]
    }
  }

  // 吃 / 热量 / 减肥（彩蛋）
  if (
    value.includes('吃') ||
    value.includes('热量') ||
    value.includes('减肥') ||
    value.includes('火锅') ||
    value.includes('胖')
  ) {
    return {
      text: pick([
        '穿搭和热量我都懂一点：衣服遮肉不靠黑，靠版型；火锅该吃吃，明天再穿显瘦的。',
        '刚吃完火锅就想着减肥？先挑一套宽松的，心理负担少一半。参考《100 种生活》的工装裤，容错率极高。',
        '别问了，问就是“先吃，穿搭的事交给配色”。颜色配对了，视觉上能瘦五斤。'
      ])
    }
  }

  // 季节 / 天气
  if (
    value.includes('天气') ||
    value.includes('秋天') ||
    value.includes('冬天') ||
    value.includes('夏天') ||
    value.includes('春天') ||
    value.includes('冷') ||
    value.includes('热') ||
    value.includes('下雨')
  ) {
    return {
      text: pick([
        '秋天就大地色 + 一点暖橘，跟这个网站背景一个色系，怎么穿都协调。冷了加一件军绿夹克，完美收尾。',
        '冬天要层次：高领针织打底 + 大衣 + 切尔西靴，参考《4 Your Eyez Only》那套，冷峻但体面。',
        '夏天别堆颜色，米白 + 亚麻 + 帆布鞋就够，参考《100 种生活》的清爽版。热天穿太艳，看着都热。'
      ])
    }
  }

  // 夸奖 / 道谢
  if (
    value.includes('谢谢') ||
    value.includes('好看') ||
    value.includes('厉害') ||
    value.includes('喜欢') ||
    value.includes('棒') ||
    value.includes('可爱')
  ) {
    return {
      text: pick([
        '哎呀，哪里哪里（暗爽）你穿得好看，小萝卜我的萝卜叶子都要翘起来啦！',
        '嘻嘻，被老大夸得有点不好意思了。。下次想换风格还来找我呀！',
        '收到表扬，萝卜电量直接 +100！需要实战的时候喊我一声就奥凯。'
      ])
    }
  }

  // 默认兜底
  return {
    text: pick([
        '这题超纲，小萝卜先钻土里宕机一下。。',
        '啊这，小萝卜卡住了。。你换个说法再敲我一下！',
      '没太听懂，但没关系，老大可以换个说法再敲我一下！(doge)',
        '萝卜信号飘了。。再给我一点线索？'
    ]),
    actions: [
      { type: 'link', label: '先去「作品」逛逛', to: '/works' }
    ]
  }
}

export default function GlobalCarrotAssistant(props) {
  const messages = props.messages
  const setMessages = props.setMessages
  const { pathname } = useLocation()
  const isHome = pathname === '/'
  const isLab = pathname.startsWith('/tool')
  const [viewport, setViewport] = useState(initialViewport)
  const [pos, setPos] = useState(initialPosition)
  const [dragging, setDragging] = useState(false)
  const [open, setOpen] = useState(false)
  const [peek, setPeek] = useState(false)
  const [draft, setDraft] = useState('')
  const [bubble, setBubble] = useState(false)
  const [promptIndex, setPromptIndex] = useState(0)
  const [thinking, setThinking] = useState(false)
  const [advisorState, setAdvisorState] = useState('idle')
  const [revealed, setRevealed] = useState(!isHome)
  const [picked, setPicked] = useState(!isHome)
  const [copiedKey, setCopiedKey] = useState(null)
  const dragRef = useRef(null)
  const interactionRef = useRef(Date.now())
  const messageEndRef = useRef(null)

  useEffect(function () {
    if (!open || advisorState !== 'idle') return undefined
    let active = true
    setAdvisorState('checking')
    checkAdvisorStatus().then(function (status) {
      if (active) setAdvisorState(status.configured ? 'online' : 'local')
    })
    return function () { active = false }
  }, [open, advisorState])

  useEffect(function () {
    function openCarrotChat() {
      setBubble(false)
      setPeek(false)
      setRevealed(true)
      setPicked(true)
      setOpen(true)
      interactionRef.current = Date.now()
    }

    window.addEventListener('smile:open-carrot-chat', openCarrotChat)
    return function () { window.removeEventListener('smile:open-carrot-chat', openCarrotChat) }
  }, [])

  const mascotSize = mascotSizeFor(viewport.w)
  const fallbackTop = viewport.h - mascotSize - 104
  const top = Number.isFinite(pos.y) ? pos.y : fallbackTop
  const panelWidth = Math.min(viewport.w - 24, viewport.w <= 640 ? 332 : 356)
  const panelHeight = Math.min(viewport.h - 24, viewport.w <= 640 ? 560 : 532)
  const roomRight = viewport.w - (pos.x + mascotSize + 14)
  const panelLeft = roomRight > panelWidth + 16
    ? pos.x + mascotSize + 14
    : Math.max(12, pos.x - panelWidth + 60)
  const roomBelow = viewport.h - (top + mascotSize)
  const panelTop = roomBelow > panelHeight + 16
    ? top
    : Math.max(12, top - panelHeight + mascotSize)
  const peekLeft = pos.x + mascotSize / 2 < viewport.w / 2
  const peekOffset = peekLeft
    ? -(pos.x + mascotSize - 34)
    : Math.max(34, viewport.w - pos.x - 34)
  const bubbleWidth = viewport.w <= 640 ? 232 : 252
  const bubbleLeft = clamp(
    pos.x + mascotSize - bubbleWidth,
    12,
    viewport.w - bubbleWidth - 12
  )
  const bubbleTop = top - 66 > 68
    ? top - 66
    : top + mascotSize + 12

  useEffect(function () {
    if (!isHome || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setRevealed(true)
      setPicked(true)
      return undefined
    }
    const revealTimer = window.setTimeout(function () { setRevealed(true) }, 720)
    const pickTimer = window.setTimeout(function () { setPicked(true) }, 2580)
    return function () {
      window.clearTimeout(revealTimer)
      window.clearTimeout(pickTimer)
    }
  }, [isHome])

  useEffect(function () {
    function onResize() {
      const next = initialViewport()
      const nextSize = mascotSizeFor(next.w)
      setViewport(next)
      setPos(function (current) {
        return {
          x: clamp(current.x, 4, Math.max(4, next.w - nextSize - 4)),
          y: clamp(current.y, 76, Math.max(76, next.h - nextSize - 4))
        }
      })
    }
    window.addEventListener('resize', onResize)
    return function () { window.removeEventListener('resize', onResize) }
  }, [])

  useEffect(function () {
    function onPointerMove(event) {
      const drag = dragRef.current
      if (!drag) return
      const dx = event.clientX - drag.startX
      const dy = event.clientY - drag.startY
      if (!drag.moved && Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true
      setPos({
        x: clamp(drag.originX + dx, 4, Math.max(4, viewport.w - mascotSize - 4)),
        y: clamp(drag.originY + dy, 76, Math.max(76, viewport.h - mascotSize - 4))
      })
      setBubble(false)
      setPeek(false)
      interactionRef.current = Date.now()
    }

    function onPointerUp() {
      const drag = dragRef.current
      if (!drag) return
      const moved = drag.moved
      dragRef.current = null
      setDragging(false)
      interactionRef.current = Date.now()
      if (!moved) {
        setBubble(false)
        setOpen(function (value) { return !value })
      }
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
    return function () {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
    }
  }, [mascotSize, viewport.h, viewport.w])

  useEffect(function () {
    if (open || peek || dragging || !picked) {
      setBubble(false)
      return undefined
    }

    let active = true
    let showTimer = 0
    let hideTimer = 0

    function schedule() {
      const delay = 8000 + Math.random() * 4000
      showTimer = window.setTimeout(function () {
        if (!active) return
        setPromptIndex(function (index) { return (index + 1) % IDLE_PROMPTS.length })
        setBubble(true)
        interactionRef.current = Date.now()
        hideTimer = window.setTimeout(function () {
          if (!active) return
          setBubble(false)
          schedule()
        }, 5200)
      }, delay)
    }

    schedule()
    return function () {
      active = false
      window.clearTimeout(showTimer)
      window.clearTimeout(hideTimer)
    }
  }, [dragging, open, peek, picked])

  useEffect(function () {
    if (!open || !messageEndRef.current) return
    messageEndRef.current.scrollIntoView({ block: 'nearest' })
  }, [messages, open])

  function onPointerDown(event) {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    setBubble(false)
    setPeek(false)
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: pos.x,
      originY: top,
      moved: false
    }
    setDragging(true)
    interactionRef.current = Date.now()
    event.preventDefault()
  }

  function toggleOpen() {
    interactionRef.current = Date.now()
    setBubble(false)
    setOpen(function (value) { return !value })
  }

  function legacyCopy(value) {
    const area = document.createElement('textarea')
    area.value = value
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    try { document.execCommand('copy') } catch (error) { /* ignore */ }
    document.body.removeChild(area)
  }

  function handleCopy(action, messageIndex, actionIndex) {
    const key = messageIndex + '-' + actionIndex
    function done() {
      setCopiedKey(key)
      window.setTimeout(function () {
        setCopiedKey(function (current) { return current === key ? null : current })
      }, 1600)
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(action.value).then(done).catch(function () {
        legacyCopy(action.value)
        done()
      })
    } else {
      legacyCopy(action.value)
      done()
    }
  }

  async function sendQuestion(value) {
    const text = String(value || '').trim()
    if (!text || thinking) return
    const fallback = localReply(text)
    const history = messages.map(function (message) {
      return {
        role: message.role === 'user' ? 'user' : 'assistant',
        content: message.text
      }
    })

    setThinking(true)
    setMessages(function (list) {
      return list.concat([{ role: 'user', text: text, at: Date.now() }])
    })
    setDraft('')
    interactionRef.current = Date.now()

    const result = await askAdvisor({
      question: text,
      history,
      context: { page: pathname, mode: 'site-assistant' },
      fallbackReply: fallback.text
    })

    setThinking(false)
    setAdvisorState(result.source === 'model' ? 'online' : 'local')
    setMessages(function (list) {
      return list.concat([{
        role: 'bot',
        text: result.reply,
        at: Date.now(),
        actions: fallback.actions,
        source: result.source
      }])
    })
    interactionRef.current = Date.now()
  }

  function togglePeek() {
    setOpen(false)
    setBubble(false)
    setPeek(function (value) { return !value })
  }

  return (
    <Fragment>
      {bubble && !open && !dragging && !peek ? (
        <button
          type="button"
          className="carrot-mascot-bubble site-carrot-bubble"
          style={{ left: bubbleLeft + 'px', top: bubbleTop + 'px' }}
          onClick={function () {
            setBubble(false)
            setOpen(true)
          }}
        >
          <span className="mono">CARROT TIP</span>
          <span>{IDLE_PROMPTS[promptIndex]}</span>
          <span className="carrot-mascot-bubble-tail" aria-hidden="true" />
        </button>
      ) : null}

      <div
        className={
          'carrot-mascot site-carrot-mascot' +
          (!revealed ? ' is-waiting' : '') +
          (dragging ? ' is-dragging' : '') +
          (picked ? ' is-picked' : '') +
          (peek ? ' is-peek' : '') +
          (peek && peekLeft ? ' is-peek-left' : '') +
          (peek && !peekLeft ? ' is-peek-right' : '')
        }
        style={{
          left: pos.x + 'px',
          top: top + 'px',
          '--carrot-x': pos.x + 'px',
          '--carrot-y': top + 'px',
          '--carrot-center-x': 'calc(50vw - ' + (pos.x + mascotSize / 2) + 'px)',
          '--carrot-center-y': 'calc(50vh - ' + (top + mascotSize / 2) + 'px)',
          '--carrot-intro-x': 'calc(50vw - ' + (pos.x + mascotSize / 2) + 'px)',
          '--carrot-intro-y': 'calc(50vh - ' + (top + mascotSize + 166) + 'px)',
          '--carrot-peek-x': peekOffset.toFixed(1) + 'px'
        }}
        onPointerDown={onPointerDown}
        role="button"
        tabIndex={0}
        aria-label={open ? '收起小萝卜对话' : '打开小萝卜对话'}
        aria-expanded={open}
        onKeyDown={function (event) {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            toggleOpen()
          }
        }}
      >
        <span className="carrot-mascot-aura" aria-hidden="true" />
        <span className="carrot-mascot-badge">
          <CarrotMascot size={viewport.w <= 640 ? 62 : 78} />
          <span className="carrot-mascot-badge-glint" aria-hidden="true" />
        </span>
        <span className="carrot-mascot-cursor" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M5 3.5 18.2 11l-5.8 1.4-2.8 5.7z" />
          </svg>
        </span>
        <span className="carrot-mascot-name mono">小萝卜</span>
        <button
          type="button"
          className="carrot-mascot-hide"
          onPointerDown={function (event) { event.stopPropagation() }}
          onClick={function (event) {
            event.stopPropagation()
            togglePeek()
          }}
          aria-label={peek ? '回到页面' : '藏到墙边'}
          title={peek ? '回到页面' : '藏到墙边'}
        >
          {peek ? '↗' : '↖'}
        </button>
      </div>

      {open ? (
        <div
          className={'carrot-chat site-carrot-chat' + (isLab ? ' is-lab' : '')}
          style={{ left: panelLeft + 'px', top: panelTop + 'px' }}
          role="dialog"
          aria-label="小萝卜对话"
        >
          <div className="carrot-chat-head">
            <span className="carrot-chat-orb" aria-hidden="true">
              <span className="carrot-chat-orb-ring" />
              <CarrotMascot size={32} />
              <span className="carrot-chat-orb-spark">✦</span>
            </span>
            <div className="carrot-chat-title">
              <strong>
                小萝卜
                <em className="carrot-chat-ai-chip">AI</em>
              </strong>
              <span className={'mono carrot-chat-status is-' + advisorState}>
                <i aria-hidden="true" />
                {advisorState === 'online'
                  ? '在线 · 色彩灵感分身'
                  : advisorState === 'checking'
                    ? '连接中 · 灵感启动'
                    : '本地陪聊 · 离线模式'}
              </span>
            </div>
            <button
              type="button"
              className="carrot-chat-close"
              onClick={function () { setOpen(false) }}
              aria-label="关闭小萝卜对话"
            >
              ×
            </button>
          </div>
          <div className="carrot-chat-body">
            {messages.map(function (message, index) {
              const isUser = message.role === 'user'
              const timeLabel = formatChatTime(message.at)
              return (
                <Fragment key={message.role + index}>
                  <div className={'carrot-chat-row ' + (isUser ? 'is-user' : 'is-bot')}>
                    {!isUser ? (
                      <span className="carrot-chat-avatar is-bot" aria-hidden="true">
                        <CarrotMascot size={30} />
                      </span>
                    ) : null}
                    <div className="carrot-chat-stack">
                      <div
                        className={
                          'carrot-chat-msg ' +
                          (isUser ? 'is-user' : 'is-bot')
                        }
                      >
                        {message.text}
                      </div>
                      {message.actions ? (
                        <div className="carrot-chat-actions">
                          {message.actions.map(function (action, actionIndex) {
                            if (action.type === 'copy') {
                              const copied = copiedKey === index + '-' + actionIndex
                              return (
                                <button
                                  type="button"
                                  key={actionIndex}
                                  className={copied ? 'is-copied' : undefined}
                                  onClick={function () {
                                    handleCopy(action, index, actionIndex)
                                  }}
                                >
                                  {copied ? '✓ 已复制' : action.label}
                                </button>
                              )
                            }
                            if (action.type === 'link') {
                              return (
                                <Link key={actionIndex} to={action.to}>
                                  {action.label}
                                </Link>
                              )
                            }
                            return null
                          })}
                        </div>
                      ) : null}
                      {timeLabel ? (
                        <time className="carrot-chat-time" dateTime={new Date(message.at).toISOString()}>
                          {timeLabel}
                        </time>
                      ) : null}
                    </div>
                    {isUser ? (
                      <span className="carrot-chat-avatar is-user" aria-hidden="true">我</span>
                    ) : null}
                  </div>
                </Fragment>
              )
            })}
            {thinking ? (
              <div className="carrot-chat-row is-bot">
                <span className="carrot-chat-avatar is-bot" aria-hidden="true">
                  <CarrotMascot size={30} />
                </span>
                <div
                  className="carrot-chat-msg is-bot carrot-chat-thinking"
                  role="status"
                  aria-label="小萝卜正在回复"
                >
                  <i aria-hidden="true" />
                  <i aria-hidden="true" />
                  <i aria-hidden="true" />
                  <span>小萝卜正在想</span>
                </div>
              </div>
            ) : null}
            <div ref={messageEndRef} />
          </div>
          <div className="carrot-chat-chips">
            {QUICK_PROMPTS.map(function (item) {
              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={function () { sendQuestion(item.question) }}
                  disabled={thinking}
                >
                  {item.label}
                </button>
              )
            })}
          </div>
          <form
            className="carrot-chat-form"
            onSubmit={function (event) {
              event.preventDefault()
              sendQuestion(draft)
            }}
          >
            <label className="carrot-chat-input-shell">
              <span className="carrot-chat-input-spark" aria-hidden="true">✦</span>
              <input
                value={draft}
                onChange={function (event) { setDraft(event.target.value) }}
                placeholder="和小萝卜说点什么..."
                aria-label="和小萝卜说点什么"
                maxLength={2000}
              />
            </label>
            <button type="submit" disabled={thinking}>
              <span>{thinking ? '回复中' : '发送'}</span>
              <i aria-hidden="true">↗</i>
            </button>
          </form>
          <Link
            className="carrot-chat-lab"
            to="/tool"
            aria-current={isLab ? 'page' : undefined}
          >
            <span className="carrot-chat-lab-icon" aria-hidden="true">
              <CarrotMascot size={24} />
            </span>
            <strong>帮我穿</strong>
            <span className="carrot-chat-lab-arrow" aria-hidden="true">↗</span>
          </Link>
        </div>
      ) : null}
    </Fragment>
  )
}
