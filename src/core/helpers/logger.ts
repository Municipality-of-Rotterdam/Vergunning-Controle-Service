import chalk from 'chalk'

export type Log = {
  message: string
  component: string
  meta: ImportMeta
  subComponent?: string
}

const logs = new Set()
// const formatMemoryUsage = (data: number) => `${Math.round((data / 1024 / 1024) * 100) / 100} MB`

export const createLogger = (component: string, meta: ImportMeta, rootSubComponent?: string) => {
  return (message: any, subComponent?: string) => {
    logs.add({ message, component, meta, subComponent })

    const { heapTotal, rss } = process.memoryUsage()

    /* eslint-disable no-console */
    console.log(
      '   ',
      // formatMemoryUsage(rss),
      // formatMemoryUsage(heapTotal),
      // chalk.magenta(component),
      rootSubComponent ?? subComponent ? chalk.greenBright(rootSubComponent ?? subComponent) : '',
      message,
    )
    /* eslint-enable no-console */
  }
}
