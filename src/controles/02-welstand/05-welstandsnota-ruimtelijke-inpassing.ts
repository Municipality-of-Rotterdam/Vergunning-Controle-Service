import { BaseControle } from '@core/BaseControle.js'
import { StepContext } from '@root/core/executeSteps.js'
import { GroepsData } from '@root/controles/01-ruimtelijke-plannen/ruimtelijke-plannen.js'
import { WelstandWFSActivity } from '@core/Activity.js'
import { geojsonToWKT } from '@terraformer/wkt'
import { MultiPolygon, Position } from 'geojson'
// import { geojsonToWkt } from '@triplyetl/etl/ratt'

type SparqlInputs = { elongation: number; welstandgebied: string; welstandgebied_id: number; surface: any }

/** Given: Een IFC-model positioneert na georeferentie geheel binnen Welstandsgebied “stempel en
Strokenbouw”
And: Er wordt een IFC-model ingediend van IfcBuilding waarbij de Elementen met het attribuut
“IsExternal” gezamenlijk een bebouwingsstrook vormen met open hoek.
Then: De ruimtelijke inpassing van het gebouw is in overeenstemming met de stempel en strokenbouw -
ruimtelijke inpassing. */

export default class Controle2WelstandRuimtelijkeInpassing extends BaseControle<SparqlInputs, GroepsData> {
  public naam = 'Welstand: Stempel en strokenbouw - Ruimtelijke inpassing'
  public tekst = `Er is sprake van een ‘open verkaveling’ (een herkenbaar ensemble van bebouwingsstroken die herhaald worden) of een ‘halfopen verkaveling’ (gesloten bouwblokken samengesteld uit losse bebouwingsstroken met open hoeken)`
  public verwijzing = ``

  async voorbereiding(context: StepContext): Promise<SparqlInputs> {
    // TODO: This is of course actually an "uitvoering", but that's why the BaseControle/BaseGroup needs to be refactored
    const wfs = new WelstandWFSActivity(
      {
        name: 'Welstand WFS request',
        description: 'Welstand WFS request',
      },
      `<?xml version="1.0" encoding="UTF-8"?>
<GetFeature xmlns:gml="http://www.opengis.net/gml/3.2" xmlns="http://www.opengis.net/wfs/2.0" xmlns:fes="http://www.opengis.net/fes/2.0" service="WFS" version="2.0.0">
   <Query xmlns:Welstandskaart_tijdelijk_VCS="https://vnrpwapp426.rotterdam.local:6443/arcgis/admin/services/Welstandskaart_tijdelijk_VCS/MapServer/WFSServer" typeNames="Welstandskaart_tijdelijk_VCS:Gebiedstypen">
     <fes:Filter xmlns:fes="http://www.opengis.net/fes/2.0">
       <fes:Contains>
        <fes:ValueReference>shape</fes:ValueReference>
         <gml:Polygon srsName="urn:ogc:def:crs:EPSG::28992" gml:id="footprint">
           <gml:exterior>
             <gml:LinearRing>
<gml:posList srsDimension="2">84165 431938 84172 431938 84172 431943 84165 431943 84165 431938</gml:posList>
            </gml:LinearRing>
          </gml:exterior>
        </gml:Polygon>
      </fes:Contains>
    </fes:Filter>
  </Query>
</GetFeature>`,
      (response: any) => {
        const gebiedstypen =
          response['wfs:FeatureCollection']['wfs:member']['Welstandskaart_tijdelijk_VCS:Gebiedstypen']

        // Extract Polygons from the API call
        // TODO this assumes that we always get multisurfaces and that we get only a single Gebiedstype
        const shapesXML = gebiedstypen['Welstandskaart_tijdelijk_VCS:Shape']['gml:MultiSurface']['gml:surfaceMember']
        const coords: Position[][][] = []
        for (const shapeXML of shapesXML) {
          const str = shapeXML['gml:Polygon']['gml:exterior']['gml:LinearRing']['gml:posList']
          const numbers = str.split(' ').map((x: string) => parseFloat(x))

          const coordsPolygon: Position[][] = []
          for (let i = 0; i < numbers.length - 1; i += 2) {
            coordsPolygon.push([numbers[i], numbers[i + 1]])
          }
          coordsPolygon.push([numbers[0], numbers[1]])
          coords.push(coordsPolygon)
        }

        const geoJSON: MultiPolygon = { type: 'MultiPolygon', coordinates: [coords] }
        const wkt = geojsonToWKT(geoJSON)

        return {
          FID: gebiedstypen['Welstandskaart_tijdelijk_VCS:FID'],
          GEB_TYPE: gebiedstypen['Welstandskaart_tijdelijk_VCS:GEB_TYPE'],
          SURFACE: JSON.stringify(wkt),
        }
      },
    )
    const response = await wfs.run()
    return {
      elongation: context.elongation,
      welstandgebied_id: response.FID,
      welstandgebied: response.GEB_TYPE,
      surface: response.SURFACE,
    }
  }

  sparqlUrl = 'undefined'
  sparql(): string {
    return ''
  }

  bericht({ welstandgebied, welstandgebied_id, elongation }: SparqlInputs): string {
    return `De voetafdruk van het gebouw ligt in welstandsgebied ${welstandgebied_id}, type "${welstandgebied}". De langwerpigheid van het gebouw is L = ${elongation.toString().replace('.', ',')}.`
  }
}
