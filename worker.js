/**
 * worker.js — Cloudflare Worker 多提供商代理
 *
 * 支持：Google Gemini / Anthropic Claude / OpenAI GPT
 *
 * 部署步骤：
 * 1. https://dash.cloudflare.com → Workers & Pages → 创建Worker
 * 2. 粘贴此文件，修改 ALLOWED_ORIGINS
 * 3. 部署后将 Worker URL 填入工具的代理地址框
 */

const ALLOWED_ORIGINS = [
  'https://你的用户名.github.io',    // ← 改为你的 GitHub Pages 地址
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5500'
]

// 各提供商 API 端点
const UPSTREAM = {
  google:    (model) =>
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
  anthropic: () => 'https://api.anthropic.com/v1/messages',
  openai:    () => 'https://api.openai.com/v1/chat/completions'
}

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin') || ''

    // CORS 预检
    if (request.method === 'OPTIONS') {
      return corsResp(null, 204, origin)
    }

    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 })
    }

    // 来源校验
    if (ALLOWED_ORIGINS.length > 0 && !ALLOWED_ORIGINS.includes(origin)) {
      return corsResp(JSON.stringify({ error: 'Forbidden' }), 403, origin)
    }

    // 速率限制（需要 KV 绑定，可选）
    if (env.KV) {
      const ip  = request.headers.get('CF-Connecting-IP') || 'unknown'
      const key = `rl:${ip}:${Math.floor(Date.now() / 60000)}`
      const cnt = parseInt(await env.KV.get(key) || '0')
      if (cnt >= 20) {
        return corsResp(
          JSON.stringify({ error: { message: '请求过于频繁' } }),
          429, origin
        )
      }
      ctx.waitUntil(env.KV.put(key, String(cnt + 1), { expirationTtl: 60 }))
    }

    // 解析路由：/google/MODEL 或 /anthropic 或 /openai
    const url      = new URL(request.url)
    const segments = url.pathname.split('/').filter(Boolean)
    const provider = segments[0] || 'google'
    const model    = segments[1] || 'gemini-2.0-flash'

    let upstreamUrl
    if (provider === 'google') {
      const apiKey = request.headers.get('x-api-key') || ''
      upstreamUrl  = `${UPSTREAM.google(model)}?key=${apiKey}`
    } else if (provider === 'anthropic') {
      upstreamUrl  = UPSTREAM.anthropic()
    } else if (provider === 'openai') {
      upstreamUrl  = UPSTREAM.openai()
    } else {
      return corsResp(JSON.stringify({ error: 'Unknown provider' }), 400, origin)
    }

    try {
      const body = await request.text()

      // 构建上游请求头
      const upHeaders = { 'Content-Type': 'application/json' }

      if (provider === 'anthropic') {
        upHeaders['x-api-key']         = request.headers.get('x-api-key') || ''
        upHeaders['anthropic-version'] = request.headers.get('anthropic-version') || '2023-06-01'
        const beta = request.headers.get('anthropic-beta')
        if (beta) upHeaders['anthropic-beta'] = beta
      }

      if (provider === 'openai') {
        upHeaders['Authorization'] = request.headers.get('Authorization') || ''
      }

      const upRes  = await fetch(upstreamUrl, {
        method: 'POST',
        headers: upHeaders,
        body
      })

      const respBody = await upRes.text()
      return corsResp(respBody, upRes.status, origin)

    } catch (err) {
      return corsResp(
        JSON.stringify({ error: { message: `代理错误：${err.message}` } }),
        500, origin
      )
    }
  }
}

function corsResp(body, status, origin) {
  const allowed = ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin)
  const headers = {
    'Access-Control-Allow-Origin':  allowed ? (origin || '*') : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key, anthropic-version, anthropic-beta, Authorization',
    'Access-Control-Max-Age':       '86400',
    'Content-Type':                 'application/json'
  }
  return new Response(body, { status, headers })
}
