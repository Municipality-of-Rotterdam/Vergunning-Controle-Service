import { Controle } from '@core/Controle.js'
import { StepContext } from '@root/core/executeSteps.js'
import { XmlActivity } from '@core/Activity.js'
import { GeoJSON, Geometry, MultiPolygon, Position } from 'geojson'
import { rdf, skos, dct, geo, xsd, sf, litre } from '@core/helpers/namespaces.js'
import { GrapoiPointer } from '@root/core/helpers/grapoi.js'
import factory from '@rdfjs/data-model'
import { geojsonToWKT } from '@terraformer/wkt'
import { projectGeoJSON } from '@root/core/helpers/crs.js'

type Data = { elongation: number; welstandgebied: string; welstandgebied_id: number; geoJSON: GeoJSON }

/** Given: Een IFC-model positioneert na georeferentie geheel binnen Welstandsgebied “stempel en
Strokenbouw”
And: Er wordt een IFC-model ingediend van IfcBuilding waarbij de Elementen met het attribuut
“IsExternal” gezamenlijk een bebouwingsstrook vormen met open hoek.
Then: De ruimtelijke inpassing van het gebouw is in overeenstemming met de stempel en strokenbouw -
ruimtelijke inpassing. */

export default class _ extends Controle<StepContext, Data> {
  public name = 'Stempel en strokenbouw - Ruimtelijke inpassing'
  public tekst = `Er is sprake van een ‘open verkaveling’ (een herkenbaar ensemble van bebouwingsstroken die herhaald worden) of een ‘halfopen verkaveling’ (gesloten bouwblokken samengesteld uit losse bebouwingsstroken met open hoeken)`
  public verwijzing = ``

  async run({ elongation, baseIRI, footprint }: StepContext): Promise<Data> {
    const wfs = new XmlActivity({
      name: 'Welstand WFS request',
      description: 'Welstand WFS request',
      url: `https://diensten.rotterdam.nl/arcgis/services/SO_RW/Welstandskaart_tijdelijk_VCS/MapServer/WFSServer`,
      body: `<?xml version="1.0" encoding="UTF-8"?>
<GetFeature xmlns:gml="http://www.opengis.net/gml/3.2" xmlns="http://www.opengis.net/wfs/2.0" xmlns:fes="http://www.opengis.net/fes/2.0" service="WFS" version="2.0.0">
   <Query xmlns:Welstandskaart_tijdelijk_VCS="https://vnrpwapp426.rotterdam.local:6443/arcgis/admin/services/Welstandskaart_tijdelijk_VCS/MapServer/WFSServer" typeNames="Welstandskaart_tijdelijk_VCS:Gebiedstypen">
     <fes:Filter xmlns:fes="http://www.opengis.net/fes/2.0">
       <fes:Contains>
        <fes:ValueReference>shape</fes:ValueReference>
         <gml:Polygon srsName="urn:ogc:def:crs:EPSG::28992" gml:id="footprint">
           <gml:exterior>
             <gml:LinearRing>
<gml:posList srsDimension="2">${footprint.coordinates.flat().join(' ')}</gml:posList>
            </gml:LinearRing>
          </gml:exterior>
        </gml:Polygon>
      </fes:Contains>
    </fes:Filter>
  </Query>
</GetFeature>`,
      extract: (response: any) => {
        const gebiedstypen =
          response['wfs:FeatureCollection']['wfs:member']['Welstandskaart_tijdelijk_VCS:Gebiedstypen']

        // Extract Polygons from the API call
        // TODO this assumes that we always get multisurfaces and that we get only a single Gebiedstype
        const shapesXML = gebiedstypen['Welstandskaart_tijdelijk_VCS:Shape']['gml:MultiSurface']['gml:surfaceMember']
        const coords: Position[][] = []
        for (const shapeXML of shapesXML) {
          const str = shapeXML['gml:Polygon']['gml:exterior']['gml:LinearRing']['gml:posList']
          const numbers: number[] = str.split(' ').map((x: string) => parseFloat(x))

          const coordsPolygon: Position[] = []
          for (let i = 0; i < numbers.length - 1; i += 2) {
            coordsPolygon.push([numbers[i], numbers[i + 1]])
          }
          coordsPolygon.push([numbers[0], numbers[1]])
          coords.push(coordsPolygon)
        }
        const geoJSON: MultiPolygon = { type: 'MultiPolygon', coordinates: [coords] }

        return {
          fid: gebiedstypen['Welstandskaart_tijdelijk_VCS:FID'],
          geb_type: gebiedstypen['Welstandskaart_tijdelijk_VCS:GEB_TYPE'],
          surface: projectGeoJSON(geoJSON) as Geometry,
        }
      },
    })
    const response = await wfs.run({ baseIRI })
    this.apiResponse = response // TODO: Remove

    this.info['Langwerpigheid'] = elongation
    this.info['Welstandgebied'] = response.geb_type
    this.info['Voetafdruk van het welstandsgebied'] = {
      type: 'Feature',
      properties: {
        name: response.geb_type,
        show_on_map: true,
        popupContent: `Welstandsgebied "${response.geb_type}"`,
        style: {
          weight: 2,
          color: '#999',
          opacity: 1,
          fillColor: '#B0DE5C',
          fillOpacity: 0.5,
        },
      },
      geometry: response.surface,
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
      geometry: projectGeoJSON(footprint) as Geometry,
    }
    this.status = null

    return {
      elongation: elongation,
      welstandgebied_id: response.fid,
      welstandgebied: response.geb_type,
      geoJSON: response.surface,
    }
  }

  bericht({ welstandgebied, welstandgebied_id, elongation }: Data): string {
    return `De voetafdruk van het gebouw ligt in welstandsgebied ${welstandgebied_id}, type "${welstandgebied}". De langwerpigheid van het gebouw is L = ${elongation.toString().replace('.', ',')}.`
  }
}
