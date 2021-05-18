# Simple Chia Plotting

Solved the Chia UI cannot plot continuously and configure `concurrency`.

| Features                                                          | Status |
| ----------------------------------------------------------------- | :----: |
| **Concurrency** setting                                           |   ✅   |
| Support load balancing on available plotting SSDs and output HDDs |   ✅   |
| Change `config.json` on-the-fly for **NEXT** plot `output`        |   ✅   |
| Support `delay` to start a job                                    |   ✅   |
| Full plotting logs and history in `./output`                      |   ✅   |
| Quit node process will kill all chia plotting process             |   ✅   |

Sample Config

```json
{
  "configs": [
    {
      "memory": 4500,
      "thread": 3,
      "tmp": ["/Volumes/SSD1/tmp", "/Volumes/SSD2/tmp"],
      "output": [
        "/Volumes/HDD1/final",
        "/Volumes/HDD2/final",
        "/Volumes/HDD3/final",
        "/Volumes/HDD4/final"
      ],
      "concurrency": 4
    },
    {
      "memory": 3390,
      "thread": 2,
      "tmp": ["/Volumes/SSD1/tmp", "/Volumes/SSD2/tmp"],
      "output": [
        "/Volumes/HDD1/final",
        "/Volumes/HDD2/final",
        "/Volumes/HDD3/final",
        "/Volumes/HDD4/final"
      ],
      "concurrency": 4,
      "delay": 240
    }
  ]
}
```

### Install

```
npm install
```

### Install Chia UI (MacOS)

Download the Chia App https://github.com/Chia-Network/chia-blockchain/wiki/INSTALL

\*This program has assumed you have set up your first key in Chia App.

```
# add export the chia binary to PATH in ~/.bashrc or ~/.zshrc
export PATH=/Applications/Chia.app/Contents/Resources/app.asar.unpacked/daemon:$PATH
```

### Install Chia (Linux)

Follow the official tutorial:
https://github.com/Chia-Network/chia-blockchain/wiki/INSTALL#ubuntudebian

\*This program has assumed you have set up your first key in Chia App.

```
cd simple-chia-plotting

# enable venv for Chia CLI
. /path/to/chia-blockchain/activate
```

### Change the config

```
cp config.example.json config.json
vi config.json


cp move.example.json move.json
vi move.json
```

### Run Plot

```
node main.js config.json

# Can run more than one node process, just in case
node main.js config2.json
```

### Run Move

```
node move.js move.json
```

### Mechanical Sympathy Reflection on plotting Chia

- Ubuntu don't use continuous trim methodology, it uses 1 week periodic trim by default
  - Recommend using a `15` minutes periodic trim to maintain SSD life and write speed
- Phase 1 use a lot of CPUs, too much job running phase 1 will cause a lot of context
  switching which will result in diminishing of return.
  - Suggest to at least reserve 1 thread for spare
- The official suggestion 3380 MB RAM & 2 threads setting is nice, but please remember,
  adding more threads needs to add more RAM. Using 3380 MB RAM with more than 2 threads is
  not a wise pick and waste of resource.
- Output from SSD -> HDD is tricky
  - By the physically limitation, HDD is not good at writing **multiple** file
    concurrently. If you have concurrent plot, make sure to use `delay` or multiple HDD
    output directories for better transfer time.
- SSD has its own writing queue
  - Too much job (n > 8) in a single SSD is not a good idea. Better to use small size SSD
    with RAID 0 if available. i.e. 1TB SATA SSD X 4, 2TB NVMe PCIE SSD X 2 rather than a
    single 4TB SSD
- on MasOS / Windows / Linux, always use `docker-compose` to run linux version hpool
  mining is way better than by-pass-security settings to install it in your host machine.
  Too much permission has to be grant.
