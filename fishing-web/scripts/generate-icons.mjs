import { Resvg } from '@resvg/resvg-js'
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')

function svgToPng(svgPath, pngPath, size) {
  const svg = readFileSync(svgPath, 'utf8')
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
    background: 'transparent',
  })
  const pngData = resvg.render()
  writeFileSync(pngPath, pngData.asPng())
  console.log(`Generated ${pngPath} (${size}x${size})`)
}

svgToPng(join(publicDir, 'icon.svg'), join(publicDir, 'icon.png'), 512)
svgToPng(join(publicDir, 'favicon.svg'), join(publicDir, 'favicon.png'), 32)
