import { BaseControle } from '@core/BaseControle.js'
//import { GroepRuimtelijkePlannenData } from '@root/src/controles/1. Ruimtelijke plannen/Ruimtelijke plannen.ts'
import { NamedNode } from '@rdfjs/types'
import { StepContext } from '@root/core/executeSteps.js'
import { RuimtelijkePlannenAPI } from '@bronnen/RuimtelijkePlannen.js'

type SparqlInputs = {
  gebruiksfunctie: string
}

export default class Controle2WonenBestemmingsomschrijving extends BaseControle<
  SparqlInputs,
  GroepRuimtelijkePlannenData
> {
  public naam = 'Bestemmingsomschrijving'

  async voorbereiding(context: StepContext): Promise<SparqlInputs> {
    const ruimtelijkePlannen = new RuimtelijkePlannenAPI(process.env.RP_API_TOKEN ?? '')
    const bestemmingsvlakken: any[] = (
      await Promise.all(
        this.groep?.data?.planIds.flatMap(async (planId) => {
          const response = await ruimtelijkePlannen.bestemmingsvlakZoek(planId, this.groep?.data?.geoShape)
          return response['_embedded']['bestemmingsvlakken']
        }),
      )
    )
      .flat()
      .filter((items) => items)
      .filter((f) => f.type == 'enkelbestemming')

    this.log(`${bestemmingsvlakken.length} enkelbestemmingsvlakken gevonden`)

    if (bestemmingsvlakken.length != 1) {
      throw new Error('Op dit moment mag er maar 1 enkelbestemmingsvlak bestaan.')
    }

    const gebruiksfunctie: string = bestemmingsvlakken[0]['naam']

    this.log(`Bestemmingsvlak ${gebruiksfunctie}`)

    return { gebruiksfunctie: 'wonden' }
  }

  // Pulled from <https://demo.triplydb.com/rotterdam/-/queries/1-Wonen-bestemmingsomschrijving>
  sparql({ gebruiksfunctie }: SparqlInputs): string {
    return `
      prefix express: <https://w3id.org/express#>
      prefix ifc: <https://standards.buildingsmart.org/IFC/DEV/IFC4/ADD2/OWL#>

      # Aanname: een IfcSpace heeft 1 Gebruiksfunctie

      select distinct ?space ?spacelabel ?functie where {

        ?this a ifc:IfcBuilding.

        [] ifc:relatingObject_IfcRelAggregates ?this;
          ifc:relatedObjects_IfcRelAggregates ?storey.

        [] a ifc:IfcRelAggregates ;
          ifc:relatingObject_IfcRelAggregates ?storey;
          ifc:relatedObjects_IfcRelAggregates ?space.

        ?space ifc:longName_IfcSpatialElement/express:hasString ?spacelabel .

        [] a ifc:IfcRelDefinesByProperties ;
          ifc:relatedObjects_IfcRelDefinesByProperties ?space ;
          ifc:relatingPropertyDefinition_IfcRelDefinesByProperties ?IfcPropertySet .

        ?IfcPropertySet ifc:hasProperties_IfcPropertySet ?IfcPropertySingleValue .

        ?IfcPropertySingleValue ifc:nominalValue_IfcPropertySingleValue/express:hasString ?functie ;
                                ifc:name_IfcProperty/express:hasString "Gebruiksfunctie" .

        filter(lcase(str(?functie)) != "${gebruiksfunctie.toLowerCase()}")
      }
    `
  }

  bericht({ gebruiksfunctie }: SparqlInputs): string {
    return `Ruimte {?space} heeft de gebruiksfunctie "{?functie}". Dit moet "${gebruiksfunctie}" zijn.`
  }
}
