import { loadRdf, Middleware, MiddlewareList, Source } from "@triplyetl/etl/generic";
import App from "@triply/triplydb";
import * as path from "path";
import * as fs from "fs";
import VCS from "./VCSClass.js";
import API from "./APIClass.js";
import { __dirname } from "./VCSClass.js";
import { update } from "@triplyetl/etl/sparql";
import { destination } from "../utils/sources-destinations.js";
import { addMwCallSiteToError } from "@triplyetl/etl/utils";
// import { parsePolygonString } from "./helperFunctions.js";

type VcsOptions = {
  baseIRI?: string;
};

// Overload signatures
// Should transform all IFC input data and upload to TriplyDB
export async function vcsEtl(ifcFilePath: string, opts?: VcsOptions): Promise<MiddlewareList>;
export async function vcsEtl(ifcFilePath: string, idsFilePath?: string, opts?: VcsOptions): Promise<MiddlewareList>;

// Implementation
export async function vcsEtl(
  ifcFilePath: string,
  idsFilePathOrOpts?: string | VcsOptions,
  opts: VcsOptions = {
    baseIRI: "https://www.example.org/vcs/",
  },
): Promise<MiddlewareList> {
  let idsFilePath: string | undefined;
  if (typeof idsFilePathOrOpts === "string") {
    idsFilePath = idsFilePathOrOpts;
  } else if (typeof idsFilePathOrOpts === "object") {
    opts = idsFilePathOrOpts;
  }
  return new Promise<MiddlewareList>(async (resolve, _reject) => {
    const gltfName = "3dmodel";
    const vcs = new VCS(ifcFilePath, gltfName);
    const triply = App.get({ token: process.env.TRIPLYDB_TOKEN });
    const user = await triply.getAccount(destination.vergunningscontroleservice.account);
    const dataset = await user.getDataset(destination.vergunningscontroleservice.dataset.name);

    const reportPath = path.join(__dirname, "data", "IDSValidationReport.html");
    const footprintPath = path.join(__dirname, "data", "footprint.txt");
    const gltfPath = path.join(__dirname, "data", gltfName + ".gltf");
    const ifcOwlPath = path.join(__dirname, "data", "ifcOwlData.ttl");

    // VCS IDS Validation
    if (idsFilePath) {
      try {
        await vcs.IFC.validateWithIds(idsFilePath);
      } catch (error) {
        console.error("Error during validation! Uploading IDS Validation Report");
        try {
          const asset = await dataset.getAsset(reportPath);
          await asset.delete();
        } catch (error) {}
        if (fs.existsSync(reportPath)) {
          await dataset.uploadAsset(reportPath);
        }
      }

      try {
        const asset = await dataset.getAsset(reportPath);
        await asset.delete();
      } catch (error) {}
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
      const asset = await dataset.getAsset(gltfName + ".gltf");
      await asset.delete();
    } catch (error) {}
    await dataset.uploadAsset(gltfPath, gltfName + ".gltf");
    // read all data and upload local files as assets
    const polygon: string = await fs.promises.readFile(footprintPath, "utf-8");

    const mwList = [
      loadRdf(Source.file(ifcOwlPath)),
      update(`
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
    ];
    resolve(mwList);
  });
}

// given a dictionary with keys being the rule identifiers and the values the SHACL constraint elements, we generate a SHACL file
// TODO This can be improved to use an AST or datafactory objects to generate the SHACL model, instead of string manipulation (current approach)
export function vcsGenerateShacl(): Middleware {
  //dictionary: { [key: string]: string[] },
  //   geometry?: Geometry
  return addMwCallSiteToError(async function _vcsGenerateShacl(_ctx, next) {
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
    ${sparqlConstraintNodeNames}.
  ${sparqlConstraintNodes}
  }    
`;
    //const usedRulesIds = [];
    const api = new API();
    const ruimtelijkePlannen = api.RuimtelijkePlannen.RuimtelijkePlannen();
    // const polygon: string = await fs.promises.readFile("data/footprint.txt", "utf-8");
    // const coordinates = parsePolygonString(polygon);
    const coordinates = [
      [84116, 431825],
      [84121, 431825],
      [84121, 431829],
      [84116, 431829],
      [84116, 431825],
    ]; // Hardcoded test coordinates that are fully contained in a 'bestemmingsvlak'
    const jsonObj = {
      _geo: {
        contains: {
          type: "Polygon",
          coordinates: [coordinates],
        },
      },
    };

    // We get all the 'bestemmingsplannen' relevant to the given polygon
    let plans = await ruimtelijkePlannen.plannen(jsonObj, `?planType=bestemmingsplan`);
    let planIds: string[] = new Array();
    for (const plan of plans["_embedded"]["plannen"]) {
      // Umbrella plans are probably irrelevant, cf <https://www.jurable.nl/blog/2018/11/07/paraplubestemmingsplan/>
      if (!plan.isParapluplan) {
        planIds.push(plan["id"]);
      }
    }

    // Find 'maximum aantal bouwlagen' as indicated in *each* plan's 'maatvoering'. Of course, we expect to only find one
    const target = "maximum aantal bouwlagen";
    const maatvoeringen: any[] = new Array();
    for (const id of planIds) {
      let reply = await ruimtelijkePlannen.maatvoeringen(id, jsonObj);
      for (const maatvoering of reply["_embedded"]["maatvoeringen"]) {
        if (maatvoering["naam"] == target) {
          maatvoeringen.push(maatvoering);
        }
      }
    }

    let maxBouwlagen: string = "";
    if (maatvoeringen.length == 0) {
      throw new Error("Er is geen enkele maatvoering voor het gegeven bestemmingsvlak.");
    } else if (maatvoeringen.length > 1) {
      throw new Error("Er zijn meerdere maatvoeringen voor het gegeven bestemmingsvlak.");
    } else {
      for (const omvang of maatvoeringen[0]["omvang"]) {
        if (maxBouwlagen == "") {
          maxBouwlagen = omvang["waarde"];
        } else {
          throw new Error("Meerdere waardes voor omvang gegeven.");
        }
      }
    }

    const shaclConstraintModel = shaclConstraint(
      "shp:BuildingMaxAantalPositieveBouwlagenSparql",
      maxBouwlaagRule(maxBouwlagen),
    );
    // Write SHACL constraint to local file
    const shaclModelFilePath = path.join(__dirname, "data", "model.trig");
    await fs.promises.writeFile(shaclModelFilePath, shaclConstraintModel);
    return next();
  });
}

const maxBouwlaagRule = (retrievedNumberPositiveMaxBouwlagen: string) => {
  return `
shp:BuildingMaxAantalPositieveBouwlagenSparql
  a sh:SPARQLConstraint;
  sh:message 'Gebouw {?this} heeft in totaal {?totalNumberOfFloors} bouwlagen, dit mag maximaal ${retrievedNumberPositiveMaxBouwlagen} zijn.';
  sh:severity sh:Violation;
  sh:datatype xsd:string;
  sh:select '''
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
`;
};
