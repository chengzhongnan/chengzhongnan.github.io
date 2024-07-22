const rank = '微信\nQQ\nGoogle Chrome\nOffice Professional Plus 2019\nAdobe Photoshop\nWinRAR\n7-Zip\nOffice Professional Plus 2016\n金山WPS\nVLC Media Player\nVisual Studio Code\nNotepad++\nGit\nFirefox\nVisual Studio\nIntelliJ IDEA\nPython\nTelegram\nDiscord\n企业微信\nLibreOffice\nEverything\nAndroid Studio\nPyCharm\nSublime Text\nNode.js\nJava\nTeamViewer\nTortoiseGit\nTortoiseSVN\nFoxit Reader\nPotPlayer\nAVG\nAvira\nBitdefender\nAvast\nESET\nNorton AntiVirus\nKMPlayer\nMailbird\nPostbox\nMozilla Thunderbird\nTypora\nGrammarly\nSourceTree\nGitHub Desktop\nDirectory Opus\nFreeCommander\nTotal Commander\nBreeZip\nMotrix\nBitComet\n迅雷极速版\n搜狗拼音输入法\nRust\nGolang\nNavicat 17\nNosqlbooster4mongo\nAnother Redis Desktop Manager\nDB Browser for SQLite\nDBeaver\nDotnet SDK\n向日葵\nRustDesk\nEclipse\nAtom\nEvernote\nScrivener\nToDesk\nMailbird\nPostbox'
const softwareranks = rank.split('\n');
const softwares = require('./software.json')

for (let software of softwares.softwares) {
    const findIndex = softwareranks.findIndex(item => item === software.name);
    if (findIndex!== -1) {
        software.showIndex = findIndex + 1;
    }
}

const fs = require('fs');
fs.writeFileSync('./software_1.json', JSON.stringify(softwares, null, 4))