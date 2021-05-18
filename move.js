const { spawn } = require('child_process')
const fs = require('fs')
const { log } = require('./utils')

function readArgv2OrDefaultConfig(defaultConfig = 'move.json') {
  return require(`./${process.argv[2] || defaultConfig}`)
}

function readPlotFilenames(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .map(it => it.name)
    .filter(it => it.endsWith('.plot'))
}

const { config } = readArgv2OrDefaultConfig()
const { source, destinations, concurrency, scanInterval } = config

let count = 0
let killed = false
let plotFilenames = readPlotFilenames(source)
const processLogMap = new Map()

log(`Started moving files with concurrency=${concurrency}`, plotFilenames)

function moveFileJob({ concurrentIndex }) {
  if (killed) {
    return
  }

  if (plotFilenames.length === 0) {
    // mutate the plotFilenames
    plotFilenames = readPlotFilenames(source)

    log(`[c-${concurrentIndex}] Scanned ${source}, found ${plotFilenames.length} files.`)

    if (plotFilenames.length > 0) {
      moveFileJob({ concurrentIndex })
    } else {
      log(`[c-${concurrentIndex}] Scheduled next job after ${scanInterval} minutes`)
      setTimeout(() => moveFileJob({ concurrentIndex }), scanInterval * 1000 * 60)
    }
    return
  }

  const dest = destinations[count % destinations.length]
  const filename = plotFilenames.pop()
  if (!fs.existsSync(dest)) {
    log(`${dest} not exist, create it.`)
    fs.mkdirSync(dest, { recursive: true })
  }
  const sourceFilePath = (source + '/').replace('//', '/') + filename
  const destFilePath = (dest + '/').replace('//', '/') + filename

  if (!fs.existsSync(sourceFilePath)) {
    log(`${sourceFilePath} not exist`)
    moveFileJob({ concurrentIndex })
    return
  }

  const start = new Date().getTime()

  log(`[c-${concurrentIndex}] move ${sourceFilePath} to ${destFilePath}`)

  const child = spawn('mv', [sourceFilePath, destFilePath])
  const pid = child.pid
  processLogMap.set(pid, sourceFilePath)
  count++

  child.on('close', function () {
    processLogMap.delete(pid)
    if (!killed) {
      const end = new Date().getTime()
      const diffInSec = (end - start) / 1000
      log(
        `[c-${concurrentIndex}] Done. Move ${sourceFilePath} to ${destFilePath} takes ${diffInSec}seconds`
      )
      // start next job
      moveFileJob({ concurrentIndex })
    } else {
      log('main process already be killed.')
    }
  })
}

;['SIGINT', 'SIGTERM', 'SIGQUIT'].forEach(signal =>
  process.on(signal, () => {
    killed = true
    log(`Got ${signal} signal.`)
    new Array(...processLogMap.keys()).forEach(pid => {
      process.kill(pid, 'SIGKILL')
    })
    process.exit(1)
  })
)

for (let i = 0; i < concurrency; i++) {
  moveFileJob({ concurrentIndex: i })
}
