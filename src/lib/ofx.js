// Parse OFX / QFX files (the format most banks offer under "download
// transactions"). OFX is SGML-ish: tags often aren't closed, so we read each
// <STMTTRN> block and pull values that run until the next tag or line end.
// This format is fully structured, so results are reliable — no OCR guessing.

import { toISO } from './date.js'

// Read a single-line tag value: <TAG>value  (value ends at '<' or line end).
function tagValue(block, tag) {
  const rx = new RegExp(`<${tag}>([^<\\r\\n]*)`, 'i')
  const m = block.match(rx)
  return m ? m[1].trim() : ''
}

// OFX date: YYYYMMDD[HHMMSS[.XXX]][TZ] -> ISO YYYY-MM-DD.
function ofxDateToISO(raw) {
  const m = String(raw).match(/^(\d{4})(\d{2})(\d{2})/)
  if (!m) return ''
  const y = +m[1]
  const mo = +m[2]
  const d = +m[3]
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return ''
  return toISO(y, mo, d)
}

let idc = 0
const nextId = () => `ofx_${Date.now().toString(36)}_${idc++}`

export function isOFX(text) {
  return /<STMTTRN>|<OFX>|OFXHEADER/i.test(String(text || ''))
}

export function parseOFX(text) {
  const s = String(text || '')
  const blocks = s.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi) || []

  // Some exports omit the closing tag; fall back to splitting on <STMTTRN>.
  const chunks = blocks.length
    ? blocks
    : s.split(/<STMTTRN>/i).slice(1).map((c) => c.split(/<\/BANKTRANLIST>|<\/STMTTRN>/i)[0])

  const out = []
  for (const block of chunks) {
    const amtRaw = tagValue(block, 'TRNAMT')
    const amt = parseFloat(amtRaw)
    if (Number.isNaN(amt) || amt === 0) continue

    const date = ofxDateToISO(tagValue(block, 'DTPOSTED') || tagValue(block, 'DTUSER'))
    const name = tagValue(block, 'NAME')
    const memo = tagValue(block, 'MEMO')
    const description = [name, memo].filter(Boolean).join(' — ') || '(no description)'

    // OFX convention: negative TRNAMT = money out (expense).
    out.push({
      id: nextId(),
      date,
      description,
      amount: Math.abs(amt),
      type: amt < 0 ? 'expense' : 'income',
      include: true,
    })
  }
  return out
}
