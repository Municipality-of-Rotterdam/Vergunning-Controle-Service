import fs from 'fs/promises'
import { join } from 'path'

import { graphExists } from '@root/helpers/existence.js'
import { SKIP_STEP } from '@root/helpers/skipStep.js'
import { wktPolygonToCoordinates } from '@root/helpers/wktPolygonToCoordinates.js'
import { responseToLinkedData } from '@root/requesters/responseToLinkedData.js'
import { wfsRequest } from '@root/requesters/wfsRequest.js'
import { getBuildings } from '@root/sparql/getBuildings.js'
import { Context, Step } from '@root/types.js'

export default {
  name: 'Wind',
  description: '',
  run: async (context: Context) => {
    const graphName = `${context.baseIRI}graph/externe-data/wind`

    if (context.cache && (await graphExists(context.buildingDataset, graphName))) {
      return SKIP_STEP
    }

    for (const building of await getBuildings(context)) {
      const coordinates = wktPolygonToCoordinates(building.wkt)

      const requestXml = `<?xml version="1.0" encoding="UTF-8"?>
      <GetFeature 
          xmlns:gml="http://www.opengis.net/gml/3.2"
          xmlns="http://www.opengis.net/wfs/2.0"
          xmlns:fes="http://www.opengis.net/fes/2.0"
          xmlns:provincies_windzones="https://www.arcgis.com/services/provincies_windzones/FeatureServer/WFSServer"
          service="WFS" version="2.0.0">
        <Query  typeNames="provincies_windzones:provincies_windzones">
          <fes:Filter>
            <fes:Contains>
              <fes:ValueReference>Shape</fes:ValueReference>
              <gml:Polygon srsName="urn:ogc:def:crs:EPSG::28992" gml:id="footprint">
                <gml:exterior>
                  <gml:LinearRing>
                    <gml:posList srsDimension="2">${coordinates.flat().join(' ')}</gml:posList>
                  </gml:LinearRing>
                </gml:exterior>
              </gml:Polygon>
            </fes:Contains>
          </fes:Filter>
        </Query>
      </GetFeature>`

      const response = await wfsRequest(
        `https://dservices.arcgis.com/zP1tGdLpGvt2qNJ6/arcgis/services/provincies_windzones/WFSServer`,
        requestXml,
        context,
      )

      const turtle = await responseToLinkedData(
        response,
        graphName,
        'https://dservices.arcgis.com/zP1tGdLpGvt2qNJ6/arcgis/services/provincies_windzones',
      )
      const filepath = join(context.outputsDir, 'wind.ttl')

      await fs.writeFile(filepath, turtle, 'utf8')
      await context.buildingDataset.importFromFiles([filepath], {
        defaultGraphName: graphName,
        overwriteAll: true,
      })
    }
  },
} satisfies Step
