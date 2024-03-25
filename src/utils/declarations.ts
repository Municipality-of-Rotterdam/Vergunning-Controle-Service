import { Iri } from '@triplyetl/etl/generic'

const prefix_base = Iri('https://demo.triplydb.com/')

export const baseIri = prefix_base.concat('rotterdam/vcs/')
export const prefix_id = baseIri.concat('id/')
export const prefix_def = baseIri.concat('model/def/')
export const prefix_graph = baseIri.concat('graph/')

export const def = {

  // classes
  Bouwlaag: prefix_def.concat('Bouwlaag'),

  // properties
  aantalPersonen: prefix_def.concat('aantalPersonen'),
  bouwlaag: prefix_def.concat('bouwlaag'),
  bouwlaagElement: prefix_def.concat('bouwlaagElement'),
  gebouwType: prefix_def.concat('gebouwType'),
  hoogte: prefix_def.concat('hoogte'),
  verdieping: prefix_def.concat('verdieping'),
  woonwijk: prefix_def.concat('woonwijk')
}

export const id = {
  bouwlaag: prefix_id.concat('bouwlaag'),
  gebouw: prefix_id.concat('gebouw')
}
