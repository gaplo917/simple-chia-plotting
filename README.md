# Simple Chia Plotting

Solved the Chia UI cannot plot continuously and configure `concurrent` plotting in macOS.

|Features|Status|
|-------|:-------:|
|**Concurrent** setting|✅|
|Plot **continuously** until it reaches the configured `totalPlots`|✅|
|Output plotting logs in `./output`|✅|
|Quit node process will kill all chia plotting process|✅|

Sample Config
```
{
  "configs": [{
    "memory": 4500,
    "thread": 3,
    "tmp": "/Volumes/SSD1/tmp",
    "output": "/Volumes/HDD1/final",
    "concurrent": 4,
    "totalPlots": 30
  },{
    "memory": 3390,
    "thread": 2,
    "tmp": "/Volumes/SSD2/tmp",
    "output": "/Volumes/HDD2/final",
    "concurrent": 1,
    "totalPlots": 10
  },]
}
```


### Install
```
npm install
```

### Install Chia UI
Download the Chia App https://github.com/Chia-Network/chia-blockchain/wiki/INSTALL

*This program has assumed you have set up your first key in Chia App. 

```
# add export the chia binary to PATH in ~/.bashrc or ~/.zshrc
export PATH=/Applications/Chia.app/Contents/Resources/app.asar.unpacked/daemon:$PATH
```

### Change the config
```
cp config.example.json config1.json
vi config1.json

cp config.example.json config2.json
vi config2.json
```

### Run
```
node main.js config1.json

# normally, one tmp one node process for easier to control
node main.js config2.json
```