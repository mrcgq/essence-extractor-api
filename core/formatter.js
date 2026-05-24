/**
 * formatter.js
 * 高保真报告格式化器
 * 输出 TXT 和 DOCX（零依赖，手写 OpenXML）
 */

// ══════════════════════════════════════
// TXT 格式化
// ══════════════════════════════════════

export function formatAsTxt(skeleton, essences, fileName) {
  const time = new Date().toLocaleString('zh-CN')
  const L    = []
  const hr1  = '═'.repeat(64)
  const hr2  = '─'.repeat(52)
  const hr3  = '·'.repeat(40)

  L.push(hr1)
  L.push('  高保真文档提炼报告')
  L.push(`  原始文件：${fileName}`)
  L.push(`  生成时间：${time}`)
  L.push(`  文档类型：${skeleton.documentType || '未知'}`)
  L.push(`  提取模型：双程高保真提取（全局骨架 + 局部细节）`)
  L.push(hr1)
  L.push('')

  // ── 第一部分：文档概览 ──
  L.push('▌ 第一部分：文档概览')
  L.push(hr2)
  L.push(`  核心主旨：${skeleton.title}`)
  L.push('')
  if (skeleton.documentThesis) {
    L.push(`  文档论点：${skeleton.documentThesis}`)
    L.push('')
  }
  if (skeleton.globalKeywords?.length > 0) {
    L.push(`  全局关键词：${skeleton.globalKeywords.join(' · ')}`)
    L.push('')
  }

  // ── 第二部分：全局结构 ──
  L.push('▌ 第二部分：全局语义结构')
  L.push(hr2)

  if (Array.isArray(skeleton.macroStructure)) {
    skeleton.macroStructure.forEach(item => {
      const indent = '  '.repeat(Math.max(0, (item.level || 1) - 1))
      const sym    = item.level === 1 ? '◆' : item.level === 2 ? '▶' : '  ▷'
      L.push(`${indent}${sym} [${item.sectionIndex}] ${item.heading}`)
      if (item.summary) L.push(`${indent}     主旨：${item.summary}`)
      if (item.keyTopics?.length > 0) {
        L.push(`${indent}     核心主题：${item.keyTopics.join(' | ')}`)
      }
      const tags = []
      if (item.containsDefinitions) tags.push('含定义')
      if (item.containsRules)       tags.push('含规则')
      if (item.containsData)        tags.push('含数据')
      if (tags.length > 0) L.push(`${indent}     标签：[${tags.join('] [')}]`)
      L.push('')
    })
  }

  // ── 第三部分：高保真细节 ──
  L.push('▌ 第三部分：高保真细节规约')
  L.push(hr2)

  essences.forEach((section, sIdx) => {
    L.push('')
    L.push(`◆ 章节 ${section.sectionIndex || sIdx + 1}：${section.heading || '未命名'}`)
    if (section.chunkSummary) {
      L.push(`  片段摘要：${section.chunkSummary}`)
    }
    L.push(hr3)

    // 核心规则
    if (Array.isArray(section.coreRules) && section.coreRules.length > 0) {
      L.push('')
      L.push('  【核心规则】')
      section.coreRules.forEach((r, i) => {
        L.push(`    ${i + 1}. ${r.rule}`)
        if (r.condition)  L.push(`       条件：${r.condition}`)
        if (r.exception)  L.push(`       例外：${r.exception}`)
      })
    }

    // 禁止项（高优先级单独展示）
    if (Array.isArray(section.forbiddenItems) && section.forbiddenItems.length > 0) {
      L.push('')
      L.push('  【明确禁止项】')
      section.forbiddenItems.forEach((f, i) => {
        L.push(`    ✗ ${i + 1}. ${f.item}`)
        if (f.scope)       L.push(`         范围：${f.scope}`)
        if (f.consequence) L.push(`         后果：${f.consequence}`)
      })
    }

    // 关键数据
    if (Array.isArray(section.keyData) && section.keyData.length > 0) {
      L.push('')
      L.push('  【关键数据】')
      section.keyData.forEach((d, i) => {
        const unit = d.unit ? ` ${d.unit}` : ''
        L.push(`    📊 ${i + 1}. ${d.dataPoint}${unit}`)
        if (d.context) L.push(`         说明：${d.context}`)
      })
    }

    // 核心概念详解
    if (Array.isArray(section.essences) && section.essences.length > 0) {
      L.push('')
      L.push('  【核心概念详解】')

      section.essences.forEach((item, idx) => {
        L.push('')
        L.push(`    ${idx + 1}. ${item.importance || '⭐⭐'} 【${item.coreConcept}】`)

        if (item.originalText) {
          L.push(`       原文：「${item.originalText}」`)
        }
        if (item.detailDescription) {
          L.push(`       详解：${item.detailDescription}`)
        }

        const b = item.boundaryFiveElements
        if (b) {
          L.push('       五要素边界：')
          if (b.subject      && b.subject      !== '原文未明确') L.push(`         ├ 主体   ：${b.subject}`)
          if (b.constraints  && b.constraints  !== '原文未明确') L.push(`         ├ 约束   ：${b.constraints}`)
          if (b.exclusions   && b.exclusions   !== '原文未明确') L.push(`         ├ 禁止   ：${b.exclusions}`)
          if (b.ownership    && b.ownership    !== '原文未明确') L.push(`         ├ 权责   ：${b.ownership}`)
          if (b.timeline     && b.timeline     !== '原文未明确') L.push(`         └ 时效   ：${b.timeline}`)
        }

        if (item.relatedConcepts?.length > 0) {
          L.push(`       关联：${item.relatedConcepts.join(' · ')}`)
        }
      })
    }

    L.push('')
  })

  L.push(hr1)
  const reportLen = L.join('\n').length
  L.push(`  原文字符数：${essences.length > 0 ? '（见原始文件）' : '—'}`)
  L.push(`  报告字符数：${reportLen.toLocaleString()}`)
  L.push('  End of Report')
  L.push(hr1)

  return L.join('\n')
}

// ══════════════════════════════════════
// DOCX 格式化（手写 OpenXML + ZIP）
// ══════════════════════════════════════

export function formatAsDocx(reportText) {
  const xml = buildDocumentXml(reportText)
  return buildZip(xml)
}

function escapeXml(str) {
  return String(str ?? '')
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
}

function buildDocumentXml(text) {
  const paras = text.split('\n').map(line => lineToPara(line))
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${paras.join('\n    ')}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1800" w:bottom="1440" w:left="1800"/>
    </w:sectPr>
  </w:body>
</w:document>`
}

function lineToPara(line) {
  const e = escapeXml(line)
  if (!line.trim()) {
    return `<w:p><w:pPr><w:spacing w:after="80"/></w:pPr></w:p>`
  }
  if (/^[═]+$/.test(line.trim())) {
    return wp(e, { color: '94A3B8', after: 40 })
  }
  if (line.includes('高保真文档提炼报告')) {
    return wp(e, { bold: true, size: 32, color: '1E3A8A', align: 'center', after: 200 })
  }
  if (/^▌ 第.部分/.test(line)) {
    return wp(e, { bold: true, size: 28, color: '1E40AF', before: 300, after: 120 })
  }
  if (/^◆ 章节/.test(line)) {
    return wp(e, { bold: true, size: 24, color: '1D4ED8', before: 240, after: 80 })
  }
  if (/^\s+【.+】/.test(line)) {
    return wp(e, { bold: true, color: '7C3AED', before: 160, after: 60 })
  }
  if (/^\s+✗/.test(line)) {
    return wp(e, { color: 'DC2626', after: 50 })
  }
  if (/^\s+📊/.test(line)) {
    return wp(e, { color: '059669', after: 50 })
  }
  if (/[├└]/.test(line)) {
    return wp(e, { color: '4B5563', size: 18, after: 40 })
  }
  return wp(e, { after: 60 })
}

function wp(text, opts = {}) {
  const {
    bold   = false,
    size   = 21,
    color  = '000000',
    align  = 'left',
    before = 0,
    after  = 60
  } = opts

  const rPr = [
    bold ? '<w:b/>' : '',
    size !== 21 ? `<w:sz w:val="${size}"/>` : '',
    color !== '000000' ? `<w:color w:val="${color}"/>` : ''
  ].filter(Boolean).join('')

  return `<w:p>
      <w:pPr>
        <w:jc w:val="${align}"/>
        <w:spacing w:before="${before}" w:after="${after}"/>
      </w:pPr>
      <w:r>${rPr ? `<w:rPr>${rPr}</w:rPr>` : ''}
        <w:t xml:space="preserve">${text}</w:t>
      </w:r>
    </w:p>`
}

function buildZip(documentXml) {
  const files = {
    '[Content_Types].xml':
`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml"
    ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
    '_rels/.rels':
`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1"
    Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument"
    Target="word/document.xml"/>
</Relationships>`,
    'word/_rels/document.xml.rels':
`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`,
    'word/document.xml': documentXml
  }
  return zipFiles(files)
}

function zipFiles(files) {
  const enc = new TextEncoder()
  const locals = [], central = []
  let offset = 0

  for (const [name, content] of Object.entries(files)) {
    const nb = enc.encode(name)
    const db = enc.encode(content)
    const crc = crc32(db)

    const lh = new Uint8Array(30 + nb.length)
    const lv = new DataView(lh.buffer)
    lv.setUint32(0,  0x04034b50, true)
    lv.setUint16(4,  20, true)
    lv.setUint16(6,  0,  true)
    lv.setUint16(8,  0,  true)
    lv.setUint16(10, 0,  true)
    lv.setUint16(12, 0,  true)
    lv.setUint32(14, crc,       true)
    lv.setUint32(18, db.length, true)
    lv.setUint32(22, db.length, true)
    lv.setUint16(26, nb.length, true)
    lv.setUint16(28, 0,         true)
    lh.set(nb, 30)
    locals.push(lh, db)

    const cd = new Uint8Array(46 + nb.length)
    const cv = new DataView(cd.buffer)
    cv.setUint32(0,  0x02014b50, true)
    cv.setUint16(4,  20, true)
    cv.setUint16(6,  20, true)
    cv.setUint16(8,  0,  true)
    cv.setUint16(10, 0,  true)
    cv.setUint16(12, 0,  true)
    cv.setUint16(14, 0,  true)
    cv.setUint32(16, crc,       true)
    cv.setUint32(20, db.length, true)
    cv.setUint32(24, db.length, true)
    cv.setUint16(28, nb.length, true)
    cv.setUint16(30, 0,  true)
    cv.setUint16(32, 0,  true)
    cv.setUint16(34, 0,  true)
    cv.setUint16(36, 0,  true)
    cv.setUint32(38, 0,  true)
    cv.setUint32(42, offset, true)
    cd.set(nb, 46)
    central.push(cd)
    offset += lh.length + db.length
  }

  const cdSize = central.reduce((s, c) => s + c.length, 0)
  const eocd = new Uint8Array(22)
  const ev = new DataView(eocd.buffer)
  ev.setUint32(0,  0x06054b50,     true)
  ev.setUint16(4,  0,              true)
  ev.setUint16(6,  0,              true)
  ev.setUint16(8,  central.length, true)
  ev.setUint16(10, central.length, true)
  ev.setUint32(12, cdSize,         true)
  ev.setUint32(16, offset,         true)
  ev.setUint16(20, 0,              true)

  const parts = [...locals, ...central, eocd]
  const total = parts.reduce((s, p) => s + p.length, 0)
  const out   = new Uint8Array(total)
  let   pos   = 0
  for (const p of parts) { out.set(p, pos); pos += p.length }
  return out
}

function crc32(data) {
  const t = crcTable()
  let c = 0xFFFFFFFF
  for (let i = 0; i < data.length; i++) c = (c >>> 8) ^ t[(c ^ data[i]) & 0xFF]
  return (c ^ 0xFFFFFFFF) >>> 0
}

function crcTable() {
  if (crcTable._t) return crcTable._t
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
    t[i] = c
  }
  crcTable._t = t
  return t
}
