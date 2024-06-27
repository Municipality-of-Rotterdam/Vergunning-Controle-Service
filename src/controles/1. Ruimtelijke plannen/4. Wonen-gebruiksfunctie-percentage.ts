import { BaseControle } from '@core/BaseControle.js'
import { NamedNode } from '@rdfjs/types'
import { StepContext } from '@root/core/executeSteps.js'
import { RuimtelijkePlannenAPI } from '@bronnen/RuimtelijkePlannen.js'

type SparqlInputs = {
  gebruiksfunctie: string
}

export default class Controle2WonenGebruiksfunctiePercentage extends BaseControle<SparqlInputs> {
  public naam = 'Gebruiksfunctie percentage wonen'

  async voorbereiding(context: StepContext): Promise<SparqlInputs> {
    const coordinates = context.voetprintCoordinates
    const ruimtelijkePlannen = new RuimtelijkePlannenAPI(process.env.RP_API_TOKEN ?? '')
    const geoShape = { _geo: { contains: { type: 'Polygon', coordinates: [coordinates] } } }
    const plans = (await ruimtelijkePlannen.plannen(geoShape, { planType: 'bestemmingsplan' }))['_embedded']['plannen']
    const planIds: string[] = plans.filter((plan: any) => !plan.isParapluplan).map((plan: any) => plan.id)

    this.log(`De volgende bestemmingsplan(nen) gevonden: \n${planIds.map((id) => `\t${id}`).join('\n')}`)

    const bestemmingsvlakken: any[] = (
      await Promise.all(
        planIds.flatMap(async (planId) => {
          const response = await ruimtelijkePlannen.bestemmingsvlakZoek(planId, geoShape)
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

  // Pulled from <https://demo.triplydb.com/rotterdam/-/queries/4gebruiksfunctiePercentage/2>
  sparql({ gebruiksfunctie }: SparqlInputs): string {
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

  berichtGefaald({ gebruiksfunctie }: SparqlInputs): string {
    return `Kantoor beslaat {?result}%.`
  }
  berichtGeslaagd({ gebruiksfunctie }: SparqlInputs): string {
    return `Kantoor beslaat {?result}%.`
  }
}
