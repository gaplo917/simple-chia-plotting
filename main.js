const { spawn } = require('child_process')
const fs = require('fs')
const { log } = require('./utils')

function readArgv2OrDefaultConfig(defaultConfig = 'config.json') {
  return require(`./${process.argv[2] || defaultConfig}`)
}

const { configs } = readArgv2OrDefaultConfig()

const processLogMap = new Map()
const jobCounter = new Map()

let killed = false

function startMine({ jobIndex, concurrentIndex }) {
  if (killed) {
    return
  }
  const { configs } = readArgv2OrDefaultConfig()
  if (!configs) {
    log(`${process.argv[2]} or config.json not found`)
    return
  }
  const config = configs[jobIndex]
  if (!config) {
    log(`detected number of job changed, cancel job ${jobIndex}`)
    return
  }
  const { memory, thread, tmp, output, concurrency } = configs[jobIndex]

  // otherwise, reduce the jobs
  if (concurrentIndex >= concurrency) {
    log(`detected number of concurrency changed, cancel job ${jobIndex}`)
    return
  }

  const jobCount = jobCounter.get(jobIndex)

  //kick off process of chia
  const child = spawn('chia', [
    'plots',
    'create',
    '-k',
    '32',
    '-b',
    `${memory}`,
    '-r',
    `${thread}`,
    '-t',
    `${tmp[jobCount % tmp.length]}`,
    '-d',
    `${output[jobCount % output.length]}`,
    '-x'
  ])
  const pid = child.pid
  const t = new Date()
  const fileLogName = `output/[WIP]${t.getFullYear()}-${
    t.getMonth() + 1
  }-${t.getDate()}-${t.getHours()}-${t.getMinutes()}-${t.getSeconds()}-${t.getMilliseconds()}-job${jobIndex}-c${concurrentIndex}-count${jobCount}.txt`

  jobCounter.set(jobIndex, jobCount + 1)
  processLogMap.set(pid, fileLogName)

  const writeStream = fs.createWriteStream(fileLogName)

  writeStream.write(JSON.stringify({ jobIndex, memory, thread, tmp, output }))
  child.stdout.pipe(writeStream)

  child.stderr.on('data', function (data) {
    log(data.toString())
  })

  child.on('close', function () {
    if (!killed) {
      const fileLogName = processLogMap.get(pid)
      fs.renameSync(fileLogName, fileLogName.replace('output/[WIP]', 'output/[DONE]'))

      processLogMap.delete(pid)

      startMine({
        jobIndex,
        concurrentIndex
      })
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

configs.forEach((config, jobIndex) => {
  const { concurrency, delay = 0 } = config
  jobCounter.set(jobIndex, 0)
  for (let i = 0; i < concurrency; i++) {
    setTimeout(
      () =>
        startMine({
          jobIndex,
          concurrentIndex: i
        }),
      delay * 1000 * 60
    )
  }
})
