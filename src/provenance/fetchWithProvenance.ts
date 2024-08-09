import dataFactory from '@rdfjs/data-model'

import { http, prov, rdf, rdfs, xsd } from '../helpers/namespaces.js'
import { provenancePointer } from './provenance.js'

export const fetchWithProvenance = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const startTime = performance.now()
  const response = await fetch(input, init)

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
                activity.addOut(rdf('type'), prov('FetchActivity'))
                activity.addOut(prov('startTime'), dataFactory.literal(startTime.toString(), xsd('double')))
                activity.addOut(prov('endTime'), dataFactory.literal(endTime.toString(), xsd('double')))
                if (errorMessage) activity.addOut(prov('error'), dataFactory.literal(errorMessage))
                if (result) activity.addOut(http('resp'), dataFactory.literal(result))
              })
            }
          }
      },
    },
  ) as Response
}
