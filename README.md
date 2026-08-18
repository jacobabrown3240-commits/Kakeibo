# 🪙 Kakeibo — Weekly Budgeting

A private, **local-first** budgeting app that shows, week by week, whether your
**money is trending up or down**. Every transaction is simply **income or
expense** — no categories to fuss with. Import from a PNC statement PDF, a bank
CSV/OFX export, or a statement screenshot; everything is processed on your
device, so nothing is ever uploaded.

Named after the Japanese *kakeibo* (家計簿) method of mindful money tracking.

## Features

- **📥 Four import methods**, all processed on-device — nothing is uploaded:
  - **📑 PNC PDF** — drop a PNC bank statement PDF and it's read on-device with
    [PDF.js](https://mozilla.github.io/pdf.js/) (loaded on demand). Deposits,
    card purchases, and other deductions are sorted into income/expense by
    statement section. Review, then **Download CSV** or add straight to Kakeibo.
  - **CSV** — import your bank's transactions export. Columns are auto-detected
    with an editable mapping (date / description / amount, or separate
    debit/credit). Accurate and private.
  - **OFX / QFX** — import a bank "download transactions" file. Fully
    structured, so it imports with no guesswork.
  - **📷 Screenshot (OCR)** — drop, browse, or paste (⌘/Ctrl+V) a statement
    image. It's preprocessed (upscale, grayscale, Otsu binarize, dark-mode
    auto-invert) and read locally with a tuned [Tesseract.js](https://tesseract.js.org/)
    worker. Best-effort; CSV/OFX are more reliable for messy statements.
- **✅ Human-in-the-loop review.** Every detected row is shown in an editable
  table. Fix dates, amounts, or income/expense before saving. A **paste-text**
  fallback works if OCR struggles with a screenshot.
- **🎯 Spending vs. income meter.** The headline view: a big meter whose full
  width is your weekly **income line** and whose fill is your **spending** —
  green while you're comfortably under (saving), amber as you approach, red once
  you cross it. Handles inconsistent income by measuring against an expected
  weekly income you set (or your average if you don't).
- **📊 Recent weeks streak.** A stack of slim per-week meters so you can scan the
  pattern of under/over weeks at a glance, each labeled with what you saved (＋)
  or overspent (−).
- **📈 Balance over time.** A running-balance area line, anchored to your real
  current balance so it lines up with your bank.
- **🧾 Transaction management.** Search, filter by month/type, inline-edit, and
  bulk-delete. Income vs. expense only — no categories.
- **🔒 Local-first + backups.** All data lives in your browser (`localStorage`).
  Export a JSON backup or CSV, and import a backup to restore or move devices.
- **🌗 Light & dark themes** with a colorblind-safe, validated chart palette.

## Tech stack

- [React](https://react.dev/) + [Vite](https://vite.dev/)
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [Recharts](https://recharts.org/) for charts
- [Tesseract.js](https://tesseract.js.org/) for in-browser OCR
- [PDF.js](https://mozilla.github.io/pdf.js/) for in-browser PDF text extraction

## Getting started

```bash
npm install        # install dependencies
npm run dev        # start the dev server (http://localhost:5173)
npm run build      # production build -> dist/
npm run preview    # preview the production build
```

The production build in `dist/` is fully static and can be hosted anywhere
(GitHub Pages, Netlify, or any static file server). The `base` is set to `./`
so it works from a subpath too.

> **Note on OCR:** the English OCR model and worker are fetched from a CDN the
> first time you read a screenshot, then cached by your browser. The image
> itself is processed entirely on-device and never uploaded.

## How import works

Pick a source on the **Import** tab. All four feed the same editable review
table, so you always confirm before anything is saved:

- **PNC PDF:** pick the **statement year** (PNC rows show only MM/DD), then drop
  or browse to the statement PDF → it's read and sorted into income/expense
  automatically. From the review table you can **Download CSV** or add the rows.
- **CSV:** choose the file → confirm the auto-detected column mapping (and, for a
  single signed amount column, whether spending shows as negative or positive) →
  **Parse**.
- **OFX / QFX:** choose the file → transactions are parsed directly.
- **Screenshot:** add image(s) (or **Paste text instead**), pick the **statement
  year** for statements that omit it, then **Read screenshots**.

Then review the detected rows — correct anything, uncheck rows to skip, add rows
manually — and **Add transactions**. They're saved locally and appear on the
dashboard.

## Your data & privacy

Everything is stored only in this browser's `localStorage` under the key
`kakeibo.state.v1`. There is no server and no account. Clearing your browser data
(or using a different browser/device) starts fresh — use **Settings → Export JSON
backup** to keep a copy.

## Project structure

```
src/
  lib/
    pdf.js         # PDF.js wrapper (on-demand, rebuilds columnar lines)
    pnc.js         # PNC statement text -> transactions (section-aware)
    ocr.js         # Tesseract.js wrapper (in-browser OCR)
    preprocess.js  # image cleanup before OCR (upscale, binarize, invert)
    parse.js       # OCR/pasted text -> candidate transactions
    csv.js         # bank CSV parsing + column detection
    ofx.js         # OFX/QFX parsing
    categorize.js  # chart accent colors
    aggregate.js   # weekly series + running-balance rollups
    date.js        # date parsing + week/month helpers
    storage.js     # localStorage persistence
    export.js      # JSON/CSV export + backup import
    theme.js       # light/dark theme tokens + hook
  components/
    ui.jsx         # shared UI primitives
    charts.jsx     # Recharts chart components
  views/
    Dashboard.jsx
    ImportView.jsx
    TransactionsView.jsx
    SettingsView.jsx
  App.jsx          # state, persistence, navigation
```
