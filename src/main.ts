import { Etl, toTriplyDb } from "@triplyetl/etl/generic";
import { destination } from "./utils/sources-destinations.js";
import { baseIri } from "./utils/declarations.js";
import {
  ruleIdShaclConstraintDictionary,
  vcsEtl,
  vcsGenerateShacl,
} from "./VCS/VcsEtl.js";

// FOR CI
// TODO need a pyhton + nodeJS + java image | or we need to create one


// FOR ETL
// TODO need time logging per request
// TODO should have original applied rule (juridische regel) text element included
// TODO vraag Abe over identifiers voor regels
// TODO fix API ruimtelijke plannen

// TODO USE CASE OMGEVINGSACTIVITEIT (1-4 USE CASES)
// welstand bron data ophalen, nog niet regels/use cases aanpakken

export default async function (): Promise<Etl> {
  // Create an extract-transform-load (ETL) process.
  const etl = new Etl({ baseIri, defaultGraph: baseIri.concat("default") });
  const ifcFile = "static/example_data/Kievitsweg_R23_MVP_IFC4.ifc";
  // const idsFile = 'static/example_data/IDS Aanvulling ILS O-E.ids'
  // const ifcWoodenWindow = 'static/example_data/IDS_wooden-windows_IFC.ifc'
  // const idsWoodWindow = 'static/example_data/IDS_wooden-windows.ids'
  etl.use(
    await vcsEtl(ifcFile, {
    // await vcsEtl(ifcWoodenWindow, idsWoodWindow, {
      baseIRI: "https://www.roterdam.nl/vcs/graph/",
    }),
    await vcsGenerateShacl(ruleIdShaclConstraintDictionary),
    toTriplyDb(destination.vergunningscontroleservice)
  );
  return etl;
}