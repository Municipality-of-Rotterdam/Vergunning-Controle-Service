import { Etl, loadRdf, toTriplyDb } from "@triplyetl/etl/generic";
import { destination, source } from "./utils/sources-destinations.js";
import { baseIri } from "./utils/declarations.js";
import { ruleIdShaclConstraintDictionary, vcsEtl, vcsGenerateShacl } from "./VCS/VcsEtl.js";

const ifcFile = "static/Kievitsweg_R23_MVP_IFC4.ifc";

export default async function (): Promise<Etl> {
  // Create an extract-transform-load (ETL) process.
  const etl = new Etl({ baseIri, defaultGraph: baseIri.concat("default") });

  etl.use(
    // without ids check
    await vcsEtl(ifcFile, { baseIRI: "https://www.rotterdam.nl/vcs/" }),

    // with ids check
    // const idsFile = "static/example_data/IDS Rotterdam BIM.ids";
    // await vcsEtl(ifcFile, idsFile, { baseIRI: "https://www.rotterdam.nl/vcs/" }),

    vcsGenerateShacl(ruleIdShaclConstraintDictionary),
    loadRdf(source.model),
    toTriplyDb(destination.vergunningscontroleservice),
  );

  return etl;
}
