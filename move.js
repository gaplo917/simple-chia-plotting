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
const { source, destinations, scanInterval } = config

let count = 0
let killed = false
let plotFilenames = readPlotFilenames(source)
const plotMoving = new Map()
const processLogMap = new Map()

log(`Started moving files with concurrency=${destinations.length}`, plotFilenames)

function moveFileJob({ concurrentIndex }) {
  if (killed) {
    return
  }
  // mutate the plotFilenames
  plotFilenames = readPlotFilenames(source)

  const newFileCount = plotFilenames.length - plotMoving.size

  log(
    `[c-${concurrentIndex}] Scanned ${source}, found ${newFileCount} new files and moving ${plotMoving} files`
  )

  if (newFileCount <= 0) {
    log(`[c-${concurrentIndex}] Scheduled next job after ${scanInterval} minutes`)
    setTimeout(() => moveFileJob({ concurrentIndex }), scanInterval * 1000 * 60)
    return
  }

  const dest = destinations[concurrentIndex]
  const filename = plotFilenames.find(it => !plotMoving.has(it))
  plotMoving.set(filename, true)
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
    plotMoving.delete(filename)
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

for (let i = 0; i < destinations.length; i++) {
  moveFileJob({ concurrentIndex: i })
}
