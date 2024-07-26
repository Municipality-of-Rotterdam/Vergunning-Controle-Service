import { RuimtelijkePlannenActivity } from '@bronnen/RuimtelijkePlannen.js'
import { Data as RPData } from './common.js'
import { StepContext } from '@root/core/executeSteps.js'
import { Controle } from '@root/core/Controle.js'

type Data = {
  max: number
}

export default class _ extends Controle<StepContext & RPData, Data> {
  public name = 'Bebouwingsnormen: Hoogte'
  public tekst = `Toegestane hoogte verdiepingen. De bouwhoogte van gebouwen mag niet meer bedragen dan met de aanduiding "maximum aantal bouwlagen" op de verbeelding is aangegeven`
  public verwijzing = `
	Hoofdstuk 2 Bestemmingsregels 
		Artikel 23 Wonen lid 
			23.2.2 Bebouwingsnormen
				a.`

  async _run({ baseIRI, bestemmingsplan, footprint2 }: StepContext & RPData): Promise<Data> {
    const response = await new RuimtelijkePlannenActivity({
      url: `/plannen/${bestemmingsplan.id}/maatvoeringen/_zoek`,
      body: { _geo: { contains: footprint2 } },
    }).run({ baseIRI })

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

    const max: number = parseInt(maatvoeringen[0]['omvang'][0]['waarde'])

    this.log(`${max} maximum aantal bouwlagen`)

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
    return `Op de locatie van de aanvraag is het maximaal aantal toegestane bouwlagen ${max}. <a href={?this} target="_blank">De aanvraag</a> bevat {?aantalVerdiepingen} bouwlagen, hiermee overschrijdt de aanvraag de maximaal toegestane bouwhoogte.`
  }
}
