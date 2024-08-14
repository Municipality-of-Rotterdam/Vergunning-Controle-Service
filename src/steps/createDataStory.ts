/**
 * Phase: Creating the data story in the database.
 *
 * - We need to fetch saved queries from the rule repository (https://demo.triplydb.com/Rotterdam-Rule-Repository/-/queries)
 *   and save copies of them attached to the current dataset.
 *
 * - We need to generate the data story for these copied queries.
 */

import { parseHTML } from 'linkedom';

import { getAccount } from '@root/helpers/getAccount.js';
import { getGitRevision } from '@root/helpers/getGitRevision.js';
import { Context, Step } from '@root/types.js';
import App from '@triply/triplydb';

export default {
  name: 'Maak data verhaal',
  description: 'Maak het data verhaal aan de hand van de queries in de rule repository',
  async run(context: Context) {
    await ensureQueriesForDataset(context)
    const triply = App.get({ token: process.env.TRIPLYDB_TOKEN! })
    const account = await triply.getAccount(getAccount())
    const ruleRepository = App.get({ token: process.env.TRIPLYDB_RULE_REPOSITORY_TOKEN! })
    const organization = await ruleRepository.getOrganization('Rotterdam-Rule-Repository')
    const template = await organization.getStory('template')
    const templateContent = (await template.getInfo()).content
    let [header, ...rest] = templateContent.map((item) => {
      /** @ts-ignore */
      delete item.id

      /** @ts-ignore */
      if (item.query) item.query = item.query.id

      return item
    })

    // Fetches all data-TOKENs
    // const dataAttributes = header.paragraph!.split(/ |\>|\n/g).filter((attribute) => attribute.startsWith('data-'))

    const tokens = {
      'data-revision': await getGitRevision(),
      'data-street-city': 'lorem',
      'data-regels-op-de-kaart': 'lorem',
      'data-dataset': 'lorem',
      'data-voetafdruk': 'lorem',
      'data-3d-model-bestemmingsvlakken': 'lorem',
      'data-assets': 'lorem',
      'data-3d-model': 'lorem',
      'data-ifc-bestand': 'lorem',
      'data-ids-rapport-html': 'lorem',
      'data-ids-rapport-bcf': 'lorem',
    }

    const { document } = parseHTML(header.paragraph!)
    for (const [key, value] of Object.entries(tokens)) {
      const elementsWithDataAttribute = [...document.querySelectorAll(`[${key}]`)]
      for (const element of elementsWithDataAttribute) {
        element.innerHTML = value
        if (element.nodeName === 'A') element.setAttribute('href', value)
      }
    }

    const changedHeader = document.toString()
    header.paragraph = changedHeader

    let existingStory
    try {
      existingStory = await account.getStory(context.datasetName)
      await existingStory.delete()
    } catch {}

    const story = { content: [header, ...rest] as any[] }

    const savedStory = await account.addStory(context.datasetName, story)
    console.log(savedStory)
  },
} satisfies Step

/**
 * Copies over the queries from the rule repository for the usage of a data story and a building dataset.
 */
const ensureQueriesForDataset = async (context: Context) => {
  const ruleRepository = App.get({ token: process.env.TRIPLYDB_RULE_REPOSITORY_TOKEN! })
  const organization = await ruleRepository.getOrganization('Rotterdam-Rule-Repository')
  const queries = organization.getQueries()

  const triply = App.get({ token: process.env.TRIPLYDB_TOKEN! })
  const account = await triply.getAccount(getAccount())

  for await (const query of queries) {
    const info = await query.getInfo()
    const queryText = info.requestConfig?.payload.query!

    // TODO this is problematic, discuss with team, noted in the '_project overview' document.
    const queryName = context.datasetName.substring(0, 30) + '-' + info.name.substring(0, 9).replaceAll('-', '')

    let existingQuery
    try {
      existingQuery = await account.getQuery(queryName)
    } catch {}

    if (context.cache && existingQuery) continue

    if (existingQuery) await existingQuery.delete()
    console.log(account)
    await account.addQuery(queryName, {
      queryString: queryText,
      dataset: context.buildingDataset,
      serviceType: 'speedy',
    })
  }
}
