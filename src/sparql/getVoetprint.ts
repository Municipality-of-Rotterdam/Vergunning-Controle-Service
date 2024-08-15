import { Context } from '@root/types.js'

import { ifc, prefixString } from '../helpers/namespaces.js'
import { sparqlRequest } from '../helpers/sparqlRequest.js'

export const getVoetprint = async (context: Context) => {
  const response = await sparqlRequest(
    context.datasetName,
    `
    ${prefixString}

    SELECT ?address
    WHERE { 
      GRAPH <${context.baseIRI}/graph/gebouw> {
        ?building a ifc:IfcBuilding .
        ?building ifc:buildingAddress_IfcBuilding ?addressNode .
        ?addressNode ifc:addressLines_IfcPostalAddress ?list.
        ?list list:hasContents ?line.
        ?line express:hasString ?address.
      }
    }
  `,
  )
}
