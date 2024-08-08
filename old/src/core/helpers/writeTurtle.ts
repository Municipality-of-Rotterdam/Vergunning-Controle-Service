import { Writer } from 'n3'

import { Quad } from '@rdfjs/types'

import * as namespaces from './namespaces.js'

export const writeTurtle = async (quads: Quad[]): Promise<string> => {
  const writer = new Writer({
    prefixes: Object.fromEntries(Object.entries(namespaces).map(([alias, iri]) => [alias, iri().value])),
  })

  writer.addQuads(quads)

  return new Promise((resolve, reject) => {
    writer.end((error, result: string) => {
      if (error) reject(error)
      if (result) resolve(result)
    })
  })
}
