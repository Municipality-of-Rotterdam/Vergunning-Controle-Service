import { Etl, toTriplyDb } from "@triplyetl/etl/generic";
import { destination } from "./utils/sources-destinations.js";
import { baseIri } from "./utils/declarations.js";
import {
  ruleIdShaclConstraintDictionary,
  vcsEtl,
  vcsGenerateShacl,
} from "./VCS/VcsEtl.js";

export default async function (): Promise<Etl> {
  // Create an extract-transform-load (ETL) process.
  const etl = new Etl({ baseIri, defaultGraph: baseIri.concat("default") });
  const ifcFile = "src/VCS/data/Kievitsweg_R23_MVP_IFC4.ifc";
  // const idsFile = 'src/VCS/data/IDS_Rotterdam_BIM.ids'
  etl.use(
    await vcsEtl(ifcFile, undefined, {
      baseIRI: "https://www.roterdam.nl/vcs/graph/",
    }),
    await vcsGenerateShacl(ruleIdShaclConstraintDictionary),
    toTriplyDb(destination.vergunningscontroleservice)
  );
  return etl;
}
