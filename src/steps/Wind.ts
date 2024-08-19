import fs from 'fs/promises'
import { join } from 'path'

import { responseToLinkedData } from '@root/requesters/responseToLinkedData.js'
import { wfsRequest } from '@root/requesters/wfsRequest.js'
import { getVoetprint } from '@root/sparql/getVoetprint.js'
import { Context, Step } from '@root/types.js'

export default {
  name: 'Wind',
  description: '',
  run: async (context: Context) => {
    const voetprint = await getVoetprint(context)
    const coordinates: number[] = voetprint.wkt
      .split('((')[1]
      .split('))')[0]
      .split(/ |\,/g)
      .filter(Boolean)
      .map(parseFloat)

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

    const graphName = `${context.baseIRI}graphs/externe-data/wind`
    const turtle = await responseToLinkedData(response, graphName)
    const filepath = join(context.outputsDir, 'wind.ttl')

    await fs.writeFile(filepath, turtle, 'utf8')
    await context.buildingDataset.importFromFiles([filepath], {
      defaultGraphName: graphName,
      overwriteAll: true,
    })
  },
} satisfies Step
