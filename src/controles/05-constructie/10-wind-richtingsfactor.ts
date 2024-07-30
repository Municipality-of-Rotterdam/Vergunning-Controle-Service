import { XmlActivity } from '@core/Activity.js'
import { Controle } from '@core/Controle.js'
import { StepContext } from '@root/core/executeSteps.js'
import { GeoJSON, Geometry, Polygon, Position } from 'geojson'
import { projectGeoJSON } from '@root/core/helpers/crs.js'

type Data = { windzone: number; geoJSON: GeoJSON }

export default class _ extends Controle<StepContext, Data> {
  public name = 'Windrichtingsfactor'
  public tekst = `Om de constructie te kunnen berekenen t.o.v. de windbelasting dient een windgebied vastgesteld te worden m.b.v. de NEN 1991-1-4.`
  public verwijzing = ``

  async run({ baseIRI, footprintT1 }: StepContext): Promise<Data> {
    const wfs = new XmlActivity({
      name: 'Windzones request',
      url: `https://dservices.arcgis.com/zP1tGdLpGvt2qNJ6/arcgis/services/provincies_windzones/WFSServer`,
      params: { service: 'wfs' },
      body: `<?xml version="1.0" encoding="UTF-8"?>
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
              <gml:posList srsDimension="2">${footprintT1.coordinates.flat().join(' ')}</gml:posList>
            </gml:LinearRing>
          </gml:exterior>
        </gml:Polygon>
      </fes:Contains>
    </fes:Filter>
  </Query>
</GetFeature>`,
      extract: (response: any) => {
        if (!response['wfs:FeatureCollection']?.['wfs:member']?.['provincies_windzones:provincies_windzones']) {
          throw new Error(
            `Geen wind data gevonden, de WFS service gaf het volgende antwoord: ${JSON.stringify(response, null, 2)}`,
          )
        }

        const windzones = response['wfs:FeatureCollection']['wfs:member']['provincies_windzones:provincies_windzones']

        // Extract Polygons from the API call
        // TODO this assumes that we always get multisurfaces and that we get only a single Gebiedstype
        const shapeXML = windzones['provincies_windzones:Shape']['gml:MultiSurface']['gml:surfaceMember']
        const str = shapeXML['gml:Polygon']['gml:exterior']['gml:LinearRing']['gml:posList']
        const numbers: number[] = str.split(' ').map((x: string) => parseFloat(x))

        const coordsPolygon: Position[] = []
        for (let i = 0; i < numbers.length - 1; i += 2) {
          coordsPolygon.push([numbers[i], numbers[i + 1]])
        }
        coordsPolygon.push([numbers[0], numbers[1]])
        const geoJSON: Polygon = {
          type: 'Polygon',
          coordinates: [coordsPolygon],
        }

        return {
          windzone: windzones['provincies_windzones:Windzone'],
          surface: geoJSON,
        }
      },
    })
    const response = await wfs.run({ baseIRI })
    this.apiResponse = response // TODO remove

    this.info['Windzone'] = response.windzone
    this.info['Geometrie van de windzone'] = {
      type: 'Feature',
      properties: {
        name: 'Windzone',
        show_on_map: true,
        popupContent: `Windzone ${response.windzone}`,
        style: {
          weight: 2,
          color: '#999',
          opacity: 1,
          fillColor: '#B0DE5C',
          fillOpacity: 0.5,
        },
      },
      geometry: projectGeoJSON(response.surface) as Geometry,
    }
    this.info['Voetafdruk van het gebouw'] = {
      type: 'Feature',
      properties: {
        name: 'Voetafdruk van het gebouw',
        show_on_map: true,
        popupContent: 'Voetafdruk van het gebouw',
        style: {
          weight: 2,
          color: '#999',
          opacity: 1,
          fillColor: '#B0DE5C',
          fillOpacity: 0.5,
        },
      },
      geometry: projectGeoJSON(footprintT1) as Geometry,
    }
    this.status = null

    return {
      windzone: response.windzone,
      geoJSON: response.surface,
    }
  }

  bericht({ windzone }: Data): string {
    return `De aanvraag ligt in windzone ${windzone}.`
  }
}
