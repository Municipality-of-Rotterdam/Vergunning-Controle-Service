import { Context } from '@root/types.js'
import App from '@triply/triplydb'

import { getAccount } from './getAccount.js'

export const fetchRuleRepositoryQueries = async (context: Context) => {
  const ruleRepository = App.get({ token: process.env.TRIPLYDB_RULE_REPOSITORY_TOKEN! })
  const organization = await ruleRepository.getOrganization('Rotterdam-Rule-Repository')
  const queries = organization.getQueries()

  const triply = App.get({ token: process.env.TRIPLYDB_TOKEN! })
  const account = await triply.getAccount(getAccount())

  for await (const query of queries) {
    await query.copy(undefined, account, {
      dataset: context.buildingDataset,
    })
  }
}
