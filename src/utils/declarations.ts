import { Iri } from '@triplyetl/etl/generic'

const prefixBase = Iri('https://demo.triplydb.com/')

export const baseIri = prefixBase.concat('rotterdam/vcs/')
const prefixId = baseIri.concat('id/')
const prefixDef = baseIri.concat('model/def/')
export const graph = baseIri.concat('graph/')

export const def = {
  // classes
  Bouwlaag: prefixDef.concat('Bouwlaag'),
  // properties
  aantalPersonen: prefixDef.concat('aantalPersonen'),
  bouwlaag: prefixDef.concat('bouwlaag'),
  bouwlaagElement: prefixDef.concat('bouwlaagElement'),
  gebouwType: prefixDef.concat('gebouwType'),
  hoogte: prefixDef.concat('hoogte'),
  verdieping: prefixDef.concat('verdieping'),
  woonwijk: prefixDef.concat('woonwijk')
}

export const id = {
  bouwlaag: prefixId.concat('bouwlaag/'),
  gebouw: prefixId.concat('gebouw/')
}
