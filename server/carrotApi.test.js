import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildCarrotInstructions,
  getCarrotConfig,
  requestCarrot
} from './carrotApi.js'

const configuredEnv = {
  OPENAI_API_KEY: 'test-key',
  OPENAI_MODEL: 'test-model',
  OPENAI_BASE_URL: 'https://example.test/v1'
}

test('reports that the model is unavailable without a server-side key', async function () {
  const config = getCarrotConfig({})
  assert.equal(config.configured, false)

  await assert.rejects(
    requestCarrot(
      { question: '你叫什么名字？' },
      { env: {}, fetchImpl: function () { throw new Error('should not run') } }
    ),
    function (error) {
      return error.code === 'model_not_configured' && error.status === 503
    }
  )
})

test('includes identity, broad conversation, and scheme context in instructions', function () {
  const instructions = buildCarrotInstructions({
    page: '/tool',
    scheme: {
      name: '稳定方案',
      colors: [{ hex: '#CC4B0D', role: '主色', ratio: 60 }]
    }
  })

  assert.match(instructions, /你叫小萝卜/)
  assert.match(instructions, /自然聊天/)
  assert.match(instructions, /幽默、外向、随和/)
  assert.match(instructions, /颜色搭配 > 比例协调 > 衣服版型/)
  assert.match(instructions, /主播在二次元里的形象/)
  assert.match(instructions, /默认只回 1-2 句/)
  assert.match(instructions, /不要写成客服答复/)
  assert.match(instructions, /人格优先/)
  assert.match(instructions, /作品（\/works）、专辑陈列（\/waterfall）、帮我穿（\/tool）、关于（\/about）/)
  assert.match(instructions, /不要使用“黑胶瀑布流”“AI 色彩实验室”等旧名称/)
  assert.match(instructions, /#CC4B0D/)
})

test('calls the Responses API with history and extracts output text', async function () {
  let request = null
  const result = await requestCarrot(
    {
      question: '那你平时都做什么？',
      history: [{ role: 'user', content: '你叫什么名字？' }],
      context: { page: '/works' }
    },
    {
      env: configuredEnv,
      fetchImpl: async function (url, options) {
        request = { url, options, body: JSON.parse(options.body) }
        return {
          ok: true,
          async json() {
            return {
              output: [{
                type: 'message',
                content: [{ type: 'output_text', text: '我叫小萝卜，平时会帮大家看穿搭，也能随便聊聊。' }]
              }]
            }
          }
        }
      }
    }
  )

  assert.equal(request.url, 'https://example.test/v1/responses')
  assert.equal(request.options.headers.Authorization, 'Bearer test-key')
  assert.equal(request.body.model, 'test-model')
  assert.deepEqual(request.body.input.at(-1), {
    role: 'user',
    content: '那你平时都做什么？'
  })
  assert.match(request.body.instructions, /你叫小萝卜/)
  assert.match(request.body.instructions, /小萝卜人格设定/)
  assert.equal(result.source, 'model')
  assert.match(result.reply, /我叫小萝卜/)
})

test('supports OpenAI-compatible Chat Completions providers', async function () {
  let request = null
  const result = await requestCarrot(
    { question: '你好' },
    {
      env: Object.assign({}, configuredEnv, { OPENAI_API_STYLE: 'chat_completions' }),
      fetchImpl: async function (url, options) {
        request = { url, body: JSON.parse(options.body) }
        return {
          ok: true,
          async json() {
            return { choices: [{ message: { content: '你好，我是小萝卜。' } }] }
          }
        }
      }
    }
  )

  assert.equal(request.url, 'https://example.test/v1/chat/completions')
  assert.equal(request.body.messages[0].role, 'system')
  assert.equal(request.body.messages.at(-1).content, '你好')
  assert.equal(result.reply, '你好，我是小萝卜。')
})
