import { Source } from '@triplyetl/etl/generic'
import { get_account, get_dataset } from './dtap.js'

export const source = {
  people: Source.file('static/people.csv'),
  model: Source.file('static/model.trig')
}

export const destination = {
  vergunningscontroleservice: {
    account: get_account(), dataset: { name: get_dataset('vergunningscontroleservice'), displayName: 'Vergunningscontroleservice', description: 'Gepubliceerd door TriplyETL' }
  }
}
