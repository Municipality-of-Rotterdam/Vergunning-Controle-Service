/**
 * Phase: Creating the data story in the database.
 *
 * - We need to generate the data story for according to the template in the rule repository.
 */

import crypto from 'crypto'
import { parseHTML } from 'linkedom'

import { getAccount } from '@root/helpers/getAccount.js'
import { getGitRevision } from '@root/helpers/getGitRevision.js'
import { getAddress } from '@root/sparql/getAddress.js'
import { getVoetprint } from '@root/sparql/getVoetprint.js'
import { Context, Step } from '@root/types.js'
import App from '@triply/triplydb'

export default {
  name: 'Maak data verhaal',
  description: 'Maak het data verhaal aan de hand van de queries in de rule repository',
  async run(context: Context) {
    const triply = App.get({ token: process.env.TRIPLYDB_TOKEN! })
    const account = await triply.getAccount(getAccount())
    const ruleRepository = App.get({ token: process.env.TRIPLYDB_RULE_REPOSITORY_TOKEN! })
    const organization = await ruleRepository.getOrganization('Rotterdam-Rule-Repository')
    const vcsDataset = await account.getDataset('vcs')
    const template = await organization.getStory('template')
    const templateContent = (await template.getInfo()).content
    const consoleUrl = (await triply.getInfo()).consoleUrl

    const sourceAssetUrl = (file: string) =>
      `${consoleUrl}/${account.slug}/${vcsDataset.slug}/assets/download?fileName=${file}`
    const outputAssetUrl = (file: string) =>
      `${consoleUrl}/${account.slug}/${context.buildingDataset.slug}/assets/download?fileName=${file}`

    // Fetches all data-TOKENs
    // const dataAttributes = header.paragraph!.split(/ |\>|\n/g).filter((attribute) => attribute.startsWith('data-'))

    const address = await getAddress(context)
    const voetprint = await getVoetprint(context)

    console.log(voetprint)

    // TODO make dutch, remove data- and convert to mustache
    const tokens = {
      'data-revision': await getGitRevision(),
      'data-street-city': address,
      'data-regels-op-de-kaart': 'lorem',
      'data-dataset': 'lorem',
      'data-voetafdruk': 'lorem',
      'data-3d-model-bestemmingsvlakken': 'lorem',
      'data-assets': 'lorem',
      'data-3d-model': 'lorem',
      'data-ifc-bestand': sourceAssetUrl(context.sourceIfcFileName),
      'data-ids-bestand': sourceAssetUrl(context.sourceIdsFileName),
      'data-ids-rapport-html': 'lorem',
      'data-ids-rapport-bcf': 'lorem',
    }

    for (const item of templateContent) {
      /** @ts-ignore */
      delete item.id

      if (item.type === 'query') {
        const name = crypto.createHash('md5').update(`${context.datasetName}:${item.query?.name}`).digest('hex')

        let existingQuery
        try {
          existingQuery = await account.getQuery(name)
        } catch {}
        if (existingQuery) await existingQuery.delete()
        const addedQuery = await account.addQuery(name, {
          queryString: item.query!.requestConfig!.payload.query,
          dataset: context.buildingDataset,
          serviceType: 'speedy',
        })

        /** @ts-ignore */
        item.query = (await addedQuery.getInfo()).id
      }

      if (item.type === 'paragraph') {
        // const { document } = parseHTML(item.paragraph!)
        // for (const [key, value] of Object.entries(tokens)) {
        //   const elementsWithDataAttribute = [...document.querySelectorAll(`[${key}]`)]
        //   for (const element of elementsWithDataAttribute) {
        //     if (element.nodeName === 'A') {
        //       element.innerHTML = value.split(/\=|\//g).pop()!
        //       element.setAttribute('href', value)
        //     } else {
        //       element.innerHTML = value
        //     }
        //   }
        // }
        item.paragraph = document.toString()
      }
    }

    let existingStory
    try {
      existingStory = await account.getStory(context.datasetName)
      await existingStory.delete()
    } catch {}

    const story = { content: templateContent as any[] }
    const savedStory = await account.addStory(context.datasetName, story)
  },
} satisfies Step
