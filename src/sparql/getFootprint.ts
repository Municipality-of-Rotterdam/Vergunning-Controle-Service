import { Context } from '@root/types.js'

import { prefixString } from '../core/namespaces.js'
import { sparqlRequest } from '../requesters/sparqlRequest.js'

export const getFootprint = async (context: Context): Promise<{ wkt: string; geometry: string }> => {
  const query = `
    ${prefixString}
    SELECT ?wkt ?geometry
    WHERE { 
      ?building a ifc:IfcBuilding .
      ?building geo:hasDefaultGeometry ?geometry .
      ?geometry geo:asWKT ?wkt
    }
  `

  const response = await sparqlRequest(context.datasetName, query)
  const wkt = response.length == 1 ? response[0] : null
  if (!wkt) throw new Error('Could not get the footprint')
  return wkt
}
