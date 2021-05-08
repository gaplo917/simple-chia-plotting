const { spawn } = require('child_process')
const fs = require('fs')
const { configs } = require(`./${process.argv[2] || 'config.json'}`)

const startTime = new Date()
const counter = new Map()
const processLogMap = new Map()

let killed = false

function startMine(config) {
  const { id, index, memory, thread, tmp, output, totalPlots } = config
  //kick off process of listing files
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
    `${tmp[index % tmp.length]}`,
    '-d',
    `${output[index % output.length]}`
  ])
  const pid = child.pid
  const t = new Date()
  const fileLogName = `output/${t.getFullYear()}-${t.getMonth()}-${t.getDate()}-${t.getHours()}-${t.getMinutes()}-${t.getSeconds()}-${t.getMilliseconds()}-${pid}.txt`

  processLogMap.set(pid, fileLogName)

  const writeStream = fs.createWriteStream(fileLogName)

  writeStream.write(JSON.stringify({ id, memory, thread, tmp, output, totalPlots }))
  child.stdout.pipe(writeStream)

  child.stderr.on('data', function (data) {
    process.stdout.write(data.toString())
  })

  child.on('close', function (code) {
    console.log('Finished with code ' + code)
    counter.set(id, counter.get(id) - 1)
    if (killed) {
      process.exit(1)
    } else {
      const fileLogName = processLogMap.get(pid)
      fs.renameSync(fileLogName, fileLogName.replace('output/', 'output/[DONE]'))
      process.stdout.write(
        `Plotted ${counter.get(id)}/${totalPlots}, used ${
          (new Date().getTime() - startTime.getTime()) / 1000 / 60
        }`
      )
      processLogMap.delete(pid)

      startMine(config)
    }
  })
}

;['SIGINT', 'SIGTERM', 'SIGQUIT'].forEach(signal =>
  process.on(signal, () => {
    console.log(`Got ${signal} signal.`)
    new Array(...processLogMap.keys()).forEach(pid => {
      const fileLogName = processLogMap.get(pid)
      fs.renameSync(fileLogName, fileLogName.replace('output/', 'output/[KILLED]'))
      process.kill(pid, 'SIGKILL')
    })
    process.exit(1)
  })
)

configs.forEach((config, index) => {
  const { totalPlots, concurrent, delay = 0 } = config
  counter.set(index, Number(totalPlots))
  for (let i = 0; i < concurrent; i++) {
    setTimeout(() => startMine({ id: index + `-${i}`, index: i, ...config }), delay * 1000 * 60)
  }
})
