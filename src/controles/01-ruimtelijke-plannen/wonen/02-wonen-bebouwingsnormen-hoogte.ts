import { RuimtelijkePlannenActivity } from '@bronnen/RuimtelijkePlannen.js'
import { Data as RPData } from '../common.js'
import { StepContext } from '@root/core/executeSteps.js'
import { Controle } from '@root/core/Controle.js'
import { projectGeoJSON } from '@root/core/helpers/crs.js'
import { Geometry } from 'geojson'

type Data = {
  max: number
}

export default class _ extends Controle<StepContext & RPData, Data> {
  public name = 'Bebouwingsnormen: Hoogte'

  async run(context: StepContext & RPData): Promise<Data> {
    const { baseIRI, bestemmingsplan, footprintT2 } = context
    const response = await new RuimtelijkePlannenActivity({
      url: `/plannen/${bestemmingsplan.id}/maatvoeringen/_zoek`,
      body: { _geo: { contains: footprintT2 } },
      params: { expand: 'geometrie' },
    }).run({ baseIRI })
    this.apiResponse = response // TODO remove

    const maatvoeringen: any[] = response['_embedded']['maatvoeringen'].filter(
      (maatvoering: any) => maatvoering['naam'] == 'maximum aantal bouwlagen',
    )

    this.log(`${maatvoeringen.length} "maximum aantal bouwlagen" maatvoeringen gevonden`)

    if (maatvoeringen.length === 0) {
      throw new Error('Er is geen enkele maatvoering voor het gegeven bestemmingsvlak.')
    } else if (maatvoeringen.length > 1) {
      throw new Error('Er zijn meerdere maatvoeringen voor het gegeven bestemmingsvlak.')
    } else if (maatvoeringen[0]['omvang'].length > 1) {
      throw new Error('Meerdere waardes voor omvang gegeven.')
    }

    const maatvoering = maatvoeringen[0]
    const max: number = parseInt(maatvoering['omvang'][0]['waarde'])

    this.info[maatvoering.naam] = {
      type: 'Feature',
      properties: {
        name: `${maatvoering.naam}: ${maatvoering.omvang[0].waarde}`,
      },
      geometry: maatvoering.geometrie,
    }

    // TODO: No hardcoding
    const reference = `<a href="https://www.ruimtelijkeplannen.nl/documents/NL.IMRO.0599.BP1133HvtNoord-on01/r_NL.IMRO.0599.BP1133HvtNoord-on01.html#_2_BESTEMMINGSREGELS">2</a>.<a href="https://www.ruimtelijkeplannen.nl/documents/NL.IMRO.0599.BP1133HvtNoord-on01/r_NL.IMRO.0599.BP1133HvtNoord-on01.html#_23_Wonen">23</a>.2.2`
    this.info['Beschrijving'] =
      `<span class="article-ref">${reference}</span> Toegestane hoogte verdiepingen. De bouwhoogte van gebouwen mag niet meer bedragen dan met de aanduiding "maximum aantal bouwlagen" op de verbeelding is aangegeven.`

    this.log(`${max} maximum aantal bouwlagen`)

    await this.runSparql(context, { max })

    this.info['Testvoetafdruk 2'] = {
      type: 'Feature',
      properties: {
        name: 'Testvoetafdruk 2',
        style: { color: '#aa0000' },
      },
      geometry: projectGeoJSON(footprintT2) as Geometry,
    }

    return { max }
  }

  sparqlUrl = 'https://demo.triplydb.com/rotterdam/-/queries/2-Wonen-bebouwingsnormen-hoogte'
  sparql = ({ max }: Data) => {
    return `
      prefix express: <https://w3id.org/express#>
      prefix ifc: <https://standards.buildingsmart.org/IFC/DEV/IFC4/ADD2/OWL#>

      select ?this ((count(?floor)) as ?aantalVerdiepingen) where {
        graph ?g {
          ?this a ifc:IfcBuilding.
          [] ifc:relatingObject_IfcRelAggregates ?this;
            ifc:relatedObjects_IfcRelAggregates ?storey.
          ?storey ifc:name_IfcRoot/express:hasString ?floor.
          filter(regex(?floor, "^00 begane grond|^(0*[1-9][0-9]*) .*verdieping$")) .
        }
      }
      group by ?this ?max
      having ((count(?floor)) > ${max})
    `
  }

  bericht({ max }: Data): string {
    let result = `Op de locatie van de aanvraag is het maximaal aantal toegestane bouwlagen ${max}. `
    if (this.status === true) result += `De aanvraag voldoet hieraan.`
    else
      result += `<a href={?this} target="_blank">De aanvraag</a> bevat {?aantalVerdiepingen} bouwlagen. Hiermee overschrijdt de aanvraag de maximaal toegestane bouwhoogte.`
    return result
  }
}
