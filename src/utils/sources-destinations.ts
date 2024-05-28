import { Source } from '@triplyetl/etl/generic'
import { getAccount, getDataset } from './dtap.js'
// import vcs from '../vcs.js'

const account = getAccount() == "me" ? undefined : getAccount();

export const destination = {
  vergunningscontroleservice: {
    account: account, dataset: { name: getDataset('vcs'), displayName: 'Vergunningscontroleservice', description: 'Gepubliceerd door TriplyETL' }
  },
  geodata: {
    account: account, dataset: { name: getDataset('geodata'), displayName: 'Geodata', description: 'Gepubliceerd door TriplyETL' }
  }
}

export const source = {
  //model: Source.file('./data/model.trig'),
  model: account
    ? Source.TriplyDb.asset(
      account,
      getDataset('vcs'),
      { name: 'data/model.trig' })
    : Source.TriplyDb.asset(
      getDataset('vcs'),
      { name: 'data/model.trig' }
    ),
}