type PdfFontKey = 'regular' | 'bold'

type PdfTextOp = {
  type: 'text'
  x: number
  y: number
  size: number
  font: PdfFontKey
  text: string
  color?: [number, number, number]
}

type PdfRectOp = {
  type: 'rect'
  x: number
  y: number
  width: number
  height: number
  fill?: [number, number, number]
  stroke?: [number, number, number]
  lineWidth?: number
}

type PdfLineOp = {
  type: 'line'
  x1: number
  y1: number
  x2: number
  y2: number
  color?: [number, number, number]
  lineWidth?: number
}

type PdfPage = {
  ops: Array<PdfTextOp | PdfRectOp | PdfLineOp>
}

type ReportSection = {
  title: string
  items: string[]
}

const PAGE_WIDTH = 612
const PAGE_HEIGHT = 842

const MARGIN_X = 44
const TOP_MARGIN = 42
const BOTTOM_MARGIN = 42
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2

const COLORS = {
  bg: [0.97, 0.99, 0.98] as [number, number, number],
  headerGreen: [0.10, 0.55, 0.33] as [number, number, number],
  headerGreenDark: [0.06, 0.40, 0.24] as [number, number, number],
  accentSoft: [0.88, 0.96, 0.91] as [number, number, number],
  cardFill: [1, 1, 1] as [number, number, number],
  cardBorder: [0.82, 0.92, 0.86] as [number, number, number],
  text: [0.12, 0.16, 0.14] as [number, number, number],
  textMuted: [0.38, 0.45, 0.41] as [number, number, number],
  bullet: [0.13, 0.60, 0.34] as [number, number, number],
  divider: [0.86, 0.92, 0.88] as [number, number, number],
}

function escapePdfText(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2022\u25CF\u25E6]/g, '-')
    .replace(/\u00A0/g, ' ')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
}

function rgb(color: [number, number, number]) {
  return `${color[0].toFixed(3)} ${color[1].toFixed(3)} ${color[2].toFixed(3)}`
}

function averageCharWidth(fontSize: number, isBold = false) {
  return fontSize * (isBold ? 0.56 : 0.53)
}

function wrapText(text: string, maxWidth: number, fontSize: number, isBold = false) {
  const clean = text.trim().replace(/\s+/g, ' ')
  if (!clean) return ['']

  const words = clean.split(' ')
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    const candidateWidth = candidate.length * averageCharWidth(fontSize, isBold)

    if (candidateWidth <= maxWidth || !current) {
      current = candidate
    } else {
      lines.push(current)
      current = word
    }
  }

  if (current) lines.push(current)
  return lines
}

function parseReport(lines: string[]) {
  const cleaned = lines.map((line) => line.trimEnd())

  const title = cleaned[0] || 'Tummer Monthly Report'
  const coverageLine = cleaned.find((line) => line.startsWith('Coverage:')) || ''

  const sections: ReportSection[] = []
  let currentSection: ReportSection | null = null

  for (let i = 2; i < cleaned.length; i += 1) {
    const line = cleaned[i].trim()

    if (!line) continue

    const isSectionTitle =
      !line.startsWith('- ') &&
      !line.includes(': ') &&
      !/^Coverage:/i.test(line)

    if (isSectionTitle) {
      currentSection = { title: line, items: [] }
      sections.push(currentSection)
      continue
    }

    if (!currentSection) {
      currentSection = { title: 'Summary', items: [] }
      sections.push(currentSection)
    }

    currentSection.items.push(line)
  }

  return { title, coverageLine, sections }
}

function createPage(): PdfPage {
  return { ops: [] }
}

function addPageBackground(page: PdfPage) {
  page.ops.push({
    type: 'rect',
    x: 0,
    y: 0,
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    fill: COLORS.bg,
  })
}

function addHeader(page: PdfPage, title: string, coverageLine: string) {
  const headerHeight = 112

  page.ops.push({
    type: 'rect',
    x: 0,
    y: PAGE_HEIGHT - headerHeight,
    width: PAGE_WIDTH,
    height: headerHeight,
    fill: COLORS.headerGreen,
  })

  page.ops.push({
    type: 'rect',
    x: 0,
    y: PAGE_HEIGHT - 18,
    width: PAGE_WIDTH,
    height: 18,
    fill: COLORS.headerGreenDark,
  })

  page.ops.push({
    type: 'text',
    x: MARGIN_X,
    y: PAGE_HEIGHT - 46,
    size: 24,
    font: 'bold',
    text: title,
    color: [1, 1, 1],
  })

  if (coverageLine) {
    page.ops.push({
      type: 'text',
      x: MARGIN_X,
      y: PAGE_HEIGHT - 72,
      size: 11,
      font: 'regular',
      text: coverageLine,
      color: [0.93, 0.98, 0.95],
    })
  }

  page.ops.push({
    type: 'text',
    x: PAGE_WIDTH - 160,
    y: PAGE_HEIGHT - 46,
    size: 10,
    font: 'bold',
    text: 'Monthly Health Snapshot',
    color: [0.93, 0.98, 0.95],
  })
}

function addFooter(page: PdfPage, pageNumber: number, totalPages: number) {
  page.ops.push({
    type: 'line',
    x1: MARGIN_X,
    y1: 28,
    x2: PAGE_WIDTH - MARGIN_X,
    y2: 28,
    color: COLORS.divider,
    lineWidth: 1,
  })

  page.ops.push({
    type: 'text',
    x: MARGIN_X,
    y: 14,
    size: 9,
    font: 'regular',
    text: 'Generated by Tummer',
    color: COLORS.textMuted,
  })

  page.ops.push({
    type: 'text',
    x: PAGE_WIDTH - MARGIN_X - 60,
    y: 14,
    size: 9,
    font: 'regular',
    text: `Page ${pageNumber} of ${totalPages}`,
    color: COLORS.textMuted,
  })
}

function estimateSectionHeight(section: ReportSection) {
  let height = 44 // section header / padding

  for (const item of section.items) {
    const isBullet = item.startsWith('- ')
    const content = isBullet ? item.slice(2) : item
    const wrapped = wrapText(content, CONTENT_WIDTH - 34, 10.5, false)
    height += Math.max(1, wrapped.length) * 15 + 4
  }

  return height + 18
}

function buildPages(lines: string[]) {
  const { title, coverageLine, sections } = parseReport(lines)
  const pages: PdfPage[] = []

  let page = createPage()
  addPageBackground(page)
  addHeader(page, title, coverageLine)

  let cursorY = PAGE_HEIGHT - 140

  const startNewPage = () => {
    pages.push(page)
    page = createPage()
    addPageBackground(page)
    addHeader(page, title, coverageLine)
    cursorY = PAGE_HEIGHT - 140
  }

  const ensureRoom = (neededHeight: number) => {
    if (cursorY - neededHeight < BOTTOM_MARGIN + 24) {
      startNewPage()
    }
  }

  for (const section of sections) {
    const estimatedHeight = estimateSectionHeight(section)
    ensureRoom(estimatedHeight)

    const cardX = MARGIN_X
    const cardY = cursorY - estimatedHeight
    const cardWidth = CONTENT_WIDTH

    page.ops.push({
      type: 'rect',
      x: cardX,
      y: cardY,
      width: 7,
      height: estimatedHeight,
      fill: COLORS.headerGreen,
    })

    page.ops.push({
      type: 'rect',
      x: cardX + 7,
      y: cardY,
      width: cardWidth - 7,
      height: estimatedHeight,
      fill: COLORS.cardFill,
      stroke: COLORS.cardBorder,
      lineWidth: 1,
    })

    page.ops.push({
      type: 'rect',
      x: cardX + 7,
      y: cursorY - 36,
      width: cardWidth - 7,
      height: 36,
      fill: COLORS.accentSoft,
      stroke: COLORS.cardBorder,
      lineWidth: 1,
    })

    page.ops.push({
      type: 'text',
      x: cardX + 16,
      y: cursorY - 24,
      size: 13,
      font: 'bold',
      text: section.title,
      color: COLORS.headerGreenDark,
    })

    page.ops.push({
      type: 'line',
      x1: cardX + 16,
      y1: cursorY - 41,
      x2: cardX + cardWidth - 16,
      y2: cursorY - 41,
      color: COLORS.divider,
      lineWidth: 1,
    })

    let itemY = cursorY - 54

    for (const item of section.items) {
      const isBullet = item.startsWith('- ')
      const content = isBullet ? item.slice(2) : item
      const wrapped = wrapText(content, CONTENT_WIDTH - 34, 10.5, false)

      if (isBullet) {
        page.ops.push({
          type: 'rect',
          x: cardX + 16,
          y: itemY - 3,
          width: 6,
          height: 6,
          fill: COLORS.bullet,
        })
      }

      wrapped.forEach((line, index) => {
        page.ops.push({
          type: 'text',
          x: cardX + (isBullet ? 28 : 16),
          y: itemY - index * 15,
          size: 10.5,
          font: 'regular',
          text: line,
          color: COLORS.text,
        })
      })

      itemY -= wrapped.length * 15 + 4
    }

    cursorY = cardY - 14
  }

  pages.push(page)

  pages.forEach((p, index) => addFooter(p, index + 1, pages.length))

  return pages
}

function buildContentStream(page: PdfPage) {
  const commands: string[] = []

  for (const op of page.ops) {
    if (op.type === 'rect') {
      commands.push('q')
      if (op.lineWidth) commands.push(`${op.lineWidth} w`)
      if (op.fill) commands.push(`${rgb(op.fill)} rg`)
      if (op.stroke) commands.push(`${rgb(op.stroke)} RG`)
      commands.push(`${op.x.toFixed(2)} ${op.y.toFixed(2)} ${op.width.toFixed(2)} ${op.height.toFixed(2)} re`)

      if (op.fill && op.stroke) commands.push('B')
      else if (op.fill) commands.push('f')
      else if (op.stroke) commands.push('S')

      commands.push('Q')
    }

    if (op.type === 'line') {
      commands.push('q')
      commands.push(`${op.lineWidth ?? 1} w`)
      commands.push(`${rgb(op.color ?? COLORS.text)} RG`)
      commands.push(`${op.x1.toFixed(2)} ${op.y1.toFixed(2)} m`)
      commands.push(`${op.x2.toFixed(2)} ${op.y2.toFixed(2)} l`)
      commands.push('S')
      commands.push('Q')
    }

    if (op.type === 'text') {
      commands.push('BT')
      commands.push(`/${op.font === 'bold' ? 'F2' : 'F1'} ${op.size} Tf`)
      commands.push(`${rgb(op.color ?? COLORS.text)} rg`)
      commands.push(`1 0 0 1 ${op.x.toFixed(2)} ${op.y.toFixed(2)} Tm`)
      commands.push(`(${escapePdfText(op.text)}) Tj`)
      commands.push('ET')
    }
  }

  return commands.join('\n')
}

export function createSimplePdf(lines: string[]) {
  const pages = buildPages(lines)
  const objects: string[] = []

  const addObject = (content: string) => {
    objects.push(content)
    return objects.length
  }

  const fontRegularId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
  const fontBoldId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>')

  const contentIds = pages.map((page) => {
    const stream = buildContentStream(page)
    return addObject(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`)
  })

  const pageIds: number[] = []
  const pagesTreeId = contentIds.length + 3 + pages.length

  for (let index = 0; index < pages.length; index += 1) {
    const pageId = addObject(
      `<< /Type /Page /Parent ${pagesTreeId} 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${contentIds[index]} 0 R >>`
    )
    pageIds.push(pageId)
  }

  const kids = pageIds.map((id) => `${id} 0 R`).join(' ')
  const pagesId = addObject(`<< /Type /Pages /Kids [${kids}] /Count ${pageIds.length} >>`)
  const catalogId = addObject(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`)

  let pdf = '%PDF-1.4\n'
  const offsets: number[] = [0]

  objects.forEach((object, index) => {
    offsets.push(pdf.length)
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
  })

  const xrefStart = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n`
  pdf += '0000000000 65535 f \n'

  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${offsets[index].toString().padStart(10, '0')} 00000 n \n`
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefStart}\n%%EOF`

  return Buffer.from(pdf, 'binary')
}
