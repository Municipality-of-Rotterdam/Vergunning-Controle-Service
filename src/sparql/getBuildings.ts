import { Context } from '@root/types.js'

import { prefixString } from '../core/namespaces.js'
import { sparqlRequest } from '../requesters/sparqlRequest.js'

export const getBuildings = async (
  context: Context,
): Promise<{ root: string; name: string; wkt: string; geometry: string }[]> => {
  const query = `
    ${prefixString}
    SELECT DISTINCT ?root ?wkt ?geometry
    WHERE { 
      ?root a ifc:IfcBuilding .
      ?root geo:hasDefaultGeometry ?geometry .
      ?geometry geo:asWKT ?wkt
    }
  `

  const response = (await sparqlRequest(context.datasetName, query)).map((b: any) => {
    return { name: b.root?.split('/').pop() ?? 'anonymous', ...b }
  })
  if (response.length < 1) throw new Error('Could not get the footprint')
  return response
}
