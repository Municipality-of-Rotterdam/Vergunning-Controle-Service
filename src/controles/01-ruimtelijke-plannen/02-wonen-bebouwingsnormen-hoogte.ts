import { RuimtelijkePlannenAPI } from '@bronnen/RuimtelijkePlannen.js'
import { GroepsData } from '@root/controles/01-ruimtelijke-plannen/ruimtelijke-plannen.js'
import { BaseControle } from '@core/BaseControle.js'
import { StepContext } from '@root/core/executeSteps.js'

type SparqlInputs = {
  max: number
}

export default class Controle2WonenBebouwingsnormenHoogte extends BaseControle<SparqlInputs, GroepsData> {
  public naam = 'Bebouwingsnormen: Hoogte'
  public tekst = `De bouwhoogte van gebouwen mag niet meer bedragen dan met de aanduiding "maximum aantal bouwlagen" op de verbeelding is aangegeven`
  public verwijzing = `
	Hoofdstuk 2 Bestemmingsregels 
		Artikel 23 Wonen lid 
			23.2 Bebouwingsnormen
				a.`

  async voorbereiding(context: StepContext): Promise<SparqlInputs> {
    const ruimtelijkePlannen = new RuimtelijkePlannenAPI(process.env.RP_API_TOKEN ?? '')

    const data = this.groepData()
    const response = await ruimtelijkePlannen.maatvoeringen(data.bestemmingsplan.id, data.geoShape)
    this.apiResponse = response
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
  sparql({ max }: SparqlInputs): string {
    return `
      prefix xsd: <http://www.w3.org/2001/XMLSchema#>
      prefix ifc: <https://standards.buildingsmart.org/IFC/DEV/IFC4/ADD2/OWL#>
      prefix express: <https://w3id.org/express#>

      select ?this ((max(?floorNumber) + 1) as ?aantalVerdiepingen) where {
      graph ?g {
        ?this a ifc:IfcBuilding.
        [] ifc:relatedObjects_IfcRelAggregates ?storey;
          ifc:relatingObject_IfcRelAggregates ?this.
        ?storey ifc:name_IfcRoot/express:hasString ?positiveFloorLabel.
        filter(regex(?positiveFloorLabel, "^(0*[1-9][0-9]*) .*verdieping$"))
        bind(xsd:integer(substr(?positiveFloorLabel, 1, 2)) as ?floorNumber)
      }
      }
      group by ?this ?max
      having ((max(?floorNumber) + 1) > ${max})
    `
  }

  bericht({ max }: SparqlInputs): string {
    return `Gebouw {?this} heeft in totaal {?aantalVerdiepingen} bouwlagen. Dit mag maximaal ${max} zijn.`
  }
}
