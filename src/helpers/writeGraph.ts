import fs from 'fs/promises'
import path from 'path'
import ttl from '@jeswr/pretty-turtle'
import { Context } from '@root/types.js'
import { Quad } from '@rdfjs/types'
import { prefixes } from '@root/core/namespaces.js'

export const graphName = (context: Context, namepath: string[]) => {
  return [context.baseIRI.replace(/\/+$/g, ''), 'graph', ...namepath].join('/')
}

const graphFile = (context: Context, namepath: string[]) => {
  const name = namepath[namepath.length - 1] ?? 'graph'
  return path.join(context.outputsDir.replace(/\/+$/g, ''), ...namepath.slice(0, -1), `${name}.ttl`)
}

// Write a graph to both the filesystem and to the database
export async function writeGraph(context: Context, quads: Quad[], namepath: string[]) {
  const turtle = await ttl.write(quads, { prefixes })

  const filepath = graphFile(context, namepath)
  if (namepath.length > 1) await fs.mkdir(path.join(context.outputsDir, ...namepath.slice(0, -1)), { recursive: true })
  await fs.writeFile(filepath, turtle, 'utf8')
  await context.buildingDataset.importFromFiles([filepath], {
    defaultGraphName: graphName(context, namepath),
    overwriteAll: true,
  })
}
