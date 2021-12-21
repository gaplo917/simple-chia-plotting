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
const processLogMap = new Map()
const isDiskUsingArray = new Array(destinations.length).fill(false)
const diskQueues = new Array(destinations.length).fill(null).map(_ => [])

function moveFileJob({ diskIndex }) {
  log(`[c-${diskIndex}] job is running`)

  if (killed || isDiskUsingArray[diskIndex] || diskQueues[diskIndex].length === 0) {
    log(`[c-${diskIndex}] disk is busy or no file in queue`, {
      isDiskUsing: isDiskUsingArray[diskIndex],
      diskQueue: diskQueues[diskIndex]
    })
    // disk is busy or no filename found, check again later
    return
  }
  const filename = diskQueues[diskIndex].pop()
  const sourceFilePath = (source + '/').replace('//', '/') + filename

  if (!fs.existsSync(sourceFilePath)) {
    log(`${sourceFilePath} not exist`)
    moveFileJob({ diskIndex })
    return
  }

  const dest = destinations[diskIndex]
  if (!fs.existsSync(dest)) {
    log(`${dest} not exist, create it.`)
    fs.mkdirSync(dest, { recursive: true })
  }
  const destFilePath = (dest + '/').replace('//', '/') + filename

  const start = new Date().getTime()

  log(`[c-${diskIndex}] move ${sourceFilePath} to ${destFilePath}`)

  const child = spawn('mv', [sourceFilePath, destFilePath])
  const pid = child.pid
  processLogMap.set(pid, sourceFilePath)
  isDiskUsingArray[diskIndex] = true

  child.on('close', function () {
    processLogMap.delete(pid)
    isDiskUsingArray[diskIndex] = false
    if (!killed) {
      const end = new Date().getTime()
      const diffInSec = (end - start) / 1000
      log(
        `[c-${diskIndex}] Done. Move ${sourceFilePath} to ${destFilePath} takes ${diffInSec}seconds`
      )
      // start next job
      moveFileJob({ diskIndex })
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

function scheuldeCheck() {
  if (killed) {
    return
  }
  // mutate the plotFilenames
  const plotFilenames = readPlotFilenames(source)

  const plotOnQueue = diskQueues.reduce((acc, e) => acc.concat(e), [])

  const newFileCount = plotFilenames.length - plotOnQueue.length

  log(
    `Scanned ${source} , found ${newFileCount} new files and queued ${plotOnQueue.length} files to work`
  )

  if (newFileCount > 0) {
    plotFilenames
      .filter(it => !plotOnQueue.includes(it))
      .forEach(filename => {
        diskQueues[count % destinations.length].push(filename)
        count++
      })
    log(`Added ${newFileCount} new files to queue`)
    for (let i = 0; i < destinations.length; i++) {
      moveFileJob({ diskIndex: i })
    }
  }
}

scheuldeCheck()

setInterval(() => {
  scheuldeCheck()
}, scanInterval * 1000 * 60)
