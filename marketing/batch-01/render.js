// Render the print files: node render.js <dir> <name> <widthMm> <heightMm> <scale>
const { chromium } = require('playwright');
const path = require('path');
const [dir, name, wmm, hmm, scale] = process.argv.slice(2);
const mmToPx = (mm) => Math.round((Number(mm) / 25.4) * 96);
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  const p = await b.newPage({ viewport: { width: mmToPx(wmm), height: mmToPx(hmm) }, deviceScaleFactor: Number(scale) });
  await p.goto('file://' + path.join(dir, name + '.html'), { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(400);
  const pages = await p.$$('.page');
  for (let i = 0; i < pages.length; i++) {
    const suffix = pages.length > 1 ? `-${i === 0 ? 'front' : 'back'}` : '';
    await pages[i].screenshot({ path: path.join(dir, `${name}${suffix}.png`) });
  }
  await p.pdf({ path: path.join(dir, name + '.pdf'), width: wmm + 'mm', height: hmm + 'mm', printBackground: true, preferCSSPageSize: true });
  // Overflow check: is any content spilling past a page edge?
  const over = await p.$$eval('.page', (ps) => ps.map((pg) => pg.scrollHeight - pg.clientHeight));
  console.log(name, 'pages', pages.length, 'overflow px', over);
  // Print-shop version: 3mm bleed of background on every side (trim size + 6mm).
  await p.addStyleTag({ content: '@page { size: auto; margin: 0 } body { padding: 3mm; background: #080808 } .page { box-shadow: 0 0 0 3mm #080808 }' });
  await p.pdf({ path: path.join(dir, name + '-print-bleed-3mm.pdf'), width: (Number(wmm) + 6) + 'mm', height: (Number(hmm) + 6) + 'mm', printBackground: true, preferCSSPageSize: false });
  await b.close();
})();
