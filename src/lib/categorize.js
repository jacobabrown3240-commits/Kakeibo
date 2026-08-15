// Default categories and a lightweight keyword classifier used to pre-fill the
// category on imported transactions. Users can override any guess in the review
// table, and edit the category list in Settings.

export const DEFAULT_CATEGORIES = [
  'Groceries',
  'Dining',
  'Transport',
  'Shopping',
  'Bills & Utilities',
  'Housing',
  'Health',
  'Entertainment',
  'Travel',
  'Income',
  'Transfer',
  'Other',
]

// Keyword -> category. Matched case-insensitively against the description.
// Ordered roughly by specificity; first match wins.
const RULES = [
  [/(uber eats|doordash|grubhub|postmates|chipotle|mcdonald|starbucks|dunkin|restaurant|cafe|coffee|pizza|taco|sushi|bar &|brewing|diner|bakery)/i, 'Dining'],
  [/(whole foods|trader joe|safeway|kroger|aldi|costco|walmart|target|grocery|supermarket|publix|wegmans|sprouts|food mart)/i, 'Groceries'],
  [/(uber|lyft|shell|chevron|exxon|bp |mobil|gas station|fuel|parking|toll|transit|metro|mta|bart|amtrak|caltrain)/i, 'Transport'],
  [/(amazon|amzn|ebay|etsy|best buy|apple store|nike|zara|h&m|nordstrom|macy|shopping|store)/i, 'Shopping'],
  [/(comcast|xfinity|verizon|at&t|t-mobile|spectrum|pg&e|electric|water|internet|phone|utility|utilities)/i, 'Bills & Utilities'],
  [/(rent|mortgage|landlord|property|hoa|apartment|leasing)/i, 'Housing'],
  [/(pharmacy|cvs|walgreens|doctor|dental|dentist|clinic|hospital|medical|health|fitness|gym|planet fit)/i, 'Health'],
  [/(netflix|spotify|hulu|disney|hbo|max |youtube|cinema|movie|theater|concert|steam|playstation|xbox|nintendo|game)/i, 'Entertainment'],
  [/(airbnb|hotel|marriott|hilton|delta|united|american air|southwest|expedia|booking\.com|flight|airline)/i, 'Travel'],
  [/(payroll|direct dep|deposit|salary|paycheck|interest paid|refund|reimbursement|cashback|dividend)/i, 'Income'],
  [/(transfer|zelle|venmo|paypal|cash app|withdrawal|atm|payment thank you|autopay)/i, 'Transfer'],
]

export function guessCategory(description = '', categories = DEFAULT_CATEGORIES) {
  for (const [rx, cat] of RULES) {
    if (rx.test(description) && categories.includes(cat)) return cat
  }
  return categories.includes('Other') ? 'Other' : categories[0]
}

// Categorical palette from the validated data-viz reference (fixed hue order,
// CVD-checked on the adjacent pairlist used by stacked/grouped bars). Light and
// dark columns are the same eight hues re-stepped for each surface.
export const CAT_COLORS_LIGHT = [
  '#2a78d6', '#eb6834', '#1baf7a', '#eda100',
  '#e87ba4', '#4a3aa7', '#e34948', '#008300',
]
export const CAT_COLORS_DARK = [
  '#3987e5', '#d95926', '#199e70', '#c98500',
  '#d55181', '#9085e9', '#e66767', '#008300',
]

// "Other" and any overflow bucket get a neutral gray, never a cycled hue.
const OTHER_LIGHT = '#898781'
const OTHER_DARK = '#898781'

// Color for a category given an ordered list of the categories actually shown
// in the chart (so hues are assigned by fixed slot, never cycled past 8).
export function slotColor(index, dark = false) {
  const set = dark ? CAT_COLORS_DARK : CAT_COLORS_LIGHT
  if (index < 0 || index >= set.length) return dark ? OTHER_DARK : OTHER_LIGHT
  return set[index]
}

export function otherColor(dark = false) {
  return dark ? OTHER_DARK : OTHER_LIGHT
}
