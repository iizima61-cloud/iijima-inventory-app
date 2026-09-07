// 色番号からおおよその色を推測するヒューリスティック。
// 日塗工(日本塗料工業会)形式の色番号(例: N-90, 25-90B)は公開の色番号ルールから
// 大まかな色相・明度・彩度を逆算できるが、正確な色を保証するものではない。
// メーカー独自の色番号(例: SR-406, KP-185)は公開情報がないため推測不可。

function hslToHex(h: number, s: number, l: number): string {
  const sN = s / 100
  const lN = l / 100
  const c = (1 - Math.abs(2 * lN - 1)) * sN
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = lN - c / 2
  let r = 0
  let g = 0
  let b = 0
  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]

  const toHex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0')

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export function guessColorFromCode(rawCode: string | null | undefined): string | null {
  if (!rawCode) return null
  const code = rawCode.trim().toUpperCase()

  const grayMatch = code.match(/^N-?\s*(\d{1,3})\b/)
  if (grayMatch) {
    const lightness = Math.min(100, Math.max(0, Number(grayMatch[1])))
    return hslToHex(0, 0, lightness)
  }

  const chromaMatch = code.match(/^(\d{2})-(\d{2})([A-Z])\b/)
  if (chromaMatch) {
    const hueCode = Number(chromaMatch[1])
    const lightness = Math.min(100, Math.max(0, Number(chromaMatch[2])))
    const letterIndex = chromaMatch[3].charCodeAt(0) - 'A'.charCodeAt(0)
    const hue = (hueCode / 100) * 360
    const saturation = Math.min(95, Math.max(10, (letterIndex / 14) * 100))
    return hslToHex(hue, saturation, lightness)
  }

  return null
}
