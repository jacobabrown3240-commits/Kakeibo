// Image preprocessing to make statement screenshots far more legible to OCR.
// Screenshots are usually small, low-contrast, and sometimes light-on-dark.
// We upscale, convert to grayscale, and binarize with an Otsu threshold,
// auto-inverting dark-mode captures so the result is always dark text on white.

function loadImage(src) {
  return new Promise((resolve, reject) => {
    if (src instanceof HTMLImageElement) return resolve(src)
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    if (src instanceof Blob) {
      const url = URL.createObjectURL(src)
      img.onload = () => {
        URL.revokeObjectURL(url)
        resolve(img)
      }
      img.src = url
    } else {
      img.src = src // dataURL / URL string
    }
  })
}

// Otsu's method: pick the gray level that best separates fore/background.
function otsuThreshold(hist, total) {
  let sum = 0
  for (let i = 0; i < 256; i++) sum += i * hist[i]
  let sumB = 0
  let wB = 0
  let max = 0
  let threshold = 127
  for (let i = 0; i < 256; i++) {
    wB += hist[i]
    if (!wB) continue
    const wF = total - wB
    if (!wF) break
    sumB += i * hist[i]
    const mB = sumB / wB
    const mF = (sum - sumB) / wF
    const between = wB * wF * (mB - mF) * (mB - mF)
    if (between > max) {
      max = between
      threshold = i
    }
  }
  return threshold
}

// Returns a <canvas> ready to hand to Tesseract.
export async function preprocessImage(src, opts = {}) {
  const { targetWidth = 1600, maxWidth = 3000 } = opts
  const img = await loadImage(src)
  const naturalW = img.naturalWidth || img.width
  const naturalH = img.naturalHeight || img.height

  // Upscale small screenshots so thin fonts have enough pixels to resolve;
  // never blow past maxWidth (keeps memory + OCR time sane).
  let scale = naturalW < targetWidth ? targetWidth / naturalW : 1
  if (naturalW * scale > maxWidth) scale = maxWidth / naturalW
  const w = Math.max(1, Math.round(naturalW * scale))
  const h = Math.max(1, Math.round(naturalH * scale))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, w, h)

  const imageData = ctx.getImageData(0, 0, w, h)
  const d = imageData.data
  const total = w * h

  // Grayscale + histogram in one pass.
  const hist = new Array(256).fill(0)
  const gray = new Uint8ClampedArray(total)
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    const g = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) | 0
    gray[p] = g
    hist[g]++
  }

  const t = otsuThreshold(hist, total)

  // Count dark pixels to decide orientation (dark-mode screenshots have a
  // mostly-dark background, which we must invert for OCR).
  let darkCount = 0
  for (let p = 0; p < total; p++) if (gray[p] < t) darkCount++
  const invert = darkCount > total * 0.5

  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    let v = gray[p] >= t ? 255 : 0
    if (invert) v = 255 - v
    d[i] = d[i + 1] = d[i + 2] = v
    d[i + 3] = 255
  }
  ctx.putImageData(imageData, 0, 0)
  return canvas
}
