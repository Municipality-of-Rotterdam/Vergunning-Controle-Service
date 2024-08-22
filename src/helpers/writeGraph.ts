import fs from 'fs/promises'
import path from 'path'
import ttl from '@jeswr/pretty-turtle'
import { Context } from '@root/types.js'
import { Quad } from '@rdfjs/types'
import { prefixes } from '@root/core/namespaces.js'

export const formatUri = (prefix: string, path: string[]) => {
  return [prefix.replace(/\/+$|#$/g, ''), ...path].join('/')
}

export const formatFilename = (dir: string, namepath: string[]) => {
  const name = namepath[namepath.length - 1] ?? 'graph'
  return path.join(dir.replace(/\/+$/g, ''), ...namepath.slice(0, -1), `${name}.ttl`)
}

// Write a graph to both the filesystem and to the database
export async function writeGraph(context: Context, quads: Quad[], namepath: string[]) {
  const turtle = await ttl.write(quads, { prefixes })
  const filepath = formatFilename(context.outputsDir, namepath)
  if (namepath.length > 1) await fs.mkdir(path.join(context.outputsDir, ...namepath.slice(0, -1)), { recursive: true })
  await fs.writeFile(filepath, turtle, 'utf8')
  await context.buildingDataset.importFromFiles([filepath], {
    defaultGraphName: formatUri(context.baseIRI, namepath),
    overwriteAll: true,
  })
}
