import { geo, ifc } from '@root/core/namespaces.js'
import { sparqlRequest } from '@root/requesters/sparqlRequest.js'
import { Context } from '@root/types.js'

export const getBuildings = async (context: Context) => {
  const buildings: any[] = await sparqlRequest(
    context.datasetName,
    `SELECT DISTINCT ?node ?footprint WHERE {
      ?node a <${ifc('IfcBuilding').value}>.
      ?node <${geo('hasDefaultGeometry').value}> ?geom.
      ?geom <${geo('asWKT').value}> ?footprint.
    }`,
  )
  return buildings
}
