const { app, BrowserWindow } = require('electron');
app.disableHardwareAcceleration();
app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1280, height: 900, show: false });
  await win.loadURL('http://localhost:5199/index.html');
  await new Promise(r => setTimeout(r, 3000));
  const r = await win.webContents.executeJavaScript(`
    (async () => {
      const out = [];
      const res = await fetch('https://smartbox.gtimg.cn/s3/?v=2&q=' + encodeURIComponent('茅台') + '&t=all', { headers: { 'Referer': 'https://gu.qq.com/' } });
      const buf = await res.arrayBuffer();
      const txt = new TextDecoder('gb18030').decode(buf);
      out.push('RAW: ' + JSON.stringify(txt));
      const eq = txt.indexOf('="');
      out.push('eq索引: ' + eq);
      if (eq !== -1) {
        const payload = txt.slice(eq + 2).replace(/"\\s*$/, '');
        out.push('payload: ' + JSON.stringify(payload));
        out.push('按^切分: ' + payload.split('^').length + ' 段');
        payload.split('^').forEach((e, i) => {
          const p = e.split('~');
          out.push('  段' + i + ': 字段数=' + p.length + ' | market=' + p[0] + ' code=' + p[1] + ' name=' + p[2] + ' kind=' + p[4]);
        });
      }
      return out.join(' ;; ');
    })()
  `);
  console.log('R:' + r);
  app.quit();
});
