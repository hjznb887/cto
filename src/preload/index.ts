// Preload script
//
// 注意：主进程创建窗口时用的是 contextIsolation: false + nodeIntegration: true，
// 因此这里可以直接使用 require 拿到 ipcRenderer，并挂到 window 上，
// 供渲染层探测本地代理端口。

import { ipcRenderer } from 'electron'

// 渲染层通过 window.ipcRenderer.invoke('get-proxy-port') 询问代理端口。
// 用 getter 暴露，避免渲染层误以为可以随意发消息。
Object.defineProperty(window, 'ipcRenderer', {
  value: { invoke: ipcRenderer.invoke.bind(ipcRenderer) },
  writable: false,
  configurable: false,
})

window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector: string, text: string) => {
    const element = document.getElementById(selector)
    if (element) element.innerText = text
  }

  for (const type of ['chrome', 'node', 'electron']) {
    replaceText(`${type}-version`, process.versions[type] as string)
  }
})
