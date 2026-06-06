import { readFileSync } from 'fs'
import pdfParse from 'pdf-parse/lib/pdf-parse.js'

const buf = readFileSync('C:/Users/marce/Downloads/processo real.PDF')
const data = await pdfParse(buf)
console.log('Paginas:', data.numpages)
console.log(data.text.slice(0, 8000))
