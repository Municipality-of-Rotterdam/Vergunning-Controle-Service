import { BaseControle } from '@core/BaseControle.js'
import { StepContext } from '@root/core/executeSteps.js'
import { GroepsData } from '@root/controles/01-ruimtelijke-plannen/ruimtelijke-plannen.js'
import { WelstandWFSActivity } from '@core/Activity.js'

type SparqlInputs = { elongation: number; welstandgebied: string; welstandgebied_id: number }

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
        const o = response['wfs:FeatureCollection']['wfs:member']['Welstandskaart_tijdelijk_VCS:Gebiedstypen']
        return {
          FID: o['Welstandskaart_tijdelijk_VCS:FID'],
          GEB_TYPE: o['Welstandskaart_tijdelijk_VCS:GEB_TYPE'],
        }
      },
    )
    const response = await wfs.run()
    return { elongation: context.elongation, welstandgebied_id: response.FID, welstandgebied: response.GEB_TYPE }
  }

  sparqlUrl = 'undefined'
  sparql(): string {
    return ''
  }

  bericht({ welstandgebied, welstandgebied_id, elongation }: SparqlInputs): string {
    return `De voetafdruk van het gebouw ligt in welstandsgebied ${welstandgebied_id}, type "${welstandgebied}". De langwerpigheid van het gebouw is L = ${elongation.toString().replace('.', ',')}.`
  }
}
