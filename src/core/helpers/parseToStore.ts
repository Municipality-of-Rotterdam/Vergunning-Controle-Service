import { createReadStream } from 'fs'
import { StreamParser } from 'n3'

import { Store as TriplyStore } from '@triplydb/data-factory'

export function parseToStore(filePath: string, store: TriplyStore) {
  const parser = new StreamParser(),
    rdfStream = createReadStream(filePath)

  return new Promise((resolve, reject) => {
    store
      .import(parser.import(rdfStream) as any)
      .on('error', reject)
      .on('end', () => resolve(store))
  })
}
