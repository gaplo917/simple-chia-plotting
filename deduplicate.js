const fs = require('fs')
const readline = require('readline')
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function readArgv2OrDefaultConfig(defaultConfig = 'deduplicate.json') {
  return require(`./${process.argv[2] || defaultConfig}`)
}

function readPlotFilenames(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .map(it => ({
      name: it.name,
      path: (dir + '/').replace('//', '/') + it.name
    }))
    .filter(it => it.name.endsWith('.plot'))
}

const { config } = readArgv2OrDefaultConfig()
const { sources } = config

const plots = sources.flatMap(it => readPlotFilenames(it))
const validPlotMap = new Map()
const duplicatedMap = new Map()

plots.forEach(({ name, path }) => {
  if (validPlotMap.has(name)) {
    duplicatedMap.set(name, path)
  } else {
    validPlotMap.set(name, path)
  }
})

console.log('going to delete these plots:')
new Array(...duplicatedMap.values()).forEach(it => {
  console.log(it)
})

rl.question('Confirm to delete Y/N? ? ', function (name) {
  if (name.toUpperCase() === 'Y') {
    new Array(...duplicatedMap.values()).forEach(it => {
      console.log(`deleting ${it}`)
      fs.unlinkSync(it)
    })
  } else if (name.toUpperCase() === 'N') {
    console.log('aborted')
  } else {
    console.log('invalid input')
  }
  process.exit(0)
})
