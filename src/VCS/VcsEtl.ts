import {
  fromCsv,
  loadRdf,
  Middleware,
  MiddlewareList,
  Source,
  toTriplyDb,
} from "@triplyetl/etl/generic";
import App from "@triply/triplydb";
import * as fs from "fs";
import VCS from "./VcsClass.js";
import { update } from "@triplyetl/etl/sparql";
import { destination } from "../utils/sources-destinations.js";
import { addMwCallSiteToError } from "@triplyetl/etl/utils";

async function readFile(filePath: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    fs.readFile(filePath, "utf8", (err, data) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(data);
    });
  });
}

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
export async function vcsEtl(
  ifcFilePath: string,
  idsFilePath?: string,
  opts: VcsOptions = {
    baseIRI: "https://www.example.org/vcs/",
  }
): Promise<MiddlewareList> {
    return new Promise<MiddlewareList>(async (resolve, reject) => {
        const vcs = new VCS(ifcFilePath);
        const triply = App.get({ token: process.env.TRIPLYDB_TOKEN });
        const dataset = await (
            await triply.getAccount()
        ).getDataset(destination.vergunningscontroleservice.dataset.name);

        // VCS IDS Validation
        if (idsFilePath) {
            try {
            await vcs.IFC.validateWithIds(idsFilePath);
            } catch (error) {
            console.error("Error during validation! Uploading IDS Validation Report");
            await dataset.uploadAsset("./data/IDSValidationReport.html");
            reject(error)
            }
        }

        // VCS Transform IFC to RDF
        const ifcTransform = vcs.IFC.transform();
        await ifcTransform.IFCtoIFCOWL(opts.baseIRI!);

        // await ifcTransform.extractWKTCoordinates(); // not needed
        await ifcTransform.extractFootprint();
        await ifcTransform.IFCtoGLTF();

        // upload assets to dataset
        await dataset.uploadAsset("./data/output.gltf");
        await dataset.uploadAsset("./data/IDSValidationReport.html");

        // read all data and upload local files as assets
        const polygon: string = await readFile("data/footprint.txt");

        const mwList = [
            loadRdf(Source.file("./data/ifcOwlData.ttl")),
            fromCsv(Source.file("./data/footprint.csv")),
            update(`
            PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
            PREFIX ifc: <http://standards.buildingsmart.org/IFC/DEV/IFC4_3/RC1/OWL#>
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

                BIND("${polygon}}" AS ?wktLiteral)
            }

            `),
            // upload data to Triply DB
            toTriplyDb(destination.vergunningscontroleservice)
    ]
        resolve(mwList)
    })
}

// given a dictionary with keys being the rule identifiers and the values the SHACL constraint elements, we generate a SHACL file
export async function vcsGenerateShacl(
  dictionary: { [key: string]: string }
//   geometry?: Geometry
): Promise<Middleware> {
    return addMwCallSiteToError(
                async function _vcsGenerateShacl(_ctx, next) {
                    // Initialize the output string for SHACL Constraint
                    let shaclConstraint =`
                    # External prefix declarations
                    prefix dbo:   <http://dbpedia.org/ontology/>
                    prefix rdfs:  <http://www.w3.org/2000/01/rdf-schema#>
                    prefix sh:    <http://www.w3.org/ns/shacl#>
                    prefix xsd:   <http://www.w3.org/2001/XMLSchema#>
                    
                    # Project-specific prefix
                    prefix def:   <https://demo.triplydb.com/rotterdam/vcs/model/def/>
                    prefix graph: <https://demo.triplydb.com/rotterdam/vcs/graph/>
                    prefix shp:   <https://demo.triplydb.com/rotterdam/vcs/model/shp/>
                    
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
                    // PREFIX ifc: <http://standards.buildingsmart.org/IFC/DEV/IFC4_3/RC1/OWL#>
                    // PREFIX express: <https://w3id.org/express#>
                    // PREFIX geo: <http://www.opengis.net/ont/geosparql#>
        
                    // SELECT ?wktLiteral
                    // WHERE {
                    //     ?storey a ifc:IfcBuildingStorey;
                    //             ifc:name_IfcRoot ?storeyLabel.
                    //     ?storeyLabel a ifc:IfcLabel;
                    //                 express:hasString "00 begane grond";
                    //                 geo:asWKT ?wktLiteral.
                    // }
                    // `

                    // [ ] query with geometry



                    // TODO get specific omgevingswaarde to fill in for rule
                    // const rulesIds = plannen.id

                    const rulesIds = ['id_1']

                    // Iterate through each rule id for the geometry
                    for (const articleID of rulesIds) {
                        // Check if the "wId" exists in the dictionary
                        if (dictionary[articleID]) {
                        shaclConstraint += dictionary[articleID];
                        }
                    }
                    // Write SHACL constraint to local file
                    const filePath = './data/constraintModel.ttl'

                    fs.writeFile(filePath, shaclConstraint, (err) => {
                        if (err) {
                          console.error('Error writing to file:', err);
                        }
                      });
                    // Upload as asset
                    // @phil maybe upload as graph instead?
                    const triply = App.get({ token: process.env.TRIPLYDB_TOKEN });
                    const dataset = await (
                        await triply.getAccount()
                    ).getDataset(destination.vergunningscontroleservice.dataset.name);
                    await dataset.uploadAsset(filePath);

                    return next()
            }
        )
}

const getMaxAantalBouwlagen = () => '2'

const maxBouwlaagRule = (retrievedNumberPositiveMaxBouwlagen: string) => {
    return `
shp:BuildingMaxAantalPositieveBouwlagenSparql
  a sh:SPARQLConstraint;
  sh:message 'Gebouw {?this} heeft {?aantalBouwlagen}, dit moet ${retrievedNumberPositiveMaxBouwlagen} zijn.';
  sh:severity sh:Violation;
  sh:datatype xsd:string;
  sh:select '''
  PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
  PREFIX ifc: <http://standards.buildingsmart.org/IFC/DEV/IFC4_3/RC1/OWL#>
  PREFIX express: <https://w3id.org/express#>

  SELECT
    (COUNT(?positiveFloorLabel) + COUNT(?negativeFloorLabel) AS ?totalNumberOfFloors)
  WHERE {
    {
      SELECT ?positiveFloorLabel WHERE {
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
      SELECT ?negativeFloorLabel WHERE {
        ?storey a ifc:IfcBuildingStorey;
                ifc:name_IfcRoot ?storeyLabel.
        ?storeyLabel a ifc:IfcLabel;
                     express:hasString ?negativeFloorLabel.
        FILTER(REGEX(?negativeFloorLabel, "^-(0?[1-9]|[1-9][0-9]) .*")) # Matches negative floors starting from '-01'
      }
    }
  }
  FILTER(numPositiveFloors? > ${retrievedNumberPositiveMaxBouwlagen})
  '''.
`}

export const ruleIdShaclConstraintDictionary = {
"id_1": maxBouwlaagRule(getMaxAantalBouwlagen()),
"id_2": "Example SHACL Rule 2",
// Add more fake dictionary entries as needed
};
