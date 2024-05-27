import {
  loadRdf,
  Middleware,
  MiddlewareList,
  Source,
  toTriplyDb,
} from "@triplyetl/etl/generic";
import App from "@triply/triplydb";
import * as path from "path";
import * as fs from "fs";
import VCS from "./VcsClass.js";
import { __dirname } from "./VcsClass.js";
import { update } from "@triplyetl/etl/sparql";
import { destination } from "../utils/sources-destinations.js";
import { addMwCallSiteToError } from "@triplyetl/etl/utils";

type VcsOptions = {
  baseIRI?: string;
};
// type GeoJSONPolygon = {
//   spatialOperator: string;
//   geometrie: {
//     type: "Polygon";
//     coordinates: number[][][];
//   };
// };

// type GeoJSONPoint = {
//   spatialOperator: string;
//   geometrie: {
//     type: "Point";
//     coordinates: number[];
//   };
// };

// type Geometry = GeoJSONPoint | GeoJSONPolygon;

// Should transform all IFC input data and upload to TriplyDB
// Overload signatures
export async function vcsEtl(
  ifcFilePath: string,
  opts?: VcsOptions
): Promise<MiddlewareList>;
export async function vcsEtl(
  ifcFilePath: string,
  idsFilePath?: string,
  opts?: VcsOptions
): Promise<MiddlewareList>;

// Implementation
export async function vcsEtl(
  ifcFilePath: string,
  idsFilePathOrOpts?: string | VcsOptions,
  opts: VcsOptions = {
    baseIRI: "https://www.example.org/vcs/",
  }
):  Promise<MiddlewareList> {
    let idsFilePath: string | undefined;
    if (typeof idsFilePathOrOpts === 'string') {
      idsFilePath = idsFilePathOrOpts;
    } else if (typeof idsFilePathOrOpts === 'object') {
      opts = idsFilePathOrOpts;
    }
    return new Promise<MiddlewareList>(async (resolve, _reject) => {
        const vcs = new VCS(ifcFilePath);
        const triply = App.get({ token: process.env.TRIPLYDB_TOKEN });
        const dataset = await (
            await triply.getAccount(destination.vergunningscontroleservice.account)
        ).getDataset(destination.vergunningscontroleservice.dataset.name);

       const reportPath = path.join(__dirname, "data", "IDSValidationReport.html")
       const footprintPath = path.join(__dirname, "data", "footprint.txt");
       const gltfPath = path.join(__dirname, "data", "output.gltf");
       const ifcOwlPath = path.join(__dirname, "data", "ifcOwlData.ttl");

        // VCS IDS Validation
        if (idsFilePath) {
            try {
            await vcs.IFC.validateWithIds(idsFilePath);
            } catch (error) {
                console.error("Error during validation! Uploading IDS Validation Report");
                try {
                    const asset = await dataset.getAsset(reportPath);
                    await asset.delete()
                } catch (error) {
                }
                if (fs.existsSync(reportPath)){
                  await dataset.uploadAsset(reportPath);
                }
            }

            try {
                const asset = await dataset.getAsset(reportPath)
                await asset.delete()
            } catch (error) {
            }

            await dataset.uploadAsset(reportPath);
        }

        // VCS Transform IFC to RDF
        const ifcTransform = vcs.IFC.transform();
        await ifcTransform.IFCtoIFCOWL(opts.baseIRI!);

        // await ifcTransform.extractWKTCoordinates(); // not needed
        await ifcTransform.extractFootprint();
        await ifcTransform.IFCtoGLTF();

        // upload assets to dataset
        try {
            const asset = await dataset.getAsset(gltfPath)
            await asset.delete()
        } catch (error) {
        }
        await dataset.uploadAsset(gltfPath);
        // read all data and upload local files as assets
        const polygon: string = await fs.promises.readFile(footprintPath, 'utf-8');

        const mwList = [
            loadRdf(Source.file(ifcOwlPath)),
            update(`
            PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
            PREFIX ifc: <http://standards.buildingsmart.org/IFC/DEV/IFC4/ADD1/OWL#>
            PREFIX express: <https://w3id.org/express#>
            PREFIX geo: <http://www.opengis.net/ont/geosparql#>

            INSERT {
                ?storeyLabel geo:asWKT ?wktLiteral .
            }
            WHERE {
                ?storey a ifc:IfcBuildingStorey;
                        ifc:name_IfcRoot ?storeyLabel.
                ?storeyLabel a ifc:IfcLabel;
                            express:hasString "00 begane grond".

                BIND("${polygon}" AS ?wktLiteral)
            }

            `),
            // upload data to Triply DB
            toTriplyDb(destination.vergunningscontroleservice)
    ]
        resolve(mwList)
    })
}

// given a dictionary with keys being the rule identifiers and the values the SHACL constraint elements, we generate a SHACL file
// TODO This can be improved to use an AST or datafactory objects to generate the SHACL model, instead of string manipulation (current approach)
export async function vcsGenerateShacl(
  dictionary: { [key: string]: string[] }
//   geometry?: Geometry
): Promise<Middleware> {
    return addMwCallSiteToError(
                async function _vcsGenerateShacl(_ctx, next) {
                    // Initialize the output string for SHACL Constraint
                    let shaclConstraint = (sparqlConstraintNodeNames: string, sparqlConstraintNodes: string) => `

# External prefix declarations
prefix dbo:   <http://dbpedia.org/ontology/>
prefix rdfs:  <http://www.w3.org/2000/01/rdf-schema#>
prefix sh:    <http://www.w3.org/ns/shacl#>
prefix xsd:   <http://www.w3.org/2001/XMLSchema#>

# Project-specific prefix
prefix def:   <https://demo.triplydb.com/rotterdam/vcs/model/def/>
prefix graph: <https://demo.triplydb.com/rotterdam/vcs/graph/>
prefix ifc: <http://standards.buildingsmart.org/IFC/DEV/IFC4/ADD1/OWL#>
prefix shp:   <https://demo.triplydb.com/rotterdam/vcs/model/shp/>
graph:model {
  shp:Building
   a sh:NodeShape;
   sh:targetClass ifc:IfcBuilding;
   sh:sparql
    ${sparqlConstraintNodeNames}
  ${sparqlConstraintNodes}
  }    
`;

                    // get the rule IDs
            
                    // const api = new VCS('').API.RuimtelijkePlannen()
                    // const plannen = await api.plannen(geometry!)
                    // const artikelen = await api.artikelen({})
                    // const bestemmingsvlakZoek = await api.bestemmingsvlakZoek({})
                    // const maatvoeringen = await api.maatvoeringen('')
                    // const teksten = await api.teksten({})
                    // console.log('🪵  | _vcsGenerateShacl | plannen:', plannen)
                    // const id = plannen.id

                    // TODO get the specific rules for given geometry
                    // [ ] get the footprint with query
                    // const getFootprintWkt = `
                    // PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
                    // PREFIX ifc: <http://standards.buildingsmart.org/IFC/DEV/IFC4/ADD1/OWL#>
                    // PREFIX express: <https://w3id.org/express#>
                    // PREFIX geo: <http://www.opengis.net/ont/geosparql#>
                            
                    // SELECT ?wktLiteral
                    // WHERE {
                    //   ?storey a ifc:IfcBuildingStorey;
                    //           ifc:name_IfcRoot ?storeyLabel.
                    //   ?storeyLabel a ifc:IfcLabel;
                    //               express:hasString "00 begane grond";
                    //               geo:asWKT ?wktLiteral.
                    // }
                    // `

                    // [ ] query with geometry



                    // TODO get specific omgevingswaarde to fill in for rule
                    // const rulesIds = plannen.id

                    const rulesIds = ['id_1']

                    // Iterate through each rule id for the geometry
                    let sparqlConstraintNodeNames: string = ''
                    let sparqlConstraintNodes: string = ''
                    for (let index = 0; index < rulesIds.length; index++) {
                      const articleID = rulesIds[index];
                      if (dictionary[articleID]) {
                        sparqlConstraintNodeNames += dictionary[articleID][0] + `${index +1 == rulesIds.length ? '. \n' : '; \n'}`;
                        sparqlConstraintNodes += dictionary[articleID][1] + '\n'
                      }
                    }

                    const shaclConstrainModel = shaclConstraint(sparqlConstraintNodeNames, sparqlConstraintNodes)

                    // Write SHACL constraint to local file
                    const shaclModelFilePath = path.join(__dirname, 'data', 'model.trig')
                    try {
                      await fs.promises.writeFile(shaclModelFilePath, shaclConstrainModel)
                    } catch (error) {
                      throw error
                    }

                    // ... and as an asset to TriplyDB
                    const triply = App.get({ token: process.env.TRIPLYDB_TOKEN });
                    const dataset = await (
                      await triply.getAccount(destination.vergunningscontroleservice.account)
                    ).getDataset(destination.vergunningscontroleservice.dataset.name);

                    try {
                      const asset = await dataset.getAsset(shaclModelFilePath)
                      await asset.delete()
                    } catch (error) {
                    }
                    await dataset.uploadAsset(shaclModelFilePath);

                    return next()
            }
        )
}

const getMaxAantalBouwlagen = () => '2'

const maxBouwlaagRule = (retrievedNumberPositiveMaxBouwlagen: string) => {
    return `
shp:BuildingMaxAantalPositieveBouwlagenSparql
  a sh:SPARQLConstraint;
  sh:message 'Gebouw {?this} heeft in totaal {?totalNumberOfFloors} bouwlagen, dit mag maximaal ${retrievedNumberPositiveMaxBouwlagen} zijn.';
  sh:severity sh:Violation;
  sh:datatype xsd:string;
  sh:select '''
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX ifc: <http://standards.buildingsmart.org/IFC/DEV/IFC4/ADD1/OWL#>
PREFIX express: <https://w3id.org/express#>

SELECT ?this ?totalNumberOfFloors
WHERE {
  {
    SELECT ?this (COUNT(?positiveFloorLabel) + COUNT(?negativeFloorLabel) AS ?totalNumberOfFloors)
    WHERE {
      {
        SELECT ?this ?positiveFloorLabel WHERE {
          ?this a ifc:IfcBuilding .
          ?storey a ifc:IfcBuildingStorey;
                  ifc:name_IfcRoot ?storeyLabel.
          ?storeyLabel a ifc:IfcLabel;
                      express:hasString ?positiveFloorLabel.
          FILTER(REGEX(?positiveFloorLabel, "^(0?[1-9]|[1-9][0-9]) .*")) # Matches positive floors starting from '01'
          FILTER(?positiveFloorLabel != "00 begane grond") # Excludes '00 begane grond'
        }
      }
      UNION
      {
        SELECT ?this ?negativeFloorLabel WHERE {
          ?this a ifc:IfcBuilding .
          ?storey a ifc:IfcBuildingStorey;
                  ifc:name_IfcRoot ?storeyLabel.
          ?storeyLabel a ifc:IfcLabel;
                       express:hasString ?negativeFloorLabel.
          FILTER(REGEX(?negativeFloorLabel, "^-(0?[1-9]|[1-9][0-9]) .*")) # Matches negative floors starting from '-01'
        }
      }
    }
    GROUP BY ?this
  }
  FILTER (?totalNumberOfFloors > ${retrievedNumberPositiveMaxBouwlagen})
}
  '''.
`}

export const ruleIdShaclConstraintDictionary = {
"id_1": ["shp:BuildingMaxAantalPositieveBouwlagenSparql", maxBouwlaagRule(getMaxAantalBouwlagen())],
"id_2": ["NodeName", "NodeRule"],
// Add more fake dictionary entries as needed
};
