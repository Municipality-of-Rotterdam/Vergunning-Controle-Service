import { Etl, toTriplyDb } from "@triplyetl/etl/generic";
import { destination } from "./utils/sources-destinations.js";
import { baseIri } from "./utils/declarations.js";
import {
  ruleIdShaclConstraintDictionary,
  vcsEtl,
  vcsGenerateShacl,
} from "./VCS/VcsEtl.js";
// TODO need time logging per request
// TODO and should have original applied rule text element included
// TODO vraag Abe over identifiers voor regels
// kijk in de github ter inspiratie

// TODO USE CASE OMGEVINGSACTIVITEIT (1-4 USE CASES)
// welstand bron data ophalen

// TECHNISCHE BOUWACTIVITEIT/TOETSING NIET AANWEZIG
export default async function (): Promise<Etl> {
  // Create an extract-transform-load (ETL) process.
  const etl = new Etl({ baseIri, defaultGraph: baseIri.concat("default") });
  const ifcFile = "static/example_data/Kievitsweg_R23_MVP_IFC4.ifc";
  const idsFile = 'static/example_data/IDS_Aanvulling ILS O-E testIFC4.ids'
  // const ifcWoodenWindow = 'static/example_data/IDS_wooden-windows_IFC.ifc'
  // const idsWoodWindow = 'static/example_data/IDS_wooden-windows.ids'
  etl.use(
    // await vcsEtl(ifcWoodenWindow, idsWoodWindow, {
    await vcsEtl(ifcFile, idsFile, {
      baseIRI: "https://www.roterdam.nl/vcs/graph/",
    }),
    await vcsGenerateShacl(ruleIdShaclConstraintDictionary),
    toTriplyDb(destination.vergunningscontroleservice)
  );
  return etl;
}
