import fs from 'fs/promises';
import { join } from 'path';

import { graphExists } from '@root/helpers/existence.js';
import { SKIP_STEP } from '@root/helpers/skipStep.js';
import { wktPolygonToCoordinates } from '@root/helpers/wktPolygonToCoordinates.js';
import { responseToLinkedData } from '@root/requesters/responseToLinkedData.js';
import { wfsRequest } from '@root/requesters/wfsRequest.js';
import { getFootprint } from '@root/sparql/getFootprint.js';
import { Context, Step } from '@root/types.js';

export default {
  name: 'Welstand',
  description: '',
  run: async (context: Context) => {
    const graphName = `${context.baseIRI}graphs/externe-data/welstand`

    if (context.cache && (await graphExists(context.buildingDataset, graphName))) {
      return SKIP_STEP
    }

    const footprint = await getFootprint(context)
    const coordinates = wktPolygonToCoordinates(footprint.wkt)

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

    const response = await wfsRequest(
      `https://diensten.rotterdam.nl/arcgis/services/SO_RW/Welstandskaart_tijdelijk_VCS/MapServer/WFSServer`,
      requestXml,
      context,
    )

    const turtle = await responseToLinkedData(response, graphName)
    const filepath = join(context.outputsDir, 'welstand.ttl')

    await fs.writeFile(filepath, turtle, 'utf8')
    await context.buildingDataset.importFromFiles([filepath], {
      defaultGraphName: graphName,
      overwriteAll: true,
    })
  },
} satisfies Step
