/**
 * parser.js
 * 文件解析器
 * 浏览器端 + Node.js 端
 */

// ── 浏览器端 ────────────────────────────

export function parseFileBrowser(file) {
  return new Promise((resolve, reject) => {
    const ext       = file.name.split('.').pop().toLowerCase()
    const supported = ['txt', 'md', 'markdown', 'html', 'htm', 'csv']

    if (!supported.includes(ext)) {
      reject(new Error(
        `暂不支持 .${ext} 格式\n` +
        `支持格式：TXT / Markdown / HTML / CSV\n` +
        `PDF 和 Word 请先另存为 TXT 后再上传`
      ))
      return
    }

    const reader = new FileReader()
    reader.onload = e => {
      let text = e.target.result
      if (ext === 'html' || ext === 'htm') text = stripHtml(text)
      if (ext === 'csv')  text = parseCsv(text)
      resolve(cleanText(text))
    }
    reader.onerror = () => reject(new Error('文件读取失败，请重试'))
    reader.readAsText(file, 'UTF-8')
  })
}

// ── Node.js 端 ──────────────────────────

export async function parseFileNode(filePath) {
  const { readFileSync } = await import('fs')
  const path = await import('path')

  const ext = path.extname(filePath).toLowerCase()
  const supported = ['.txt', '.md', '.markdown', '.html', '.htm', '.csv']

  if (!supported.includes(ext)) {
    throw new Error(
      `不支持的格式: ${ext}\n` +
      `支持: ${supported.join(', ')}\n` +
      `PDF/Word 请先导出为 TXT`
    )
  }

  let text = readFileSync(filePath, 'utf-8')

  if (ext === '.html' || ext === '.htm') {
    text = text
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi,  '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g,  ' ')
      .replace(/&amp;/g,   '&')
      .replace(/&lt;/g,    '<')
      .replace(/&gt;/g,    '>')
      .replace(/&quot;/g,  '"')
  }

  if (ext === '.csv') text = parseCsv(text)

  return cleanText(text)
}

// ── 工具函数 ─────────────────────────────

function stripHtml(html) {
  const div = document.createElement('div')
  div.innerHTML = html
  div.querySelectorAll('script,style,iframe,svg,noscript').forEach(el => el.remove())
  return div.innerText || div.textContent || ''
}

function parseCsv(text) {
  return text
    .split('\n')
    .map(row => row.split(',').map(cell => cell.replace(/^"|"$/g, '').trim()).join('  '))
    .join('\n')
}

function cleanText(text) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g,   '\n')
    .replace(/[\uff01-\uff5e]/g, c =>
      String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .replace(/\n{4,}/g, '\n\n\n')
    .replace(/[^\S\n]{2,}/g, ' ')
    .replace(/\u0000/g, '')
    .trim()
}
