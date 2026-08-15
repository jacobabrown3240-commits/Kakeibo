# 🪙 Kakeibo — Weekly Budgeting

A private, **local-first** budgeting app that shows, week by week, whether your
**money is trending up or down**. Every transaction is simply **income or
expense** — no categories to fuss with. Import from a bank CSV/OFX export or a
statement screenshot; everything is processed on your device, so nothing is ever
uploaded.

Named after the Japanese *kakeibo* (家計簿) method of mindful money tracking.

## Features

- **📥 Three import methods**, all processed on-device — nothing is uploaded:
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
- **📈 Balance trend.** An area line of your running balance week by week — the
  headline "is my money going up or down?" view. Set an optional starting balance
  so it reflects your real money.
- **📊 Weekly cash flow.** A line of each week's net (money in minus money out),
  with a marker per week: above the zero line is a surplus, below is a shortfall.
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

Pick a source on the **Import** tab. All three feed the same editable review
table, so you always confirm before anything is saved:

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
