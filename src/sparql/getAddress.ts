import { Context } from '@root/types.js'

import { prefixString } from '../helpers/namespaces.js'
import { sparqlRequest } from '../helpers/sparqlRequest.js'

export const getAddress = async (context: Context) => {
  const query = `${prefixString}
    SELECT ?address
    WHERE { 
      GRAPH <${context.baseIRI}graph/gebouw> {
        ?building a ifc:IfcBuilding .
        ?building ifc:buildingAddress_IfcBuilding ?addressNode .
        ?addressNode ifc:addressLines_IfcPostalAddress ?list.
        ?list list:hasContents ?line.
        ?line express:hasString ?address.
      }
    }
  `
  const response = await sparqlRequest(context.datasetName, query)
  const gebouwAddress = response.length == 1 ? response[0]['address'] : null
  if (!gebouwAddress)
    throw new Error(`Kon het adres van het gebouw niet vinden; response was ${JSON.stringify(response)}`)

  return gebouwAddress
}
