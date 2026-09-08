const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  const html = await page.evaluate(() => document.getElementById('root').innerHTML);
  const fs = require('fs');
  fs.writeFileSync('dom.html', html);
  await browser.close();
})();
