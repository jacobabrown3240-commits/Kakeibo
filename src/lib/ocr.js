// In-browser OCR via Tesseract.js. Runs entirely on the client — the image is
// never uploaded anywhere. The English model + worker are fetched from a CDN on
// first use and then cached by the browser.
//
// Two things make this meaningfully better than a naive Tesseract call:
//  1. Each image is preprocessed (upscale + grayscale + Otsu binarize) first.
//  2. The worker is tuned for statement layouts: a single uniform text block
//     with preserved inter-word spacing (so the amount stays separated from the
//     description).

import { createWorker, PSM } from 'tesseract.js'
import { preprocessImage } from './preprocess.js'

let workerPromise = null

async function getWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      const worker = await createWorker('eng')
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
        preserve_interword_spaces: '1',
      })
      return worker
    })()
  }
  return workerPromise
}

// Recognize text from several images in sequence, reporting overall progress.
// `preprocess` can be disabled to fall back to the raw image.
export async function ocrImages(images, onProgress, { preprocess = true } = {}) {
  const worker = await getWorker()
  const texts = []
  for (let i = 0; i < images.length; i++) {
    let input = images[i]
    if (preprocess) {
      try {
        input = await preprocessImage(images[i])
      } catch {
        input = images[i] // fall back to the raw image if preprocessing fails
      }
    }
    const { data } = await worker.recognize(input)
    texts.push(data.text || '')
    onProgress?.((i + 1) / images.length, i, images.length)
  }
  return texts.join('\n')
}

// Recognize a single image (kept for convenience / callers that need one).
export async function ocrImage(image, onProgress) {
  return ocrImages([image], onProgress ? (p) => onProgress(p) : undefined)
}
