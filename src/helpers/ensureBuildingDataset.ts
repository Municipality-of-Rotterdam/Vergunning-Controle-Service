import App from '@triply/triplydb'
import Dataset from '@triply/triplydb/Dataset.js'

import { getAccount } from './getAccount.js'

export const ensureBuildingDataset = async (datasetName: string) => {
  const triply = App.get({ token: process.env.TRIPLYDB_TOKEN! })
  const account = await triply.getAccount(getAccount())
  let dataset: Dataset
  try {
    dataset = await account.getDataset(datasetName)
  } catch (error) {
    dataset = await account.addDataset(datasetName)
  }
  if (!dataset) throw new Error(`Kon de dataset ${datasetName} niet aanmaken in TriplyDB`)

  return dataset
}
