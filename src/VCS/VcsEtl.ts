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
import * as xml2js from "xml2js";
import { parsePolygonString } from "./helperFunctions.js";

type VcsOptions = {
  baseIRI?: string;
};

// Overload signatures
// Should transform all IFC input data and upload to TriplyDB
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
        const user = await triply.getAccount(destination.vergunningscontroleservice.account);
        const dataset = await user.getDataset(destination.vergunningscontroleservice.dataset.name);

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
      toTriplyDb(destination.vergunningscontroleservice),
    ];
    resolve(mwList);
  });
}

// given a dictionary with keys being the rule identifiers and the values the SHACL constraint elements, we generate a SHACL file
// TODO This can be improved to use an AST or datafactory objects to generate the SHACL model, instead of string manipulation (current approach)
export function vcsGenerateShacl(
  dictionary: { [key: string]: string[] }
//   geometry?: Geometry
): Middleware {
    return addMwCallSiteToError(
                async function _vcsGenerateShacl(_ctx, next) {
                    // Initialize the output string for SHACL Constraint
                    let shaclConstraint = (
                      sparqlConstraintNodeNames: string,
                      sparqlConstraintNodes: string
                    ) => `

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
    const usedRulesIds = [];
    const vcs = new VCS("");
    const ruimtelijkePlannen = vcs.API.RuimtelijkePlannen();
    const polygon: string = await fs.promises.readFile(
      "data/footprint.txt",
      "utf-8"
    );
    const coordinates = parsePolygonString(polygon);
    const totalPlannen: Set<any> = new Set();
    const totalTeksten: Set<any> = new Set();
    const jsonObj = {
      _geo: {
        intersects: {
          type: "Polygon",
          coordinates: [coordinates],
        },
      },
    };
    let pageNum = 1;
    let planId;

    // First we get all the plannen from the API
    while (true) {
      const plannenRequest = await ruimtelijkePlannen.plannen(
        jsonObj,
        `?page=${pageNum}`
      );
      const plannen = plannenRequest["_embedded"]["plannen"];
      if (plannen.length == 0) {
        break;
      } else {
        plannen.forEach((plan: object) => {
          totalPlannen.add(plan);
        });
        pageNum++;
      }
    }
    pageNum = 1;

    // Out of these plans we want to grab the Hoogvliet Noordoost plan id
    // This information was looked up by investigating https://omgevingswet.overheid.nl/regels-op-de-kaart/viewer/(documenten/gemeente//rechter-paneel:document/NL.IMRO.0599.BP1133HvtNoord-va01/regels)?regelsandere=regels&locatie-stelsel=RD&locatie-x=84207&locatie-y=431716&session=ec9787ea-19c5-4919-bda9-9fb778e38691&geodocId=NL-IMRO-0599-BP1133HvtNoord-va01-2&locatie-getekend-gebied=POLYGON((84118.677%20431760.27,84094.175%20431771.98,84100.696%20431805.561,84135.786%20431792.836,84118.677%20431760.27))
    for (const plan of totalPlannen) {
      if (plan["naam"] == "Hoogvliet Noordoost") {
        planId = plan["id"];
      }
    }

    // Paginate over all the article elements from the given plan id for Hoogvliet Noordoost
    while (true) {
      const tekstenRequest = await ruimtelijkePlannen.tekstenZoek(
        planId!,
        jsonObj,
        `?page=${pageNum}`
      );
      const teksten = tekstenRequest["_embedded"]["teksten"];
      if (teksten.length == 0) {
        break;
      } else {
        teksten.forEach((tekst: object) => {
          totalTeksten.add(tekst);
        });
        pageNum++;
      }
    }

    // Loop over the elements, we know the max bouwlagen rule is in article 23.2.2 Bebouwingsnormen from the regels op de kaart website
    for (const tekst of totalTeksten) {
      if (tekst["titel"] == "Artikel 23 Wonen") {
        for (const element of tekst["_links"]["children"]) {
          const parts = element["href"].split("/");
          const tekstId = parts[parts.length - 1];
          if (tekstId == "NL.IMRO.PT.regels._23.2_Bouwregels") {
            const art23_2 = await ruimtelijkePlannen.enkeleTekst(
              planId,
              tekstId
            );
            for (const norm of art23_2["_links"]["children"]) {
              const parts = norm["href"].split("/");
              const normId = parts[parts.length - 1];
              if (normId == "NL.IMRO.PT.regels._23.2.2_Bebouwingsnormen") {
                const regel = await ruimtelijkePlannen.enkeleTekst(
                  planId,
                  normId
                );
                const regelTeksten = (
                  await xml2js.parseStringPromise(regel["inhoud"])
                )["ol"]["li"];
                for (const regelTekst of regelTeksten) {
                  const retrievedRegelTekst = regelTekst["_"];
                  if (
                    retrievedRegelTekst ==
                    'de bouwhoogte van gebouwen mag niet meer bedragen dan met de aanduiding "maximum aantal bouwlagen" op de verbeelding is aangegeven;'
                  ) {
                    _ctx.app.info(
                      "Voor de gegeven geometrie is de maximum aantal bouwlagen regel gevonden! De representatieve SHACL regel is toegevoegd aan het model."
                    );
                    usedRulesIds.push("maxbouwlagen");
                  }
                }
              }
            }
          }
        }
      }
    }

    // Iterate through each rule id for the geometry
    let sparqlConstraintNodeNames: string = "";
    let sparqlConstraintNodes: string = "";
    for (let index = 0; index < usedRulesIds.length; index++) {
      const articleID = usedRulesIds[index];
      if (dictionary[articleID]) {
        sparqlConstraintNodeNames +=
          dictionary[articleID][0] +
          `${index + 1 == usedRulesIds.length ? ". \n" : "; \n"}`;
        sparqlConstraintNodes += dictionary[articleID][1] + "\n";
      }
    }

                    const shaclConstrainModel = shaclConstraint(
                      sparqlConstraintNodeNames,
                      sparqlConstraintNodes)
                    // Write SHACL constraint to local file
                    const shaclModelFilePath = path.join(__dirname, 'data', 'model.trig')
                    await fs.promises.writeFile(shaclModelFilePath, shaclConstrainModel)
                    // ... and as an asset to TriplyDB
                    const triply = App.get({ token: process.env.TRIPLYDB_TOKEN });
                    const user = await triply.getAccount(destination.vergunningscontroleservice.account)
                    const dataset = await user.getDataset(destination.vergunningscontroleservice.dataset.name);
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

// TODO this value needs to be grapped with WFS query
const getMaxAantalBouwlagen = () => "2";

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
`;
};

// Add more dictionary entries for the use case here
export const ruleIdShaclConstraintDictionary = {
  maxbouwlagen: [
    "shp:BuildingMaxAantalPositieveBouwlagenSparql",
    maxBouwlaagRule(getMaxAantalBouwlagen()),
  ],
  customRuleName: ["NodeName", "NodeRule"],
};
