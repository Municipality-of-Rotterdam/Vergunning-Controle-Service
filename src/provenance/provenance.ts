import grapoi from 'grapoi'

import dataFactory from '@rdfjs/data-model'
import datasetFactory from '@rdfjs/dataset'

import { prov, rdf, rdfs, xsd } from '../helpers/namespaces.js'

const base = dataFactory.namedNode('http://triplydb.com/rotterdam/huisje-1231') // TODO Must be replaced by the baseIRI
const baseQuad = dataFactory.quad(base, rdf('type'), prov('Collection'))
const provenanceGraph = datasetFactory.dataset([baseQuad])
export let provenancePointer = grapoi({
  dataset: provenanceGraph,
  term: base,
  factory: dataFactory,
})

const endPhase = () => {
  const endTime = performance.now()
  if (provenancePointer.out(prov('startTime')).value) {
    provenancePointer.addOut(prov('endTime'), dataFactory.literal(endTime.toString(), xsd('double')))
  }
}

export const setPhase = (newPhase: string) => {
  endPhase()

  provenancePointer = provenancePointer.node(base)
  const phase = dataFactory.blankNode()

  provenancePointer.addOut(prov('phase'), phase)
  provenancePointer = provenancePointer.node(phase)

  provenancePointer.addOut(rdfs('label'), dataFactory.literal(newPhase))
  provenancePointer.addOut(rdf('type'), prov('Phase'))

  const startTime = performance.now()
  provenancePointer.addOut(prov('startTime'), dataFactory.literal(startTime.toString(), xsd('double')))
}

export const finishProvenance = async () => {
  endPhase()
  return [...provenanceGraph]
}
