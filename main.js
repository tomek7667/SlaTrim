const { app, BrowserWindow } = require('electron')
const path = require('path')

function createWindow () {
    const win = new BrowserWindow({
        width: 1080,
        height: 920,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            enableRemoteModule: true,
            nodeIntegration: true,
            devtools: false
        }
    })
    win.loadFile('index.html');
}

app.whenReady().then(() => {
    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    })
})

app.on('window-all-closed', () => {
    app.quit();
})
