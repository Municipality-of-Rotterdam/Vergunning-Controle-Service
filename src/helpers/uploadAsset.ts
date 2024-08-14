import Dataset from '@triply/triplydb/Dataset.js';

export async function uploadAsset(dataset: Dataset, file: string) {
  let existingAsset
  try {
    existingAsset = await dataset.getAsset(file.split('/').pop()!)
    await existingAsset.delete()
  } catch (error) {}
  await dataset.uploadAsset(file)
}
