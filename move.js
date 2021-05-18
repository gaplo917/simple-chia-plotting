const { spawn } = require('child_process')
const fs = require('fs')
const { config } = require(`./${process.argv[2] || 'move.json'}`)

const { source, destinations, concurrency, scanInterval } = config

function getPlotFilenames(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .map(it => it.name)
    .filter(it => it.endsWith('.plot'))
}

let count = 0
let killed = false
let plotFilenames = getPlotFilenames(source)
const processLogMap = new Map()

console.log(`Started moving files with concurrency=${concurrency}`, plotFilenames)

function moveFileJob() {
  if (killed) {
    return
  }

  const concurrentIndex = count % concurrency

  if (plotFilenames.length === 0) {
    // mutate the plotFilenames
    plotFilenames = getPlotFilenames(source)

    if (plotFilenames.length > 0) {
      moveFileJob()
    } else {
      console.log(`Scheduled next scanning after ${scanInterval} minutes`)
      setTimeout(() => moveFileJob(), scanInterval * 1000 * 60)
    }
    return
  }

  const dest = destinations[count % destinations.length]
  const filename = plotFilenames.pop()
  if (!fs.existsSync(dest)) {
    console.log(`${dest} not exist, create it.`)
    fs.mkdirSync(dest, { recursive: true })
  }
  const sourceFilePath = (source + '/').replace('//', '/') + filename
  const destFilePath = (dest + '/').replace('//', '/') + filename

  if (!fs.existsSync(sourceFilePath)) {
    console.log(`${sourceFilePath} not exist`)
    moveFileJob()
    return
  }

  const start = new Date().getTime()

  console.log(`[c-${concurrentIndex}] move ${sourceFilePath} to ${destFilePath}`)

  const child = spawn('mv', [sourceFilePath, destFilePath])
  const pid = child.pid
  processLogMap.set(pid, sourceFilePath)
  count++

  child.on('close', function (code) {
    processLogMap.delete(pid)
    if (!killed) {
      const end = new Date().getTime()
      const diffInSec = (end - start) / 1000
      console.log(
        `[c-${concurrentIndex}] Done. Move ${sourceFilePath} to ${destFilePath} takes ${diffInSec}seconds`
      )
      // start next job
      moveFileJob()
    } else {
      console.log('main process already be killed.')
    }
  })
}

;['SIGINT', 'SIGTERM', 'SIGQUIT'].forEach(signal =>
  process.on(signal, () => {
    killed = true
    console.log(`Got ${signal} signal.`)
    new Array(...processLogMap.keys()).forEach(pid => {
      process.kill(pid, 'SIGKILL')
    })
    process.exit(1)
  })
)

for (let i = 0; i < concurrency; i++) {
  moveFileJob()
}
