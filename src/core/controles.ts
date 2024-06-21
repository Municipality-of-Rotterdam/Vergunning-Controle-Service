import { readdir } from 'fs/promises'

import { BaseControle } from '@core/BaseControle.js'
import { BaseGroep } from '@core/BaseGroep.js'
import { StepContext } from '@core/executeSteps.js'

/**
 * Imports all the checks, processes them and creates a SHACL shape.
 */
export const controles = async (context: StepContext) => {
  const { ruleIds } = context

  const checkGroups = await getCheckGroups()

  for (const group of checkGroups) {
    const groupRuleIds = group.controles.map((controle) => controle.id)
    if (ruleIds.length && ruleIds.some((ruleId: number) => !groupRuleIds.includes(ruleId))) continue

    await group.runPrepare(context)

    for (const check of group.controles) {
      await check.runPrepare(context)
    }
  }

  return { checkGroups }
}

export const getCheckGroups = async () => {
  const groupFolders = (await readdir('./src/controles')).sort()
  const groups: BaseGroep<{}>[] = []

  for (const groupFolder of groupFolders) {
    if (groupFolder.endsWith('.md')) continue

    const groupFiles = (await readdir(`./src/controles/${groupFolder}`)).sort()
    const instances = await Promise.all(
      groupFiles
        .filter((checkFile) => checkFile.endsWith('.js') || checkFile.endsWith('.ts'))
        .map((checkFile) =>
          import(`../controles/${groupFolder}/${checkFile.replace('.ts', '.js')}`).then(
            (module) => new module.default(checkFile),
          ),
        ),
    )

    const groupInstances = instances.filter((instance) => instance instanceof BaseGroep)
    if (groupInstances.length !== 1) throw new Error('Er kan maar 1 groep in een controle folder zijn')
    const [groupInstance] = groupInstances
    const checkInstances = instances.filter((instance) => instance instanceof BaseControle)

    groupInstance.setChecks(checkInstances)

    groups.push(groupInstance)
  }

  return groups
}
