import { StepContext } from '@root/core/executeSteps.js'
import { RuimtelijkePlannenActivity } from '@bronnen/RuimtelijkePlannen.js'
import { Data as RPData } from '../common.js'
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

export default class _ extends Controle<StepContext & RPData, Data> {
  public name = 'Bebouwingsnormen: Vorm'

  async run({ bestemmingsplan, baseIRI, footprintT1 }: StepContext & RPData): Promise<Data> {
    const response = await new RuimtelijkePlannenActivity({
      url: `/plannen/${bestemmingsplan.id}/bouwaanduidingen/_zoek`,
      body: { _geo: { intersects: footprintT1 } },
    }).run({ baseIRI })
    this.apiResponse = response

    const bouwaanduidingen: any[] = response['_embedded']['bouwaanduidingen']

    this.log(`${bouwaanduidingen.length} bouwaanduidingen gevonden`)

    if (bouwaanduidingen.length != 1) {
      throw new Error('Op dit moment mag er maar 1 bouwaanduiding bestaan.')
    }

    const bouwaanduidingName: string = bouwaanduidingen[0]['naam']
    const bouwaanduiding = bouwaanduidingNode(bouwaanduidingName)

    this.log(`Bestemmingsvlak is van type ${bouwaanduiding.value} s`)

    // TODO: No hardcoding
    const reference = `<a href="https://www.ruimtelijkeplannen.nl/documents/NL.IMRO.0599.BP1133HvtNoord-on01/r_NL.IMRO.0599.BP1133HvtNoord-on01.html#_2_BESTEMMINGSREGELS">2</a>.<a href="https://www.ruimtelijkeplannen.nl/documents/NL.IMRO.0599.BP1133HvtNoord-on01/r_NL.IMRO.0599.BP1133HvtNoord-on01.html#_23_Wonen">23</a>.2.2c`
    this.info['Beschrijving'] =
      `<span class="article-ref">${reference}</span> Ter plaatse van de aanduiding "plat dak" dienen woningen plat te worden afgedekt`

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

    let result = `Op de locatie geldt een bouwaanduiding <a href=${bouwaanduiding.value} target="_blank">${bouwaanduidingTextByIfcCode(bouwaanduiding)}</a>. `
    if (this.status === true) result += `De aanvraag voldoet hieraan.`
    // else result += `De aanvraag heeft een dak <a href={?roof} target="_blank">{?roof}</a> met type "{?rooftype}.`
    else result += `De aanvraag voldoet hier niet aan.`
    return result
  }
}
