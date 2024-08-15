import { Context } from '@root/types.js'

import { ifc, prefixString } from '../helpers/namespaces.js'
import { sparqlRequest } from '../helpers/sparqlRequest.js'

export const getVoetprint = async (context: Context) => {
  const response = await sparqlRequest(
    context.datasetName,
    `
    ${prefixString}
    SELECT ?wkt
    WHERE { 
      ?building a ifc:IfcBuilding .
      ?building geo:hasDefaultGeometry ?geometry .
      ?geometry geo:asWKT ?wkt
    }
  `,
  )
}
