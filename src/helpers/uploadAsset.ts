import Dataset from '@triply/triplydb/Dataset.js'

export async function uploadAsset(dataset: Dataset, file: string) {
  const asset = await dataset.getAsset(file.split('/').pop()!)
  try {
    await asset.delete()
  } catch (error) {}
  await dataset.uploadAsset(file)
}
