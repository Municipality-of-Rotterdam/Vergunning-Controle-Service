/**
 * Phase: Creating the data story in the database.
 *
 * - We need to fetch saved queries from the rule repository (https://demo.triplydb.com/Rotterdam-Rule-Repository/-/queries)
 *   and save copies of them attached to the current dataset.
 *
 * - We need to generate the data story for these copied queries.
 */

import { getAccount } from '@root/helpers/getAccount.js'
import { Context, Step } from '@root/types.js'
import App from '@triply/triplydb'
import Query from '@triply/triplydb/Query.js'

const ensureQueries = async (context: Context) => {
  const ruleRepository = App.get({ token: process.env.TRIPLYDB_RULE_REPOSITORY_TOKEN! })
  const organization = await ruleRepository.getOrganization('Rotterdam-Rule-Repository')
  const queries = organization.getQueries()

  const triply = App.get({ token: process.env.TRIPLYDB_TOKEN! })
  const account = await triply.getAccount(getAccount())

  const storyQueries: Query[] = []

  for await (const query of queries) {
    const info = await query.getInfo()
    const queryText = info.requestConfig?.payload.query!

    // TODO this is problematic, discuss with team, noted in the '_project overview' document.
    const queryName = context.datasetName.substring(0, 30) + '-' + info.name.substring(0, 9).replaceAll('-', '')

    let existingQuery
    try {
      existingQuery = await account.getQuery(queryName)
    } catch {}

    if (context.cache && existingQuery) {
      storyQueries.push(existingQuery)
      continue
    }

    if (existingQuery) await existingQuery.delete()
    const newQuery = await account.addQuery(queryName, {
      queryString: queryText,
      dataset: context.buildingDataset,
      serviceType: 'speedy',
    })

    storyQueries.push(newQuery)
  }

  return storyQueries
}

export default {
  name: 'Maak data verhaal',
  description: 'Maak het data verhaal aan de hand van de queries in de rule repository',
  async run(context: Context) {
    const queries = await ensureQueries(context)
    const triply = App.get({ token: process.env.TRIPLYDB_TOKEN! })
    const account = await triply.getAccount(getAccount())

    const content = []

    for (const query of queries) {
      const queryInfo = await query.getInfo()
      content.push({
        type: 'query' as const,
        query: queryInfo.id,
      })
    }

    await account.addStory(context.datasetName, { content })
  },
} satisfies Step
