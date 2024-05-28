import { Etl, loadRdf, Source, toTriplyDb } from "@triplyetl/etl/generic";
import { validate } from "@triplyetl/etl/shacl";
import { source, destination } from "./utils/sources-destinations.js";
import { baseIri, graph } from "./utils/declarations.js";

export default async function (): Promise<Etl> {
  // Get constraint file and validate IFC data
  const etl = new Etl({ baseIri, defaultGraph: baseIri.concat("default") });

  const rdfSource = destination.vergunningscontroleservice.account
    ? Source.TriplyDb.rdf(
      destination.vergunningscontroleservice.account,
      destination.vergunningscontroleservice.dataset.name)
    : Source.TriplyDb.rdf(
      destination.vergunningscontroleservice.dataset.name);

  etl.use(
    loadRdf(rdfSource),
    validate(source.model, {
      graph: graph.concat("report"),
      terminateOn: "Never",
    }),
    toTriplyDb(destination.vergunningscontroleservice),
  );
  await etl.copySource(source.model, destination.vergunningscontroleservice);
  return etl;
}
