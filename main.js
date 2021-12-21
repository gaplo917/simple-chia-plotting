const { spawn } = require('child_process')
const fs = require('fs')
const { log } = require('./utils')

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

// clear the memory tmp first
spawn('rm', [`./${memoryTmp}/*`])

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
    `${output[jobCounter % output.length]}`
  ])
  const pid = child.pid
  const t = new Date()
  const fileLogName = `output/[WIP]${t.getFullYear()}-${
    t.getMonth() + 1
  }-${t.getDate()}-${t.getHours()}-${t.getMinutes()}-${t.getSeconds()}-${t.getMilliseconds()}-count${jobCounter}.txt`

  jobCounter++
  processLogMap.set(pid, fileLogName)

  const writeStream = fs.createWriteStream(fileLogName)

  writeStream.write(JSON.stringify(config))
  child.stdout.pipe(writeStream)
  child.stdout.pipe(process.stdout)
  child.stderr.on('data', function (data) {
    log(data.toString())
  })

  child.on('close', function () {
    if (!killed) {
      const fileLogName = processLogMap.get(pid)
      fs.renameSync(fileLogName, fileLogName.replace('output/[WIP]', 'output/[DONE]'))

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
