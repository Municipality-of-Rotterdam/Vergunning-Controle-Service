import { Context, Step } from '@root/types.js'
import App from '@triply/triplydb'
import { graphExists } from '@root/helpers/existence.js'
import { SKIP_STEP } from '@root/helpers/skipStep.js'

export default {
  name: 'Kopieër de vocabulaire',
  description: 'Kopieër de vocab-graph van de Rule Repository naar de dataset van het gebouw',
  strict: true,
  async run(context: Context) {
    const ruleRepository = App.get({ token: process.env.TRIPLYDB_RULE_REPOSITORY_TOKEN! })
    const organization = await ruleRepository.getOrganization('Rotterdam-Rule-Repository')
    const vocabDataset = await organization.getDataset('Vocabulaire')

    if (context.cache && (await graphExists(context.buildingDataset, context.vocabName))) {
      return SKIP_STEP
    }

    await context.buildingDataset.importFromDataset(vocabDataset, {
      graphNames: [context.vocabName],
      overwrite: true,
    })
  },
} satisfies Step
