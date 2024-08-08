// This is a temporary file to help the transition

import factory from '@rdfjs/data-model'
import { dct, rdf, skos, xsd, prov } from './namespaces.js'
import { GrapoiPointer } from './grapoi.js'
import { Store as TriplyStore } from '@triplydb/data-factory'

export function start(p: GrapoiPointer, { name, description }: { name: string; description?: string }): GrapoiPointer {
  // TODO: This should not be hard-coded as they have other IRIs in Rotterdam. Use the baseIRI instead. The baseIRI also contains the dataset name which is crucial, because otherwise we are creating the same instance(s) for the same dataset.
  const label = name ? `https://demo.triplydb.com/rotterdam/${name.replace(/\W/g, '')}` : null
  const provenanceNode = label ? factory.namedNode(label) : factory.blankNode

  let n: GrapoiPointer | undefined
  p.addOut(dct('hasPart'), (m: GrapoiPointer) => {
    n = m
  })
  if (!n) throw new Error('should be assigned at this point')

  n.addOut(rdf('type'), prov('Activity'))
  n.addOut(skos('prefLabel'), factory.literal(name))
  if (description) n.addOut(dct('description'), factory.literal(description))
  n.addOut(prov('startedAtTime'), factory.literal(new Date().toISOString(), xsd('dateTime')))
  return n
}

export function finish(p: GrapoiPointer) {
  p.addOut(prov('endedAtTime'), factory.literal(new Date().toISOString(), xsd('dateTime')))
}
