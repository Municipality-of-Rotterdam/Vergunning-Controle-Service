import grapoi from 'grapoi'

import { write } from '@jeswr/pretty-turtle'
import dataFactory from '@rdfjs/data-model'
import datasetFactory from '@rdfjs/dataset'

import { prefixes, prov, rdf, rdfs, xsd } from './namespaces.js'

const base = dataFactory.namedNode('http://triplydb.com/rotterdam/huisje-1231')
const baseQuad = dataFactory.quad(base, rdf('type'), prov('Collection'))
const provenanceGraph = datasetFactory.dataset([baseQuad])
let provenancePointer = grapoi({
  dataset: provenanceGraph,
  term: base,
  factory: dataFactory,
})

export const setPhase = (newPhase: string) => {
  provenancePointer = provenancePointer.node(base)
  const phase = dataFactory.blankNode()

  provenancePointer.addOut(prov('phase'), phase)
  provenancePointer = provenancePointer.node(phase)

  provenancePointer.addOut(rdfs('label'), dataFactory.literal(newPhase))
  provenancePointer.addOut(rdf('type'), prov('Phase'))
}

export const injectProvenance = () => {
  // Patch the global fetch
  const originalFetch = globalThis.fetch
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const startTime = performance.now()
    const response = await originalFetch(input, init)

    return new Proxy(
      {},
      {
        get(_target, p) {
          if (p !== 'then')
            return async () => {
              let errorMessage = ''
              let result = ''

              try {
                result = await (response[p.toString() as keyof Response]! as any).bind(response)()
                return result
              } catch (error) {
                if (error instanceof Error) errorMessage = error.message
                throw error
              } finally {
                const endTime = performance.now()

                provenancePointer.addOut(prov('activity'), (activity: any) => {
                  activity.addOut(rdfs('label'), dataFactory.literal(input.toString()))
                  activity.addOut(rdf('type'), prov('Activity'))
                  activity.addOut(prov('startTime'), dataFactory.literal(startTime.toString(), xsd('double')))
                  activity.addOut(prov('endTime'), dataFactory.literal(endTime.toString(), xsd('double')))
                  if (errorMessage) activity.addOut(prov('error'), dataFactory.literal(errorMessage))
                  if (result) activity.addOut(prov('response'), dataFactory.literal(result))
                })
              }
            }
        },
      },
    ) as Response
  }
}

export const printProvenance = async () => {
  console.log(
    await write([...provenanceGraph], {
      prefixes,
    }),
  )
}
