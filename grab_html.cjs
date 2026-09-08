const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000');
  await new Promise(r => setTimeout(r, 2000));
  const rootHtml = await page.evaluate(() => document.getElementById('root').innerHTML);
  console.log(rootHtml.substring(0, 1000));
  
  // also get the text content to see what's visible
  const text = await page.evaluate(() => document.body.innerText);
  console.log("---------- TEXT -----------");
  console.log(text.substring(0, 500));
  await browser.close();
})();
