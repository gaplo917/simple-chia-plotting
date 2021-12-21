# Simple Chia Plotting

Solved the Chia UI cannot plot continuously and configure `concurrency`.

| Features                                              | Status |
| ----------------------------------------------------- | :----: |
| Use madmax plotter                                    |   ✅   |
| Separated move plot implementation                    |   ✅   |
| Full plotting logs and history in `./output`          |   ✅   |
| Quit node process will kill all chia plotting process |   ✅   |

Sample Config

```json
{
  "thread": 8,
  "tmp": "/Volumes/SSD1/tmp",
  "memoryTmp": "/Volumes/RAMDISK/tmp",
  "output": "/Volumes/SSD1/final",
  "count": 1
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

### Create Linux Ram Disk

```
sudo mkdir /mnt/ram
sudo mount -t tmpfs -o size=110G tmpfs /mnt/ram/
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
