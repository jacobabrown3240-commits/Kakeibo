// Chart accent colors from the validated data-viz reference palette. Light and
// dark columns are the same hues re-stepped for each surface. (Categories were
// removed from the app; these are just the series accents the charts use.)
export const CAT_COLORS_LIGHT = [
  '#2a78d6', '#eb6834', '#1baf7a', '#eda100',
  '#e87ba4', '#4a3aa7', '#e34948', '#008300',
]
export const CAT_COLORS_DARK = [
  '#3987e5', '#d95926', '#199e70', '#c98500',
  '#d55181', '#9085e9', '#e66767', '#008300',
]

export function slotColor(index, dark = false) {
  const set = dark ? CAT_COLORS_DARK : CAT_COLORS_LIGHT
  if (index < 0 || index >= set.length) return dark ? '#898781' : '#898781'
  return set[index]
}
