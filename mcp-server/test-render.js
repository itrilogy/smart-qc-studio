import puppeteer from 'puppeteer';
import fs from 'fs';

async function test() {
  const commonPaths = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome"
  ];
  
  let executablePath;
  for (const path of commonPaths) {
    if (!fs.existsSync(path)) {
      console.log(`${path} does not exist.`);
      continue;
    }
    executablePath = path;
    console.log(`Trying ${executablePath}...`);
    try {
      const browser = await puppeteer.launch({
        headless: "new",
        executablePath,
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
      });
      console.log("Success!");
      await browser.close();
      return;
    } catch (e) {
      console.error(`Failed to launch browser: ${e.message}`);
    }
  }
  console.error("No valid Chrome executable found.");
}

test();
