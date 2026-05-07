// utils/validators.js
export function isDate(text) {
  const dateRegex = /^\d{2}\.\d{2}\.\d{2}$/
  return dateRegex.test(text)
}
  
export function isAmount(text) {
  return /^\d+'?\d*\.\d{2}$/.test(text)
}

export function isNegativeAmount(text) {
  return /^-\d+'?\d*\.\d{2}$/.test(text)
}

export function shouldSkipLine(text, skipWords) {
  return skipWords.some(word => text.includes(word))
}