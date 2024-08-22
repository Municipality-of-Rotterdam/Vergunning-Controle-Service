import { fetchWithProvenance } from '@root/provenance/fetchWithProvenance.js';
import App from '@triply/triplydb';

import { getAccount } from '../helpers/getAccount.js';

export const sparqlRequest = async (datasetName: string, query: string) => {
  const triply = App.get({ token: process.env.TRIPLYDB_TOKEN! })
  const account = await triply.getAccount(getAccount())

  const { apiUrl } = await triply.getInfo()
  const sparqlUrl = `${apiUrl}/datasets/${account.slug}/${datasetName}/sparql`

  return fetchWithProvenance(sparqlUrl, {
    body: JSON.stringify({ query }),
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      Accepts: 'application/sparql-results+json, application/n-triples',
      Authorization: 'Bearer ' + process.env.TRIPLYDB_TOKEN!,
    },
  }).then((response) => response.json())
}
