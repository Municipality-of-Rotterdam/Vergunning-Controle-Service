import { Quad } from '@rdfjs/types'

import { writeGraph, formatUri } from '@root/helpers/writeGraph.js'
import { graphExists } from '@root/helpers/existence.js'
import { SKIP_STEP } from '@root/helpers/skipStep.js'
import { wktPolygonToCoordinates } from '@root/helpers/wktPolygonToCoordinates.js'
import { responseToLinkedData } from '@root/requesters/responseToLinkedData.js'
import { wfsRequest } from '@root/requesters/wfsRequest.js'
import { getBuildings } from '@root/sparql/getBuildings.js'
import { Context, Step } from '@root/types.js'

export default {
  name: 'Welstand',
  description: '',
  strict: false,
  run: async (context: Context) => {
    const graphPath = ['graph', 'externe-data', 'welstand']
    const graphUri = formatUri(context.baseIRI, graphPath)

    // if (context.cache && (await graphExists(context.buildingDataset, graphUri))) return SKIP_STEP

    const quads: Quad[] = []
    for (const building of await getBuildings(context)) {
      const coordinates = wktPolygonToCoordinates(building.wkt)

      const requestXml = `<?xml version="1.0" encoding="UTF-8"?>
      <GetFeature xmlns:gml="http://www.opengis.net/gml/3.2" xmlns="http://www.opengis.net/wfs/2.0" xmlns:fes="http://www.opengis.net/fes/2.0" service="WFS" version="2.0.0">
        <Query xmlns:Welstandskaart_tijdelijk_VCS="https://vnrpwapp426.rotterdam.local:6443/arcgis/admin/services/Welstandskaart_tijdelijk_VCS/MapServer/WFSServer" typeNames="Welstandskaart_tijdelijk_VCS:Gebiedstypen">
          <fes:Filter xmlns:fes="http://www.opengis.net/fes/2.0">
            <fes:Contains>
              <fes:ValueReference>shape</fes:ValueReference>
              <gml:Polygon srsName="urn:ogc:def:crs:EPSG::28992" gml:id="footprint">
                <gml:exterior>
                  <gml:LinearRing>
                    <gml:posList srsDimension="2">${coordinates.join(' ')}</gml:posList>
                  </gml:LinearRing>
                </gml:exterior>
              </gml:Polygon>
            </fes:Contains>
          </fes:Filter>
        </Query>
      </GetFeature>`

      const welstandsApiUrl = `https://diensten.rotterdam.nl/arcgis/services/SO_RW/Welstandskaart_tijdelijk_VCS/MapServer/WFSServer`
      const response = await wfsRequest(welstandsApiUrl, requestXml, context)

      quads.push(
        ...(await responseToLinkedData(
          response,
          welstandsApiUrl,
          building.root,
          `${graphUri}/${building.name}#welstand`,
        )),
      )
    }
    await writeGraph(context, quads, graphPath)
  },
} satisfies Step
