import Dataset from '@triply/triplydb/Dataset.js'

export async function graphExists(dataset: Dataset, name: string): Promise<boolean> {
  const endpoint = `${dataset.api.url}/sparql?query=${encodeURIComponent(`select * where { graph <${name}> { ?s ?p ?o } } limit 1`)}`
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${process.env.TRIPLYDB_TOKEN}`,
    },
  })

  const result = await response.json()
  if (response.status === 200 && result.length) return true
  return false
}

export async function checkAssetExistence(dataset: Dataset, fileNames: string[]) {
  const exists = await Promise.all(fileNames.map((filename) => assetExists(dataset, filename)))
  return exists.every(Boolean)
}

export async function assetExists(dataset: Dataset, name: string): Promise<boolean> {
  try {
    await dataset.getAsset(name)
  } catch (error) {
    return false
  }
  return true
}
