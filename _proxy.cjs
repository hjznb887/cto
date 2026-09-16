const { app, BrowserWindow } = require('electron');
app.disableHardwareAcceleration();
app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1280, height: 900, show: false,
    webPreferences: { preload: require('path').join(__dirname, 'dist/preload/index.js'), nodeIntegration: true, contextIsolation: false } });
  await win.loadFile(require('path').join(__dirname, 'dist/index.html'));
  await new Promise(r => setTimeout(r, 4000));
  const r = await win.webContents.executeJavaScript(`
    (async () => {
      const out = [];
      const pc = await import('/src/renderer/services/sources/proxyClient.ts');
      const port = await pc.resolveProxyPort();
      out.push('代理端口: ' + port);
      out.push('代理可用: ' + pc.hasProxy());
      if (port) {
        const t = await pc.proxyText('https://smartbox.gtimg.cn/s3/?v=2&q=' + encodeURIComponent('招商') + '&t=all');
        out.push('经代理搜索"招商": ' + (t ? t.slice(0, 100) : 'null'));
      }
      return out.join(' ;; ');
    })()
  `);
  console.log('R:' + r);
  app.quit();
});
