const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const path = require('path');

class ScreenshotCapture {
  constructor() {
    this.browser = null;
  }

  async launch() {
    this.browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async captureScreenshot(config, target, outputPath) {
    const page = await this.browser.newPage();
    
    try {
      // Set viewport
      await page.setViewport(target.viewport);
      
      // Navigate to the URL
      const fullUrl = config.baseUrl + target.url;
      console.log(`Capturing: ${fullUrl}`);
      await page.goto(fullUrl, { waitUntil: 'networkidle2' });
      
      // Wait for specified time
      if (config.options.waitTime) {
        await new Promise(resolve => setTimeout(resolve, config.options.waitTime));
      }
      
      // Wait for selector if specified
      if (target.selector && target.selector !== 'body') {
        await page.waitForSelector(target.selector, { timeout: 10000 });
      }

      // Apply masking/ignoring
      if (target.ignoreSelectors && Array.isArray(target.ignoreSelectors)) {
        await page.evaluate((selectors) => {
          selectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
              el.style.visibility = 'hidden';
            });
          });
        }, target.ignoreSelectors);
      }

      if (target.maskSelectors && Array.isArray(target.maskSelectors)) {
        await page.evaluate((selectors) => {
          selectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
              el.style.backgroundColor = 'magenta';
              el.style.color = 'transparent';
              el.style.backgroundImage = 'none';
            });
          });
        }, target.maskSelectors);
      }
      
      // Capture screenshot of element or full page
      let screenshot;
      if (target.selector && target.selector !== 'body') {
        const element = await page.$(target.selector);
        if (!element) {
          throw new Error(`Element not found: ${target.selector}`);
        }
        screenshot = await element.screenshot({ type: 'png' });
      } else {
        screenshot = await page.screenshot({ type: 'png', fullPage: true });
      }
      
      // Ensure output directory exists
      await fs.ensureDir(path.dirname(outputPath));
      
      // Save screenshot
      await fs.writeFile(outputPath, screenshot);
      console.log(`Screenshot saved: ${outputPath}`);
      
      return outputPath;
    } finally {
      await page.close();
    }
  }

  async captureMultiple(config, targets, outputDir) {
    const results = [];
    
    for (const target of targets) {
      const filename = `${target.name}.png`;
      const outputPath = path.join(outputDir, filename);
      
      try {
        const result = await this.captureScreenshot(config, target, outputPath);
        results.push({ target, path: result, success: true });
      } catch (error) {
        console.error(`Failed to capture ${target.name}:`, error.message);
        results.push({ target, error: error.message, success: false });
      }
    }
    
    return results;
  }
}

module.exports = ScreenshotCapture;
