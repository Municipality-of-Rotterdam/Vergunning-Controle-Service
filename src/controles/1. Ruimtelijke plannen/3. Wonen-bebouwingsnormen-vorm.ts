import { BaseControle } from '@core/BaseControle.js'
import { StepContext } from '@root/core/executeSteps.js'
import { RuimtelijkePlannenAPI } from '@bronnen/RuimtelijkePlannen.js'
import { ifc } from '@helpers/namespaces.js'
import NamedNode from '@rdfjs/data-model/lib/NamedNode.js'

export type SparqlInputs = {
  bouwaanduiding: NamedNode
}

function bouwaanduidingNode(name: string): NamedNode {
  // TODO find out the options
  switch (name) {
    case 'plat dak':
      return ifc('FLAT_ROOF')
    default:
      throw new Error(`Onbekende bouwaanduiding "${name}"`)
  }
}

export default class Controle2WonenBebouwingsnormenVorm extends BaseControle<{}> {
  public naam = 'Bebouwingsnormen: Vorm'
  async voorbereiding(context: StepContext): Promise<SparqlInputs> {
    const coordinates = context.voetprintCoordinates
    const ruimtelijkePlannen = new RuimtelijkePlannenAPI(process.env.RP_API_TOKEN ?? '')
    const geoShape = { _geo: { contains: { type: 'Polygon', coordinates: [coordinates] } } }
    const plans = (await ruimtelijkePlannen.plannen(geoShape, { planType: 'bestemmingsplan' }))['_embedded']['plannen']
    const planIds: string[] = plans.filter((plan: any) => !plan.isParapluplan).map((plan: any) => plan.id)

    this.log(`De volgende bestemmingsplan(nen) gevonden: \n${planIds.map((id) => `\t${id}`).join('\n')}`)

    // TODO another test footprint
    const geoShape2 = {
      _geo: {
        contains: {
          type: 'Polygon',
          coordinates: [
            [
              [84165, 431938],
              [84172, 431938],
              [84172, 431943],
              [84165, 431943],
              [84165, 431938],
            ],
          ],
        },
      },
    }
    const bouwaanduidingen: any[] = (
      await Promise.all(
        planIds.flatMap(async (planId) => {
          const response = await ruimtelijkePlannen.bouwaanduidingenZoek(planId, geoShape2)
          return response['_embedded']['bouwaanduidingen']
        }),
      )
    )
      .flat()
      .filter((items) => items)

    this.log(`${bouwaanduidingen.length} bouwaanduidingen gevonden`)

    if (bouwaanduidingen.length != 1) {
      throw new Error('Op dit moment mag er maar 1 bouwaanduiding bestaan.')
    }

    const bouwaanduidingName: string = bouwaanduidingen[0]['naam']
    const bouwaanduiding = bouwaanduidingNode(bouwaanduidingName)

    this.log(`Bestemmingsvlak is van type ${bouwaanduiding} s`)

    return { bouwaanduiding }
  }
  // Pulled from <https://demo.triplydb.com/rotterdam/-/queries/3-Wonen-bebouwingsnormen-vorm/1>
  sparql({ bouwaanduiding }: SparqlInputs): string {
    const query = `
      prefix ifc: <https://standards.buildingsmart.org/IFC/DEV/IFC4/ADD2/OWL#>

      select ?roof ?rooftype where {

        ?this a ifc:IfcBuilding.

        [] ifc:relatingObject_IfcRelAggregates ?this;
          ifc:relatedObjects_IfcRelAggregates ?storey.

        [] ifc:relatingStructure_IfcRelContainedInSpatialStructure ?storey ;
          ifc:relatedElements_IfcRelContainedInSpatialStructure ?roof .

        ?roof ifc:predefinedType_IfcRoof ?rooftype .

        filter (?rooftype != <${bouwaanduiding.value}>)
      }
    `
    return query
  }

  bericht({ bouwaanduiding }: SparqlInputs): string {
    return `Dak {?roof} heeft het daktype "{?rooftype}". Dit moet "${bouwaanduiding}'" zijn.`
  }
}
