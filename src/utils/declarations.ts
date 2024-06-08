import { Iri } from "@triplyetl/etl/generic";

const prefixBase = Iri("https://demo.triplydb.com/rotterdam/");

export const baseIri = prefixBase.concat("vcs/");
export const baseIriShaclExample = prefixBase.concat("shacl-example/");
export const baseIriGeoData = prefixBase.concat("geodata/");

const prefixId = baseIri.concat("id/");
const prefixIdShaclExample = baseIriShaclExample.concat("id/");
const prefixDefShaclExample = baseIriShaclExample.concat("model/def/");

export const graph = baseIri.concat("graph/");
export const graphShaclExample = baseIriShaclExample.concat("graph/");
export const graphGeoData = baseIriGeoData.concat("graph/");

export const defShaclExample = {
  // classes
  Bouwlaag: prefixDefShaclExample.concat("Bouwlaag"),
  // properties
  aantalPersonen: prefixDefShaclExample.concat("aantalPersonen"),
  bouwlaag: prefixDefShaclExample.concat("bouwlaag"),
  bouwlaagElement: prefixDefShaclExample.concat("bouwlaagElement"),
  gebouwType: prefixDefShaclExample.concat("gebouwType"),
  hoogte: prefixDefShaclExample.concat("hoogte"),
  verdieping: prefixDefShaclExample.concat("verdieping"),
  woonwijk: prefixDefShaclExample.concat("woonwijk"),
};

export const idShaclExample = {
  bouwlaag: prefixIdShaclExample.concat("bouwlaag/"),
  gebouw: prefixIdShaclExample.concat("gebouw/"),
};

export const id = {
  geo: prefixId.concat("geo/"),
  geometry: prefixId.concat("geometry/"),
};
