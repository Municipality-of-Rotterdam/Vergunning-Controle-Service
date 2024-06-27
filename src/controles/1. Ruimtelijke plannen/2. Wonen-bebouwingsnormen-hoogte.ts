import { RuimtelijkePlannenAPI } from '@bronnen/RuimtelijkePlannen.js'
import { BaseControle } from '@core/BaseControle.js'
import { NamedNode } from '@rdfjs/types'
import { StepContext } from '@root/core/executeSteps.js'

// Change this type to what you want to give to the sparql and message methods.
type SparqlInputs = {
  max: number
}

/**
 * A check for the Rotterdam vergunningscontrole service.
 */
export default class Controle2WonenBebouwingsnormenHoogte extends BaseControle<SparqlInputs> {
  /**
   * The name shown in the report
   */
  public naam = 'Bebouwingsnormen: Hoogte'

  /**
   * In the prepare phase you can call APIs and gather outputs.
   * These outputs must be returned in an object. This object must have the type SparqlInputs.
   * You can log after each return value from the API.
   */
  async voorbereiding(context: StepContext): Promise<SparqlInputs> {
    const coordinates = context.voetprintCoordinates

    const ruimtelijkePlannen = new RuimtelijkePlannenAPI(process.env.RP_API_TOKEN ?? '')
    const geoShape = { _geo: { contains: { type: 'Polygon', coordinates: [coordinates] } } }

    const plans = (await ruimtelijkePlannen.plannen(geoShape, { planType: 'bestemmingsplan' }))['_embedded']['plannen']
    const planIds: string[] = plans.filter((plan: any) => !plan.isParapluplan).map((plan: any) => plan.id)

    this.log(`De volgende bestemmingsplan(nen) gevonden: \n${planIds.map((id) => `\t${id}`).join('\n')}`)

    const maatvoeringen: any[] = (
      await Promise.all(
        planIds.flatMap(async (planId) => {
          const response = await ruimtelijkePlannen.maatvoeringen(planId, geoShape)
          return response['_embedded']['maatvoeringen'].filter(
            (maatvoering: any) => maatvoering['naam'] == 'maximum aantal bouwlagen',
          )
        }),
      )
    )
      .flat()
      .filter((items) => items)

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

  /**
   * This SPARQL must only return when there is a validation error.
   * This query is used inside the SHACL validator to generate the validation report.
   */
  // Pulled from <https://demo.triplydb.com/rotterdam/-/queries/2-Wonen-bebouwingsnormen-hoogte>
  sparql({ max }: SparqlInputs): string {
    return `
      prefix xsd: <http://www.w3.org/2001/XMLSchema#>
      prefix ifc: <https://standards.buildingsmart.org/IFC/DEV/IFC4/ADD2/OWL#>
      prefix express: <https://w3id.org/express#>

      select ?this ((max(?floorNumber) + 1) as ?aantalVerdiepingen) where {
        ?this a ifc:IfcBuilding.
        [] ifc:relatedObjects_IfcRelAggregates ?storey;
          ifc:relatingObject_IfcRelAggregates ?this.
        ?storey ifc:name_IfcRoot/express:hasString ?positiveFloorLabel.
        filter(regex(?positiveFloorLabel, "^(0*[1-9][0-9]*) .*verdieping$"))
        bind(xsd:integer(substr(?positiveFloorLabel, 1, 2)) as ?floorNumber)
      }
      group by ?this ?max
      having ((max(?floorNumber) + 1) > ${max})
    `
  }

  /**
   * The message to the end user in the validation report.
   * You must use the same variables as in the sparql method.
   */
  berichtGefaald({ max }: SparqlInputs): string {
    return `Gebouw {?this} heeft in totaal {?aantalVerdiepingen} bouwlagen. Dit mag maximaal ${max} zijn.`
  }
}
