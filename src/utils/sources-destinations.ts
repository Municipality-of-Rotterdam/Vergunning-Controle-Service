import { Source } from '@triplyetl/etl/generic'
import { getAccount, getDataset } from './dtap.js'

export const source = {
  buildings: Source.file('static/example_mock_data_building.json'),
  model: Source.file('static/model.trig')
}

export const destination = {
  vergunningscontroleservice: {
    account: getAccount(), dataset: { name: getDataset('vergunningscontroleservice'), displayName: 'Vergunningscontroleservice', description: 'Gepubliceerd door TriplyETL' }
  }
}
