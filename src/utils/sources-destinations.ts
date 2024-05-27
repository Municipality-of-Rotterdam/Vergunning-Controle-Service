import { Source } from '@triplyetl/etl/generic'
import { getAccount, getDataset } from './dtap.js'
// import vcs from '../vcs.js'

export const destination = {
  vergunningscontroleservice: {
    account: getAccount(), dataset: { name: getDataset('vcs'), displayName: 'Vergunningscontroleservice', description: 'Gepubliceerd door TriplyETL' }
  },
  geodata: {
    account: getAccount(), dataset: { name: getDataset('geodata'), displayName: 'Geodata', description: 'Gepubliceerd door TriplyETL' }
  }
}

export const source = {
  // model: Source.file('./data/model.trig')
  model: Source.TriplyDb.asset(
    getAccount(),
    getDataset('vcs'),
    { name: 'data/model.trig' }),
}