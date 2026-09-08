const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('console', msg => console.log('LOG:', msg.text()));
  await page.goto('http://localhost:3000');
  await new Promise(r => setTimeout(r, 3000));
  const rootHtml = await page.evaluate(() => document.getElementById('root').innerHTML);
  console.log("ROOT HTML LENGTH:", rootHtml.length);
  const bodyHtml = await page.evaluate(() => document.body.innerHTML);
  console.log("BODY HTML LENGTH:", bodyHtml.length);
  await browser.close();
})();
