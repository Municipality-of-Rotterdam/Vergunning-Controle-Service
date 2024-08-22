/**
 * Phase: Creating the data story in the database.
 *
 * - We need to generate the data story for according to the template in the rule repository.
 */

import crypto from 'crypto'
import mustache from 'mustache'

import { getAccount } from '@root/helpers/getAccount.js'
import { getGitRevision } from '@root/helpers/getGitRevision.js'
import { getAddress } from '@root/sparql/getAddress.js'
import { getBuildings } from '@root/sparql/getBuildings.js'
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
    const template = await organization.getStory('template')
    const info = await template.getInfo()
    const templateContent = info.content

    const address = await getAddress(context)
    // TODO this assumes a single building
    const building = (await getBuildings(context))[0]
    const [lng, lat] = building.wkt.split('Polygon ((')[1].split(',')[0].split(' ')

    const tokens = {
      revisie: await getGitRevision(),
      adres: address,
      lat,
      lng,
      'gebouw-dataset-url': context.baseIRI.substring(0, context.baseIRI.length - 1),
      'voetafdruk-url': building.geometry,
      'ifc-naam': context.sourceIfcFileName.replaceAll('.ifc', ''),
      'ids-naam': 'IDSValidationReport_' + context.sourceIdsFileName.replaceAll('.ids', '').replaceAll(' ', ''),
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
          output: item.query?.renderConfig?.output,
          accessLevel: item.query?.accessLevel,
          variables: item.query?.variables,
          description: item.query?.description,
        })

        /** @ts-ignore */
        item.query = (await addedQuery.getInfo()).id
      }

      if (item.type === 'paragraph') item.paragraph = mustache.render(item.paragraph!, tokens)
    }

    let existingStory
    try {
      existingStory = await account.getStory(context.datasetName)
      await existingStory.delete()
    } catch {}

    const story = {
      // bannerUrl: info.bannerUrl,
      accessLevel: info.accessLevel,
      content: templateContent as any[],
    }
    const savedStory = await account.addStory(context.datasetName, story)
  },
} satisfies Step
