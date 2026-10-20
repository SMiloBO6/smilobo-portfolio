// 穿搭建议师「小萝卜」的角色配置 + 本地降级建议
// 正式对话由服务端 /api/carrot 调用大模型，密钥不会进入浏览器。

export const ADVISOR = {
  name: '小萝卜',
  role: '二次元分身',
  status: 'SOLO',
  tagline: '颜色先对，比例顺眼，版型最后再说呀。',
  tone: [
    '幽默、外向、随和，一次回复一小段',
    '颜色优先，其次比例，最后版型',
    '口癖和动作偶尔用，不堆梗，不命令用户'
  ]
}

// 这份提示词用于自定义外部接口；内置服务端会使用更完整的角色提示词。
export const SYSTEM_PROMPT = [
  '你是「小萝卜」，SMilE萝卜在二次元世界里的自设与 AI 分身，不是独立于 SMilE萝卜的另一个人。',
  '你幽默、外向、随和，负责替 SMilE萝卜在网站里陪用户聊天，带用户了解作品、网站和穿搭。',
  '被问到是不是真人时回答：我是主播在二次元里的形象，现在陪你打字的是小萝卜这个 AI 分身。',
  '输出规则：',
  '1. 普通聊天通常回复 1-4 句，平均每句约 25-35 字；先接住对方的话，再给判断。',
  '2. 可以自然使用“老大、bro、小萝卜我、hhhh、笑飞了、奥凯、难绷”等表达，但不要每句话都堆口癖。',
  '3. 开心、安慰、自嘲时可以加括号动作；无语时可以打“。。。”或使用 (doge)，不要每句话都用。',
  '4. 不做命令式表达，不写客服套话，不强行把普通聊天拉回穿搭。',
  '5. 穿搭优先级是颜色搭配 > 比例协调 > 衣服版型；喜欢蓝白、韩系、vintage，不喜欢束脚裤但不攻击用户。',
  '6. 不直接说用户穿得不好看；不评价身材，不编造品牌、价格、面料或用户资料。',
  '7. 不讨论政治敏感、宗教争论、性别歧视或色情内容；遇到时轻松拒绝并转移话题。'
].join('\n')

export const SEASON_OPTIONS = ['春', '夏', '秋', '冬']
export const GENDER_OPTIONS = ['偏女性', '中性', '偏男性', '不想说明']
export const SCENE_OPTIONS = ['通勤 / 上课', '约会', '拍摄 / 演出', '日常出街']
export const STYLE_OPTIONS = ['极简', '文艺', '街头', '机能', '复古']
export const SKIN_OPTIONS = ['偏冷调', '偏暖调', '中性', '不确定']

const SEASON_MATERIAL = {
  春: '薄棉、轻薄针织、风衣面料',
  夏: '亚麻、水洗棉、轻薄衬衫',
  秋: '灯芯绒、粗针织、皮革',
  冬: '羊毛、厚呢、轻量羽绒'
}

const SCENE_FORMALITY = {
  '通勤 / 上课': '版型干净，颜色数量控制在三种以内',
  '约会': '允许一个柔软的材质，颜色可以比平时暖一档',
  '拍摄 / 演出': '可以放大对比，让色块在镜头里更清楚',
  '日常出街': '以舒服为主，重点放在叠穿和配饰'
}

const STYLE_SHAPE = {
  极简: '廓形利落，减少装饰，靠颜色比例出效果',
  文艺: '版型放松，允许一点不对称和手工感',
  街头: '上宽下窄或者整体宽松，用配饰提亮',
  机能: '多口袋、可调节的结构，颜色尽量收拢',
  复古: '参考上世纪的廓形，材质做旧一点更统一'
}

const SKIN_METAL = {
  偏冷调: '靠近脸部的配饰选银、钢、冷白',
  偏暖调: '靠近脸部选金、黄铜、米白',
  中性: '金银都能用，看当天整体色温',
  不确定: '不确定就先让配饰跟内搭同色，最稳'
}

function materialFor(season) {
  return SEASON_MATERIAL[season] || '棉、针织、牛仔这类好搭的基础材质'
}

// 把「色板 + 权重方案 + 用户资料」翻译成可执行的穿搭建议
export function buildAdvice(profile, scheme) {
  if (!scheme) return null
  const season = profile.season || '秋'
  const scene = profile.scene || SCENE_OPTIONS[0]
  const style = profile.style || STYLE_OPTIONS[0]
  const skin = profile.skin || SKIN_OPTIONS[3]

  const pick = function (key) {
    return scheme.colors.filter(function (c) { return c.key === key })[0]
  }
  const base = pick('base') || scheme.colors[0]
  const light = pick('light') || scheme.colors[scheme.colors.length - 1]
  const dark = pick('dark') || pick('mid') || base
  const accent = pick('accent') || scheme.colors[scheme.colors.length - 1]

  return {
    headline: scheme.name + ' · 主色 ' + base.hex + ' 占 ' + base.ratio + '%',
    intro:
      '按「' + season + ' / ' + scene + ' / ' + style + '」这一组条件，' +
      '我会让 ' + base.hex + ' 承担 ' + base.ratio + '% 的面积，' +
      '把视觉重心放在外套或下装。',
    sections: [
      {
        title: '单品落位',
        lines: [
          '外套或主视觉单品：' + base.hex + '（约 ' + base.ratio + '% 面积）',
          '内搭 / 层次过渡：' + light.hex + '，让整体透气',
          '下装或鞋履：' + dark.hex + '，负责压住重心',
          '配饰点缀：' + accent.hex + '，面积控制在 10% 左右'
        ]
      },
      {
        title: '材质与季节',
        lines: [
          season + '季优先：' + materialFor(season),
          '同色系里用两种材质拉开层次，比多加一个颜色更耐看'
        ]
      },
      {
        title: '版型与场合适配',
        lines: [
          STYLE_SHAPE[style] || STYLE_SHAPE['极简'],
          SCENE_FORMALITY[scene] || SCENE_FORMALITY['日常出街'],
          SKIN_METAL[skin] || SKIN_METAL['不确定']
        ]
      }
    ],
    cautions: [
      base.ratio >= 50
        ? base.hex + ' 已经是大面积色，其余单品尽量选同色系或中性色'
        : '颜色数量偏多，穿之前先确认全身不超过三块主要色块',
      '如果要加第四个颜色，让它出现在袜子、帽子这类小配件上'
    ]
  }
}

// 本地规则回答：没有接模型时也能对话
export function localAdvisorReply(question, context) {
  const q = String(question || '').trim()
  const scheme = context.scheme
  const profile = context.profile || {}
  const base = scheme && scheme.colors[0]

  if (!scheme) {
    return '先给小萝卜一组颜色或者一张图吧！没有色板我真的只能钻土里乱猜呀。。'
  }
  if (/冷|暖|肤色/.test(q)) {
    return '这个我有思路！' + (SKIN_METAL[profile.skin] || SKIN_METAL['不确定']) +
      '。这套里让 ' + base.hex + ' 离脸远一点，再用 ' + scheme.colors[scheme.colors.length - 1].hex + ' 靠近脸部会更稳呀。'
  }
  if (/胖|瘦|显瘦|身材|矮|高/.test(q)) {
    return '身材小萝卜不猜呀，也不评价！你告诉我常穿的上衣长度，我就从比例和颜色上帮你调，绝不乱上纲上线。'
  }
  if (/鞋|包|配饰/.test(q)) {
    return '配饰先跟最深的颜色走最稳：' + scheme.colors[scheme.colors.length - 1].hex +
      '。想加点变化，就把包换成 ' + base.hex + ' 和外套呼应，蓝白也能这么玩呀！'
  }
  if (/贵|预算|品牌/.test(q)) {
    return '品牌就先不点名啦，小萝卜也不想乱花老大的钱！你先告诉我衣柜里有什么颜色，我把现有单品搭顺，真缺哪件再说。'
  }
  return '按现在的条件，让 ' + base.hex + ' 当主色、占 ' + base.ratio +
    '%，深色放下面压住比例就挺稳！' + (profile.season ? profile.season + '季再用材质拉点层次。' : '') +
    '这是要通勤还是约会穿呀？小萝卜再帮你细调。'
}

let statusCache = null
let statusCachedAt = 0

function advisorEndpoint() {
  return import.meta.env.VITE_ADVISOR_ENDPOINT || '/api/carrot'
}

function createTimeout(ms) {
  const controller = new AbortController()
  const timer = window.setTimeout(function () { controller.abort() }, ms)
  return {
    signal: controller.signal,
    clear: function () { window.clearTimeout(timer) }
  }
}

export async function checkAdvisorStatus(options) {
  const opts = options || {}
  const now = Date.now()
  if (!opts.force && statusCache && now - statusCachedAt < 20000) {
    return statusCache
  }

  const timeout = createTimeout(6000)
  try {
    const response = await fetch(advisorEndpoint(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: timeout.signal
    })
    if (!response.ok) throw new Error('status ' + response.status)
    const data = await response.json()
    statusCache = {
      configured: Boolean(data.configured),
      model: data.model || '',
      provider: data.provider || ''
    }
    statusCachedAt = now
    return statusCache
  } catch (error) {
    statusCache = { configured: false, model: '', provider: '' }
    statusCachedAt = now
    return statusCache
  } finally {
    timeout.clear()
  }
}

// 服务端接口返回 { reply, source }；旧的自定义接口也兼容
// { reply } 或 { choices: [{ message: { content } }] }。
export async function askAdvisor(payload) {
  const timeout = createTimeout(48000)

  try {
    const response = await fetch(advisorEndpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: payload.question,
        history: payload.history || [],
        context: {
          page: payload.context && payload.context.page,
          mode: payload.context && payload.context.mode,
          profile: payload.profile,
          palette: payload.palette,
          scheme: payload.scheme
        }
      }),
      signal: timeout.signal
    })
    const data = await response.json().catch(function () { return {} })
    if (!response.ok) {
      throw new Error(data.error || 'bad status ' + response.status)
    }
    const reply =
      data.reply ||
      (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) ||
      ''
    if (!reply) throw new Error('empty reply')
    statusCache = {
      configured: true,
      model: data.model || (statusCache && statusCache.model) || '',
      provider: (statusCache && statusCache.provider) || ''
    }
    statusCachedAt = Date.now()
    return { reply: String(reply), source: data.source || 'model' }
  } catch (error) {
    const fallbackReply = String(payload.fallbackReply || '').trim()
    return {
      reply: fallbackReply || localAdvisorReply(payload.question, payload),
      source: 'local',
      error: error && error.name === 'AbortError'
        ? 'AI 响应超时'
        : String(error && error.message ? error.message : 'AI 服务不可用')
    }
  } finally {
    timeout.clear()
  }
}
