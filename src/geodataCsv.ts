import { Etl, Source, fromCsv, toTriplyDb, when } from "@triplyetl/etl/generic";
import { addIri, concat, iri, literal, pairs, str, triple } from "@triplyetl/etl/ratt";
import { a, geo, rdfs } from "@triplyetl/etl/vocab";
import { baseIri, id, graphGeoData as graph } from "./utils/declarations.js";
import { destination } from "./utils/sources-destinations.js";

export default async function (): Promise<Etl> {
  // Create an extract-transform-load (ETL) process.
  const etl = new Etl({ baseIri, defaultGraph: graph.concat("default") });
  etl.use(
    fromCsv(
      Source.file([
        "./static/example_data/geodata/aanduidingenL.csv",
        "./static/example_data/geodata/aanduidingLn.csv",
        "./static/example_data/geodata/aanduidingP.csv",
        "./static/example_data/geodata/aanduidingV.csv",
        "./static/example_data/geodata/bouwgebieden.csv",
        "./static/example_data/geodata/cultuurhistorie.csv",
        // "./static/example_data/geodata/cultuurhistorieN.csv",
        "./static/example_data/geodata/dubbeleBestem.csv",
        "./static/example_data/geodata/eenkelvoudigeBestem.csv",
        "./static/example_data/geodata/nummers.csv",
        "./static/example_data/geodata/nummersN.csv",
        //"./static/example_data/geodata/staandVr.csv",
        //"./static/example_data/geodata/standplaats.csv",
        "./static/example_data/geodata/vigerendeBestem.csv",
      ]),
    ),
    when(
      "PLANID",
      addIri({
        prefix: id.geo,
        content: "PLANID",
        key: "_geoID",
      }),

      // triple("_geoID", rdfs.label, "LAAG"),
      addIri({ prefix: id.geometry, content: "PLANID", key: "_geometry" }),

      pairs(
        "_geoID",
        [a, geo.Feature],
        [a, iri(str("http://definities.geostandaarden.nl/def/nen3610#GeoObject"))],
        [geo.hasGeometry, "_geometry"],
      ),

      concat({
        content: [str("<http://www.opengis.net/def/crs/EPSG/0/28992>"), "WKT"],
        separator: " ",
        key: "CRS-WKT",
      }),
      triple("_geometry", geo.asWKT, literal("CRS-WKT", geo.wktLiteral)),
      when("LAAG", triple("_geoID", rdfs.label, "LAAG")),
    ),

    toTriplyDb(destination.geodata),
  );

  return etl;
}
