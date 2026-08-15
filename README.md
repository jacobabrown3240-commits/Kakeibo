# 🪙 Kakeibo — Weekly Budgeting

A private, **local-first** budgeting app that visualizes your **weekly spending**
and how your **monthly spending compares to your income**. Import transactions by
**screenshotting your credit-card or debit statements** — the text is read on your
device with in-browser OCR, so nothing is ever uploaded.

Named after the Japanese *kakeibo* (家計簿) method of mindful money tracking.

## Features

- **📷 Screenshot import (OCR).** Drop, browse, or paste (⌘/Ctrl+V) statement
  screenshots. Text is extracted locally with [Tesseract.js](https://tesseract.js.org/)
  and parsed into transactions — no data leaves your browser.
- **✅ Human-in-the-loop review.** Every detected row is auto-categorized and shown
  in an editable table. Fix dates, amounts, categories, or income/expense before
  saving. A **paste-text** fallback works if OCR struggles with a screenshot.
- **📊 Weekly spending.** A stacked bar per week shows where the money went,
  broken down by category (top categories + "Other").
- **📈 Monthly income vs. spending.** A 12-month trend of income against spending,
  plus net saved, savings rate, and a projected month-end spend.
- **🧾 Transaction management.** Search, filter by month/type, inline-edit, and
  bulk-delete.
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

1. Add one or more statement screenshots (or switch to **Paste text instead**).
2. Pick the **statement year** (used when a statement omits the year).
3. Press **Read screenshots** — OCR runs with a progress bar.
4. Review the detected rows: correct anything, uncheck rows to skip, add rows
   manually if needed.
5. **Add transactions** — they're saved locally and appear on the dashboard.

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
    parse.js       # OCR/pasted text -> candidate transactions
    categorize.js  # default categories, keyword classifier, chart palette
    aggregate.js   # weekly/monthly/category rollups for charts
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
