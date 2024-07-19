import { BaseControle } from '@core/BaseControle.js'
import { StepContext } from '@root/core/executeSteps.js'
import { RuimtelijkePlannenAPI } from '@bronnen/RuimtelijkePlannen.js'
import { Data as RPData } from '@root/controles/01-ruimtelijke-plannen/ruimtelijke-plannen.js'
import { ifc } from '@helpers/namespaces.js'
import NamedNode from '@rdfjs/data-model/lib/NamedNode.js'
import { Controle } from '@root/core/Controle.js'

export type Data = {
  bouwaanduiding: NamedNode
}

const bouwaanduidingMapping: { [key: string]: NamedNode } = {
  'plat dak': ifc('FLAT_ROOF'),
}

// Function to get the value by key (name)
function bouwaanduidingNode(name: string): NamedNode {
  if (bouwaanduidingMapping.hasOwnProperty(name)) {
    return bouwaanduidingMapping[name]
  } else {
    throw new Error(`Onbekende bouwaanduiding "${name}"`)
  }
}

// Function to get the key by value (IFC code)
function bouwaanduidingTextByIfcCode(ifcCode: NamedNode): string {
  const name = Object.keys(bouwaanduidingMapping).find((key) => bouwaanduidingMapping[key] === ifcCode)
  if (name) {
    return name
  } else {
    throw new Error(`Onbekende IFC code "${ifcCode}"`)
  }
}

export default class _ extends Controle<Controle<StepContext, RPData>, Data> {
  public name = 'Bebouwingsnormen: Vorm'
  public tekst = `Ter plaatse van de aanduiding "plat dak" dienen woningen plat te worden afgedekt`
  public verwijzing = ` 
  Hoofdstuk 2 Bestemmingsregels 
		Artikel 23 Wonen lid 
			23.2 Bebouwingsnormen
				c.`

  async _run(context: Controle<StepContext, RPData>): Promise<Data> {
    const ruimtelijkePlannen = new RuimtelijkePlannenAPI(process.env.RP_API_TOKEN ?? '')
    const data = context.data
    if (!data) throw new Error()

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
  sparql = ({ bouwaanduiding }: Data) => {
    return `
      prefix ifc: <https://standards.buildingsmart.org/IFC/DEV/IFC4/ADD2/OWL#>

      select ?roof ?rooftype where {
      graph ?g {

        ?this a ifc:IfcBuilding.

        [] ifc:relatingObject_IfcRelAggregates ?this;
          ifc:relatedObjects_IfcRelAggregates ?storey.

        [] ifc:relatingStructure_IfcRelContainedInSpatialStructure ?storey ;
          ifc:relatedElements_IfcRelContainedInSpatialStructure ?roof .

        ?roof ifc:predefinedType_IfcRoof ?rooftype .

        filter (?rooftype != <${bouwaanduiding.value}>)
      }
      }
    `
  }

  bericht({ bouwaanduiding }: Data): string {
    const bouwaanduidingText = bouwaanduiding.value.replace(
      'https://standards.buildingsmart.org/IFC/DEV/IFC4/ADD2/OWL#',
      'ifc:',
    )
    return `De aanvraag heeft een <a href=${bouwaanduiding.value} target="_blank">${bouwaanduidingTextByIfcCode(bouwaanduiding)}</a>, hiermee wordt voldaan aan de regels voor de locatie.`
  }
  berichtGefaald(invoer: Data): string {
    return `Dak <a href={?roof} target="_blank">{?roof}</a> heeft het daktype "{?rooftype}". ${this.bericht(invoer)}`
  }
}
