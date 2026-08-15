// In-browser OCR via Tesseract.js. Runs entirely on the client — the image is
// never uploaded anywhere. The English language model and worker are fetched
// from a CDN on first use and then cached by the browser.

import Tesseract from 'tesseract.js'

// Recognize text from one image (File | Blob | dataURL | HTMLImageElement).
// `onProgress` receives a 0..1 fraction during the recognize phase.
export async function ocrImage(image, onProgress) {
  const { data } = await Tesseract.recognize(image, 'eng', {
    logger: (m) => {
      if (m.status === 'recognizing text' && typeof m.progress === 'number') {
        onProgress?.(m.progress)
      }
    },
  })
  return data.text || ''
}

// Recognize several images in sequence, reporting overall progress across all.
export async function ocrImages(images, onProgress) {
  const texts = []
  for (let i = 0; i < images.length; i++) {
    const text = await ocrImage(images[i], (p) => {
      onProgress?.((i + p) / images.length, i, images.length)
    })
    texts.push(text)
  }
  return texts.join('\n')
}
