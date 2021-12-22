const { spawn, execSync } = require('child_process')
const fs = require('fs')
const { log } = require('./utils')
const path = require('path')

function readArgv2OrDefaultConfig(defaultConfig = 'config.json') {
  return require(`./${process.argv[2] || defaultConfig}`)
}

const config = readArgv2OrDefaultConfig()
if (!config) {
  log(`detected no config.json, aborted`)
  return
}
const { thread, tmp, memoryTmp, output, count } = config
const processLogMap = new Map()
let jobCounter = 0

let killed = false

if (!fs.existsSync(memoryTmp)) {
  log(`${memoryTmp} not exist, create it.`)
  fs.mkdirSync(memoryTmp, { recursive: true })
}

fs.writeFileSync(path.join(memoryTmp, 'dirty'), 'mark dirty')

// clear the memory tmp first
log(`cleaning up ${memoryTmp}`)
execSync(`rm ${memoryTmp}/*`)

function startPlot() {
  if (killed) {
    return
  }

  //kick off process of chia
  const child = spawn('chia', [
    'plotters',
    'madmax',
    '-k',
    '32',
    '-r',
    `${thread}`,
    '-t',
    `${tmp}`,
    '-2',
    `${memoryTmp}`,
    '-d',
    `${output}`
  ])
  const pid = child.pid

  jobCounter++
  processLogMap.set(pid, true)

  child.stdout.on('data', function (data) {
    log(data.toString())
  })
  child.stderr.on('data', function (data) {
    log(data.toString())
  })

  child.on('close', function () {
    if (!killed) {
      processLogMap.delete(pid)

      if (jobCounter < count) {
        startPlot()
      }
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
      const fileLogName = processLogMap.get(pid)
      fs.renameSync(fileLogName, fileLogName.replace('output/', 'output/[KILLED]'))
      process.kill(pid, 'SIGKILL')
    })
    process.exit(1)
  })
)

startPlot()
