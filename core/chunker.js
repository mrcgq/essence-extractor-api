/**
 * chunker.js
 * 智能切片器
 * 根据模型上下文窗口自适应调整切片大小
 */

import { MODEL_CONFIGS } from './prompts.js'

// 模型上下文窗口 → 切片字符数映射
// 保守估算：为系统提示词和输出预留 50% 空间
// 中文：约1字 = 1.5 token
function getMaxChunkChars(model) {
  const cfg = MODEL_CONFIGS[model]
  if (!cfg) return 8000

  const contextWindow = cfg.contextWindow
  // 可用于输入内容的 token 数（保留50%给系统提示+输出）
  const availableTokens = contextWindow * 0.4
  // token 转字符（中文约1.2字/token）
  const chars = Math.floor(availableTokens * 1.2)
  // 上限 50000 字，下限 6000 字
  return Math.min(Math.max(chars, 6000), 50000)
}

export function chunkText(content, model = 'gemini-2.0-flash') {
  const MAX_CHARS = getMaxChunkChars(model)

  // 优先级切割点（从高到低）
  // 1. 双空行（段落分隔）
  // 2. 单空行
  // 3. 句子结束符
  // 4. 强制截断

  const paragraphs = content.split(/\n\n+/)
  const chunks     = []
  let   current    = ''

  for (const para of paragraphs) {
    // 单段落超过限制：按句子切割
    if (para.length > MAX_CHARS) {
      if (current.trim()) {
        chunks.push(current.trim())
        current = ''
      }
      const subChunks = splitBySentence(para, MAX_CHARS)
      chunks.push(...subChunks)
      continue
    }

    const candidate = current ? current + '\n\n' + para : para

    if (candidate.length > MAX_CHARS && current.length > 0) {
      chunks.push(current.trim())
      current = para
    } else {
      current = candidate
    }
  }

  if (current.trim()) chunks.push(current.trim())

  return chunks.filter(c => c.replace(/\s/g, '').length > 10)
}

function splitBySentence(text, maxChars) {
  const result   = []
  const sentences = text
    .replace(/([。！？!?…]+)/g, '$1\n')
    .replace(/([；;])/g, '$1\n')
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean)

  let current = ''
  for (const sent of sentences) {
    if ((current + sent).length > maxChars && current.length > 0) {
      result.push(current.trim())
      current = sent
    } else {
      current += (current ? ' ' : '') + sent
    }
  }
  if (current.trim()) result.push(current.trim())

  // 如果句子本身太长，强制截断
  const final = []
  for (const chunk of result) {
    if (chunk.length <= maxChars) {
      final.push(chunk)
    } else {
      for (let i = 0; i < chunk.length; i += maxChars) {
        final.push(chunk.slice(i, i + maxChars))
      }
    }
  }

  return final
}
