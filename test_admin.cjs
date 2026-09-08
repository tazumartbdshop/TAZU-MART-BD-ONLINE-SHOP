const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('LOG:', msg.text()));
  page.on('pageerror', error => console.log('ERROR:', error.message));

  await page.goto('http://localhost:3000/admin');
  await new Promise(r => setTimeout(r, 2000));
  
  const text = await page.evaluate(() => document.body.innerText);
  console.log("---------- TEXT -----------");
  console.log(text.substring(0, 500));
  await browser.close();
})();
