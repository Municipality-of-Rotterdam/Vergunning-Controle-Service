import { XMLParser } from 'fast-xml-parser'

import { fetchWithProvenance } from '@root/provenance/fetchWithProvenance.js'
import { Context } from '@root/types.js'

export const wfsRequest = async (url: string, body: string, context: Context) => {
  const response = await fetchWithProvenance(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/xml' },
    body,
  })

  const text = await response.text()
  const parser = new XMLParser()
  return parser.parse(text)
}
