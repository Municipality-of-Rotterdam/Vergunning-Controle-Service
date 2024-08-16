import { wfsRequest } from '@root/requesters/wfsRequest.js'
import { getVoetprint } from '@root/sparql/getVoetprint.js'
import { Context, Step } from '@root/types.js'

export default {
  name: 'Welstand',
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
    )

    console.log(response)
  },
} satisfies Step
