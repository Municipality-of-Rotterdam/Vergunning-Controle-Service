import { existsSync } from 'fs'
import { writeFile } from 'fs/promises'

import App from '@triply/triplydb'

import { getAccount } from './getAccount.js'

export const fetchAssetByName = async (assetName: string, folder: string, allowCache: boolean = false) => {
  const path = `${folder}/${assetName}`
  if (allowCache && existsSync(path)) return

  const triply = App.get({ token: process.env.TRIPLYDB_TOKEN! })
  const account = await triply.getAccount(getAccount())
  const dataset = await account.getDataset('vcs')
  const asset = await dataset.getAsset(assetName)
  await writeFile(path, await asset.toStream(), 'utf8')
}
