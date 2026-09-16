import { app, BrowserWindow, Menu, ipcMain } from 'electron'
import path from 'path'
import { startProxy, type ProxyHandle } from './proxy'

/** 本地代理句柄；窗口就绪后把端口告知渲染层。 */
let proxy: ProxyHandle | null = null

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: true,
      contextIsolation: false,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(__dirname, '../index.html'))
  }

  // 把代理端口交给渲染层（渲染层据此拼接请求地址）
  if (proxy) {
    win.webContents.on('did-finish-load', () => {
      win.webContents.send('proxy-port', proxy?.port ?? null)
    })
  }

  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [{ role: 'quit' }]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    }
  ]
  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

app.whenReady().then(async () => {
  // 先起代理再开窗口：窗口加载时需要知道端口
  try {
    proxy = await startProxy()
    console.log(`[StockAll] 本地行情代理已启动: http://127.0.0.1:${proxy.port}`)
  } catch (err) {
    // 代理起不来不影响主功能——行情接口本身带 CORS，
    // 只是搜索会退回到内置股票表。
    console.error('[StockAll] 本地代理启动失败，搜索将退回内置表:', err)
  }

  // 渲染层主动询问端口（应对 did-finish-load 与渲染层就绪的时序差异）
  ipcMain.handle('get-proxy-port', () => proxy?.port ?? null)

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  proxy?.close()
})
