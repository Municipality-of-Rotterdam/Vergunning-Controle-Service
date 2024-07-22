import { Controle } from '@core/Controle.js'
import { StepContext } from '@root/core/executeSteps.js'
import { Data as WelstandData } from './common.js'
import { WelstandWfsActivity } from '@core/Activity.js'
import { GeoJSON, MultiPolygon, Position } from 'geojson'
import { rdf, skos, dct, geo, xsd, sf } from '@core/helpers/namespaces.js'
import { GrapoiPointer } from '@root/core/helpers/grapoi.js'
import factory from '@rdfjs/data-model'
import { geojsonToWKT } from '@terraformer/wkt'

type Data = { elongation: number; welstandgebied: string; welstandgebied_id: number; geoJSON: GeoJSON }

/** Given: Een IFC-model positioneert na georeferentie geheel binnen Welstandsgebied “stempel en
Strokenbouw”
And: Er wordt een IFC-model ingediend van IfcBuilding waarbij de Elementen met het attribuut
“IsExternal” gezamenlijk een bebouwingsstrook vormen met open hoek.
Then: De ruimtelijke inpassing van het gebouw is in overeenstemming met de stempel en strokenbouw -
ruimtelijke inpassing. */

export default class _ extends Controle<Controle<StepContext, WelstandData>, Data> {
  public name = 'Welstand: Stempel en strokenbouw - Ruimtelijke inpassing'
  public tekst = `Er is sprake van een ‘open verkaveling’ (een herkenbaar ensemble van bebouwingsstroken die herhaald worden) of een ‘halfopen verkaveling’ (gesloten bouwblokken samengesteld uit losse bebouwingsstroken met open hoeken)`
  public verwijzing = ``

  async _run(context: Controle<StepContext, WelstandData>): Promise<Data> {
    const wfs = new WelstandWfsActivity({
      name: 'Welstand WFS request',
      description: 'Welstand WFS request',
      body: `<?xml version="1.0" encoding="UTF-8"?>
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
          surface: geoJSON,
        }
      },
    })
    //@ts-ignore TODO: The base IRI is passed through in an unsustainable way
    const response = await wfs.run({ baseIRI: context.context?.context?.baseIRI })
    const data = context.data
    if (!data) throw new Error()

    // Save to report
    this.pointer.addOut(dct('hasPart'), (p: GrapoiPointer) => {
      p.addOut(skos('prefLabel'), factory.literal('Langwerpigheid', 'nl'))
      // p.addOut(rdf('type'), rpt('Elongation'))
    })
    this.pointer.addOut(dct('hasPart'), (p: GrapoiPointer) => {
      p.addOut(skos('prefLabel'), factory.literal('Welstandsgebied', 'nl'))
      // p.addOut(rdf('type'), rpt('Welstandsgebied'))
      // p.addOut(skos('prefLabel'))
    })
    this.pointer.addOut(dct('hasPart'), (p: GrapoiPointer) => {
      p.addOut(skos('prefLabel'), factory.literal(`Voetafdruk`, 'nl'))
      p.addOut(
        dct('description'),
        factory.literal(`Voetafdruk van welstandsgebied ${response.fid}: ${response.geb_type}`, 'nl'),
      )
      p.addOut(rdf('type'), sf(response.surface.type))
      p.addOut(geo('coordinateDimension'), factory.literal('2', xsd('integer')))
      const wkt = geojsonToWKT(response.surface)
      p.addOut(geo('asWKT'), factory.literal(`<http://www.opengis.net/def/crs/EPSG/0/28992> ${wkt}`, geo('wktLiteral')))
    })

    return {
      elongation: data.elongation,
      welstandgebied_id: response.fid,
      welstandgebied: response.geb_type,
      geoJSON: response.surface,
    }
  }

  bericht({ welstandgebied, welstandgebied_id, elongation }: Data): string {
    return `De voetafdruk van het gebouw ligt in welstandsgebied ${welstandgebied_id}, type "${welstandgebied}". De langwerpigheid van het gebouw is L = ${elongation.toString().replace('.', ',')}.`
  }
}
