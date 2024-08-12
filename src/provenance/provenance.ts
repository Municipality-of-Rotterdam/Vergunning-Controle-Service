import grapoi from 'grapoi'

import dataFactory from '@rdfjs/data-model'
import datasetFactory from '@rdfjs/dataset'
import { DatasetCore, NamedNode } from '@rdfjs/types'
import { Context } from '@root/types.js'

import { prov, rdf, rdfs, xsd } from '../helpers/namespaces.js'

let base: NamedNode
let provenanceGraph: DatasetCore
export let provenancePointer: ReturnType<typeof grapoi>

export const initProvenance = (context: Context) => {
  base = dataFactory.namedNode(context.baseIRI + 'graph/provenance')
  const baseQuad = dataFactory.quad(base, rdf('type'), prov('Collection'))
  provenanceGraph = datasetFactory.dataset([baseQuad])
  provenancePointer = grapoi({
    dataset: provenanceGraph,
    term: base,
    factory: dataFactory,
  })
}

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
