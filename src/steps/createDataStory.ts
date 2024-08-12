/**
 * Phase: Creating the data story in the database.
 *
 * - We need to fetch saved queries from the rule repository (https://demo.triplydb.com/Rotterdam-Rule-Repository/-/queries)
 *   and save copies of them attached to the current dataset.
 *
 * - We need to generate the data story for these copied queries.
 */

import { fetchRuleRepositoryQueries } from '@root/helpers/fetchRuleRepositoryQueries.js'
import { Context, Step } from '@root/types.js'

export default {
  name: 'Maak data verhaal',
  description: 'Maak het data verhaal aan de hand van de queries in de rule repository',
  async run(context: Context) {
    const queries = await fetchRuleRepositoryQueries(context)
    console.log(queries)
  },
} satisfies Step
