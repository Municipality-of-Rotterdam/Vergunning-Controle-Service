import { getAccount } from '@root/helpers/getAccount.js'
import { Context, Step } from '@root/types.js'
import App from '@triply/triplydb'
import { Etl } from '@triplyetl/etl/generic'

export default {
  name: 'Check informatie',
  description: '',
  strict: false,
  async run(_: Context) {
    const triply = App.get({ token: process.env.TRIPLYDB_TOKEN! })
    const account = await triply.getAccount(getAccount())
    console.log(`Environment: ${Etl.environment}`)
    console.log(`Account: ${account.slug}`)
  },
} satisfies Step
