import { createLogger } from '@helpers/logger.js'
import { parseToStore } from '@helpers/parseToStore.js'
import { Store as TriplyStore } from '@triplydb/data-factory'

const log = createLogger('linked-data', import.meta)

// In a separate function so that the garbage collection will work because this data_ifcOWL.ttl is huge.
export const addLinkedDataToStore = async (outputsDir: string, dataset: TriplyStore) => {
  log('Linked Data toevoegen aan de in-memory datastore', 'Linked Data')
  await parseToStore(`${outputsDir}/data_ifcOWL.ttl`, dataset)
  await parseToStore(`${outputsDir}/data.ttl`, dataset)
}
