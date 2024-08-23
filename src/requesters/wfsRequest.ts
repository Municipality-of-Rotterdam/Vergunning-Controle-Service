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
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })
  let json = parser.parse(text)

  // Find out namespaces in XML response and rename the relevant keys. TODO: Is
  // there no standard method for this in `fast-xml-parser`?
  const addNamespaces = (x: any, namespaces: { [key: string]: string } = {}): any => {
    if (typeof x == 'object') {
      // First, collect namespaces on this object and add to the collection
      const newNamespaces = Object.entries(x)
        .filter(([k, _]) => k.startsWith('@_xmlns:'))
        .map(([k, v]) => [k.slice(8), v as string])
      if (newNamespaces.length) namespaces = { ...namespaces, ...Object.fromEntries(newNamespaces) }
      // console.log(namespaces)

      // Then rename the relevant keys
      return Object.fromEntries(
        Object.entries(x).map(([k, v]) => {
          const ksplit = k.split(':')
          if (ksplit.length > 0 && namespaces[ksplit[0]]) {
            return [`${namespaces[ksplit[0]]}#${ksplit.slice(1).join(':')}`, addNamespaces(v, namespaces)]
          } else {
            return [k, addNamespaces(v, namespaces)]
          }
        }),
      )
    } else return x
  }

  return addNamespaces(json)
}
