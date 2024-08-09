import { writeFile } from 'fs/promises'

import App from '@triply/triplydb'

import { getAccount } from './getAccount.js'

export const fetchAssetByName = async (assetName: string, folder: string) => {
  const triply = App.get({ token: process.env.TRIPLYDB_TOKEN! })
  const account = await triply.getAccount(getAccount())
  const dataset = await account.getDataset('vcs')
  const asset = await dataset.getAsset(assetName)
  await writeFile(`${folder}/${assetName}`, await asset.toStream(), 'utf8')
}
