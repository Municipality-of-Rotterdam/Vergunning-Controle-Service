import { XMLParser } from 'fast-xml-parser'

import { fetchWithProvenance } from '@root/provenance/fetchWithProvenance.js'

export const wfsRequest = async (url: string, body: string) => {
  const response = await fetchWithProvenance(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/xml' },
    body,
  })

  const text = await response.text()

  const parser = new XMLParser()
  const json = parser.parse(text)
  console.log(JSON.stringify(json, null, 2))
}
