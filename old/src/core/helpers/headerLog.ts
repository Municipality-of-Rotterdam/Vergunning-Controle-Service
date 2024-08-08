import chalk, { ChalkInstance } from 'chalk'

export const headerLog = (label: string = '') => console.log('\n===', label, '='.repeat(140 - label.length), '\n')

export const headerLogBig = (label: string = '', colorName: keyof typeof chalk = 'magentaBright') => {
  const color = chalk[colorName] as ChalkInstance

  console.log(
    '\n    ' + color('='.repeat(141)),
    color('\n    ==='),
    label,
    color('='.repeat(136 - label.length)),
    '\n    ' + color('='.repeat(141)) + '\n',
  )
}
