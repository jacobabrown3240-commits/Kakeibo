// In-browser PDF text extraction via PDF.js. The file is read locally and never
// uploaded — same on-device promise as the rest of the importer.
//
// Bank statements are laid out in columns (Date | Amount | Description), so a
// naive text dump loses the row structure. We rebuild lines from the positioned
// text items: items on (roughly) the same baseline are grouped into one line and
// ordered left-to-right, so a row comes back as "08/12 1,234.56 DESCRIPTION…".

// PDF.js is ~600 kB, so load it (and its worker) on demand the first time a PDF
// is actually processed rather than in the app's initial bundle.
let pdfjsPromise = null
async function getPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const pdfjsLib = await import('pdfjs-dist')
      const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl
      return pdfjsLib
    })()
  }
  return pdfjsPromise
}

// Group a page's text items into visual lines using their y-position, then sort
// each line by x-position and join with spaces (padding wide gaps so adjacent
// columns don't run together).
function itemsToLines(items) {
  const rows = []
  const Y_TOL = 3 // items within this many units vertically are the same line

  for (const it of items) {
    const str = it.str
    if (!str) continue
    const x = it.transform[4]
    const y = it.transform[5]
    let row = rows.find((r) => Math.abs(r.y - y) <= Y_TOL)
    if (!row) {
      row = { y, parts: [] }
      rows.push(row)
    }
    row.parts.push({ x, str, w: it.width || 0 })
  }

  rows.sort((a, b) => b.y - a.y) // top of page first

  return rows.map((r) => {
    r.parts.sort((a, b) => a.x - b.x)
    let line = ''
    let prevEnd = null
    for (const p of r.parts) {
      if (prevEnd != null) {
        const gap = p.x - prevEnd
        // A visible gap means a new column/word; a large one, a column break.
        if (gap > 1.5 || !/\s$/.test(line)) line += ' '
      }
      line += p.str
      prevEnd = p.x + p.w
    }
    return line.replace(/\s+/g, ' ').trim()
  }).filter(Boolean)
}

// Extract text from a PDF File/Blob/ArrayBuffer, returning newline-joined lines
// that preserve the on-page row structure. `onProgress(fraction)` is optional.
export async function extractPdfText(input, onProgress) {
  const data =
    input instanceof ArrayBuffer ? input : await input.arrayBuffer()

  const pdfjsLib = await getPdfjs()
  const pdf = await pdfjsLib.getDocument({ data, isEvalSupported: false }).promise
  const pages = []
  try {
    for (let n = 1; n <= pdf.numPages; n++) {
      const p = await pdf.getPage(n)
      const content = await p.getTextContent()
      pages.push(itemsToLines(content.items).join('\n'))
      p.cleanup()
      onProgress?.(n / pdf.numPages)
    }
  } finally {
    await pdf.destroy()
  }
  return pages.join('\n')
}

// Quick sniff so we can give a friendly error for non-PDF files.
export function isPdf(file) {
  if (!file) return false
  const name = (file.name || '').toLowerCase()
  return file.type === 'application/pdf' || name.endsWith('.pdf')
}
