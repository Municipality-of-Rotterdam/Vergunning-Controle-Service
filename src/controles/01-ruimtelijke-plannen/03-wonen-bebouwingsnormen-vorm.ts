import { BaseControle } from '@core/BaseControle.js'
import { StepContext } from '@root/core/executeSteps.js'
import { RuimtelijkePlannenAPI } from '@bronnen/RuimtelijkePlannen.js'
import { GroepsData } from '@root/controles/01-ruimtelijke-plannen/ruimtelijke-plannen.js'
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

export default class Controle2WonenBebouwingsnormenVorm extends BaseControle<{}, GroepsData> {
  public naam = 'Bebouwingsnormen: Vorm'
  public tekst = `Ter plaatse van de aanduiding "plat dak" dienen woningen plat te worden afgedekt:`

  async voorbereiding(context: StepContext): Promise<SparqlInputs> {
    const ruimtelijkePlannen = new RuimtelijkePlannenAPI(process.env.RP_API_TOKEN ?? '')
    const data = this.groepData()

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
    const response = await ruimtelijkePlannen.bouwaanduidingenZoek(data.bestemmingsplan.id, geoShape2)
    this.apiResponse = response
    const bouwaanduidingen: any[] = response['_embedded']['bouwaanduidingen']

    this.log(`${bouwaanduidingen.length} bouwaanduidingen gevonden`)

    if (bouwaanduidingen.length != 1) {
      throw new Error('Op dit moment mag er maar 1 bouwaanduiding bestaan.')
    }

    const bouwaanduidingName: string = bouwaanduidingen[0]['naam']
    const bouwaanduiding = bouwaanduidingNode(bouwaanduidingName)

    this.log(`Bestemmingsvlak is van type ${bouwaanduiding.value} s`)

    return { bouwaanduiding }
  }

  sparqlUrl = 'https://demo.triplydb.com/rotterdam/-/queries/3-Wonen-bebouwingsnormen-vorm/'
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
    return `Daken moeten het daktype "${bouwaanduiding.value}" hebben.`
  }
  berichtGefaald(invoer: SparqlInputs): string {
    return `Dak {?roof} heeft het daktype "{?rooftype}". ${this.bericht(invoer)}`
  }
}
