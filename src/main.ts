import { Etl, loadRdf, toTriplyDb } from "@triplyetl/etl/generic";
import { destination, source } from "./utils/sources-destinations.js";
import { baseIri, graph } from "./utils/declarations.js";
import { vcsEtl, vcsGenerateShacl } from "./VCS/VcsEtl.js";
import { validate } from "@triplyetl/etl/shacl";

const ifcFile = "static/Kievitsweg_R23_MVP_IFC4.ifc";

export default async function (): Promise<Etl> {
  // Create an extract-transform-load (ETL) process.
  const etl = new Etl({ baseIri, defaultGraph: baseIri.concat("default") });

  const idsFile = "static/ids/IDS Rotterdam BIM.ids";

  etl.use(
    // without ids check
    // await vcsEtl(ifcFile, { baseIRI: "https://www.rotterdam.nl/vcs/" }),

    // with ids check
    await vcsEtl(ifcFile, idsFile, { baseIRI: "https://www.rotterdam.nl/vcs/" }),

    vcsGenerateShacl(),

    validate(source.model, {
      graph: graph.concat("report"),
      terminateOn: "Never",
    }),

    loadRdf(source.model),

    toTriplyDb(destination.vergunningscontroleservice),
  );

  return etl;
}
