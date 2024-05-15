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
// TODO support CBF format outpu
// TODO fix validation bug
// TODO fix API ruimtelijke plannen
// kijk in de github ter inspiratie -- link?

// TODO USE CASE OMGEVINGSACTIVITEIT (1-4 USE CASES)
// welstand bron data ophalen, nog niet regels/use cases aanpakken

// TODO Fix IDS rapportage -- IDS file needs to be fixed



// TECHNISCHE BOUWACTIVITEIT/TOETSING NIET AANWEZIG
export default async function (): Promise<Etl> {
  // Create an extract-transform-load (ETL) process.
  const etl = new Etl({ baseIri, defaultGraph: baseIri.concat("default") });
  const ifcFile = "static/example_data/Kievitsweg_R23_MVP_IFC4.ifc";
  // const idsFile = 'static/example_data/IDS_Aanvulling ILS O-E testIFC4.ids'
  // const ifcWoodenWindow = 'static/example_data/IDS_wooden-windows_IFC.ifc'
  // const idsWoodWindow = 'static/example_data/IDS_wooden-windows.ids'
  etl.use(
    // await vcsEtl(ifcWoodenWindow, idsWoodWindow, {
    await vcsEtl(ifcFile, undefined, {
      baseIRI: "https://www.roterdam.nl/vcs/graph/",
    }),
    await vcsGenerateShacl(ruleIdShaclConstraintDictionary),
    toTriplyDb(destination.vergunningscontroleservice)
  );
  return etl;
}
