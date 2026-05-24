#!/usr/bin/env node
/**
 * cli.js — 命令行入口（纯本地，零CORS问题）
 *
 * 用法：
 *   node cli.js --file=文档.txt --provider=google --key=AIza...
 *   node cli.js --file=文档.txt --provider=anthropic --key=sk-ant-...
 *   node cli.js --file=文档.txt --provider=openai --key=sk-...
 *
 * 环境变量（更安全）：
 *   GOOGLE_API_KEY / ANTHROPIC_API_KEY / OPENAI_API_KEY
 */

import { writeFileSync } from 'fs'
import { resolve, basename } from 'path'
import { Extractor }      from './core/extractor.js'
import { parseFileNode }  from './core/parser.js'

// ── 参数解析 ──────────────────────────
const args = {}
for (const arg of process.argv.slice(2)) {
  if (arg.startsWith('--')) {
    const eqIdx = arg.indexOf('=')
    if (eqIdx > 0) {
      args[arg.slice(2, eqIdx)] = arg.slice(eqIdx + 1)
    } else {
      args[arg.slice(2)] = true
    }
  }
}

// ── 帮助信息 ──────────────────────────
if (args.help || args.h || !args.file) {
  console.log(`
🔬 高保真文档提炼器 · CLI版

用法：
  node cli.js --file=文件路径 [选项]

必选：
  --file=路径          要处理的文件（支持 TXT/MD/HTML/CSV）

提供商（三选一）：
  --provider=google    使用 Google Gemini（默认）
  --provider=anthropic 使用 Anthropic Claude
  --provider=openai    使用 OpenAI GPT

API Key（或用环境变量）：
  --key=YOUR_KEY
  环境变量：GOOGLE_API_KEY / ANTHROPIC_API_KEY / OPENAI_API_KEY

模型选择（可选）：
  --model=gemini-2.0-flash         （Google，默认）
  --model=gemini-1.5-pro           （Google，超长文档）
  --model=claude-3-5-sonnet-20241022（Anthropic）
  --model=gpt-4o                   （OpenAI）

输出：
  --format=txt         输出 TXT（默认）
  --format=docx        输出 Word 文档
  --proxy=URL          代理地址（可选）

示例：
  node cli.js --file=./report.txt --provider=google --key=AIza...
  node cli.js --file=./report.md  --provider=google --format=docx
  GOOGLE_API_KEY=AIza... node cli.js --file=./doc.txt
`)
  process.exit(0)
}

// ── API Key 获取 ──────────────────────
const provider = args.provider || 'google'

const keyMap = {
  google:    args.key || process.env.GOOGLE_API_KEY    || '',
  anthropic: args.key || process.env.ANTHROPIC_API_KEY || '',
  openai:    args.key || process.env.OPENAI_API_KEY    || ''
}

const apiKey = keyMap[provider]
if (!apiKey) {
  console.error(`❌ 错误：缺少 ${provider} 的 API Key`)
  console.error(`   方式1：--key=YOUR_API_KEY`)
  const envNames = { google:'GOOGLE_API_KEY', anthropic:'ANTHROPIC_API_KEY', openai:'OPENAI_API_KEY' }
  console.error(`   方式2：export ${envNames[provider]}=YOUR_KEY`)
  process.exit(1)
}

const modelDefaults = {
  google:    'gemini-2.0-flash',
  anthropic: 'claude-3-5-sonnet-20241022',
  openai:    'gpt-4o'
}

const model    = args.model  || modelDefaults[provider]
const format   = args.format || 'txt'
const filePath = resolve(args.file)
const fileName = basename(filePath)
const proxy    = args.proxy  || null

// ── 主流程 ────────────────────────────
console.log(`\n🔬 高保真文档提炼器 · CLI`)
console.log('─'.repeat(50))
console.log(`  文件：${filePath}`)
console.log(`  提供商：${provider}`)
console.log(`  模型：${model}`)
console.log(`  输出：${format.toUpperCase()}`)
if (proxy) console.log(`  代理：${proxy}`)
console.log('─'.repeat(50) + '\n')

async function main() {
  try {
    // 读取文件
    console.log('📂 正在读取文件...')
    const text = await parseFileNode(filePath)
    const charCount = text.length
    console.log(`✓ 读取完成，共 ${charCount.toLocaleString()} 字符\n`)

    if (charCount < 50) {
      throw new Error('文件内容过少（不足50字），请确认文件有实际内容')
    }

    // 初始化提取器
    const extractor = new Extractor({ apiKey, model, provider, proxyUrl: proxy })

    // 执行提取
    const result = await extractor.extract(text, fileName, ({ progress, message }) => {
      const filled = Math.floor(progress / 5)
      const bar    = '█'.repeat(filled) + '░'.repeat(20 - filled)
      process.stdout.write(`\r  [${bar}] ${String(progress).padStart(3)}%  ${message}          `)
      if (progress === 100) process.stdout.write('\n')
    })

    // 输出文件
    const outBase = filePath.replace(/\.[^/.]+$/, '')

    if (format === 'docx') {
      const outPath = outBase + '_高保真提炼.docx'
      writeFileSync(outPath, result.docx)
      console.log(`\n✅ Word 文档已生成：${outPath}`)
    } else {
      const outPath = outBase + '_高保真提炼.txt'
      writeFileSync(outPath, result.txt, 'utf-8')
      console.log(`\n✅ TXT 文件已生成：${outPath}`)
    }

    // 预览
    console.log('\n' + '─'.repeat(50))
    console.log('预览（前600字）：')
    console.log('─'.repeat(50))
    console.log(result.txt.slice(0, 600))
    if (result.txt.length > 600) console.log('\n...(更多内容请查看输出文件)')

  } catch (err) {
    console.error(`\n❌ 错误：${err.message}`)
    if (err.message.includes('API')) {
      console.error('   提示：请检查 API Key 是否有效，以及账户是否有足够额度')
    }
    process.exit(1)
  }
}

main()
