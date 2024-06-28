import { BaseControle } from '@core/BaseControle.js'
import { NamedNode } from '@rdfjs/types'
import { StepContext } from '@root/core/executeSteps.js'
import { RuimtelijkePlannenAPI } from '@bronnen/RuimtelijkePlannen.js'
import { GroepsData } from '@root/controles/01-ruimtelijke-plannen/ruimtelijke-plannen.js'

type SparqlInputs = {
  gebruiksfunctie: string
}

/** Given: Een IFC-model positioneert na georeferentie geheel binnen een IMRO bestemmingsvlak “Wonen”
of IMOW gebiedsaanwijzing/IMOW locatie noemer: Wonen.
And: Het ingediend IFC-model heeft een ifcSpace Gebruiksfunctie Name Woonfunctie, ifcSpace
Objecttype BVO en optioneel een IfcSpace Objecttype Nevengebruiksfunctie Name: Bedrijfsfunctie
But: de IfcSpace bedrijfsfunctie niet meer is dan 30% van de space BVO.
Then: Het gebruik van het gebouw is in overeenstemming met de specifieke gebruiksregels. */

export default class Controle2WonenBedrijfsfunctie extends BaseControle<SparqlInputs, GroepsData> {
  public naam = 'Wonen: Bedrijfsfunctie'

  async voorbereiding(context: StepContext): Promise<SparqlInputs> {
    const ruimtelijkePlannen = new RuimtelijkePlannenAPI(process.env.RP_API_TOKEN ?? '')
    const data = this.groepData()
    const planIds: string[] = data.planIds

    const bestemmingsvlakken: any[] = (
      await Promise.all(
        planIds.flatMap(async (planId) => {
          const response = await ruimtelijkePlannen.bestemmingsvlakZoek(planId, data.geoShape)
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

    this.log(`Bestemmingsvlak is van type ${gebruiksfunctie}`)

    return { gebruiksfunctie }
  }

  isToepasbaar({ gebruiksfunctie }: SparqlInputs): boolean {
    return gebruiksfunctie == 'wonen'
  }

  // Pulled from <https://demo.triplydb.com/rotterdam/-/queries/4gebruiksfunctiePercentage/2>
  sparql(): string {
    return `
prefix ifc: <https://standards.buildingsmart.org/IFC/DEV/IFC4/ADD2/OWL#>
prefix express: <https://w3id.org/express#>

select ?result ?success where {
  {
    #to find a gebruiksdoel
    {
      select (count(?space)*100 as ?totalK) where {
        ?this a ifc:IfcBuilding.

        [] ifc:relatingObject_IfcRelAggregates ?this;
           ifc:relatedObjects_IfcRelAggregates ?storey.

        [] ifc:relatingStructure_IfcRelContainedInSpatialStructure ?storey.
        [] ifc:relatedObjects_IfcRelAggregates ?storey.
        ?storey a ifc:IfcBuildingStorey;
                ifc:name_IfcRoot/express:hasString ?name.
        ?related ifc:relatedObjects_IfcRelAggregates ?space.
        ?space a ifc:IfcSpace;
               ifc:longName_IfcSpatialElement/express:hasString ?value.
        filter(regex(str(?value), "BVO", 'i'))
        ?Property a ifc:IfcRelDefinesByProperties;
                  ifc:relatedObjects_IfcRelDefinesByProperties ?space;
                  ifc:relatingPropertyDefinition_IfcRelDefinesByProperties ?set.
        ?set a ifc:IfcPropertySet;
             ifc:hasProperties_IfcPropertySet ?single.
        ?single ifc:nominalValue_IfcPropertySingleValue/express:hasString ?func.
        # filter(?func!="01")
        filter(regex(str(?func), "kantoor", 'i'))
      }
      limit 1
    }
  }

  {
    select (count(?space) as ?totalW) where {
      ?this a ifc:IfcBuilding.

      [] ifc:relatingObject_IfcRelAggregates ?this;
         ifc:relatedObjects_IfcRelAggregates ?storey.

      [] ifc:relatingStructure_IfcRelContainedInSpatialStructure ?storey.
      [] ifc:relatedObjects_IfcRelAggregates ?storey.
      ?storey a ifc:IfcBuildingStorey;
              ifc:name_IfcRoot/express:hasString ?name.
      ?related ifc:relatedObjects_IfcRelAggregates ?space.
      ?space a ifc:IfcSpace;
             ifc:longName_IfcSpatialElement/express:hasString ?value.
      filter(regex(str(?value), "BVO", 'i'))
      {
        ?Property a ifc:IfcRelDefinesByProperties;
                  ifc:relatedObjects_IfcRelDefinesByProperties ?space;
                  ifc:relatingPropertyDefinition_IfcRelDefinesByProperties ?set.
        ?set a ifc:IfcPropertySet;
             ifc:hasProperties_IfcPropertySet ?single.
        ?single ifc:nominalValue_IfcPropertySingleValue/express:hasString ?func.
        # filter(?func!="01")
        filter(regex(str(?func), "functie", 'i'))
      }
    }
  }
  bind((?totalK/?totalW) as ?result)
  bind(IF(?result < 30, true, false) AS ?success)
}
limit 1
  `
  }

  bericht(): string {
    return `Bedrijfsfunctie is {?result}%.`
  }
}
