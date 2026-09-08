const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => { if (msg.type() === 'error') console.log('ERROR LOG:', msg.text()); });
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

  const routes = ['/account', '/admin', '/products', '/search'];
  for (const r of routes) {
      await page.goto(`http://localhost:3000${r}`, { waitUntil: 'networkidle2' });
      const text = await page.evaluate(() => document.body.innerText);
      console.log(`ROUTE ${r} length: ${text.length}`);
      if (text.length < 100) {
          console.log(`ROUTE ${r} IS BLANK OR SMALL:`, text);
      }
  }
  await browser.close();
})();
