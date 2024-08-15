import Dataset from '@triply/triplydb/Dataset.js';

export async function uploadAsset(dataset: Dataset, file: string) {
  const name = file.split('/').pop()!
  let existingAsset
  try {
    existingAsset = await dataset.getAsset(name)
    await existingAsset.delete()
  } catch (error) {}
  await dataset.uploadAsset(file, name)
}
