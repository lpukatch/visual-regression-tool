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
    const concurrency = 5; // Default concurrency limit
    const queue = [...targets];
    
    // Worker function to process items from the queue
    const worker = async () => {
      while (queue.length > 0) {
        // Shift is safe here because JS is single-threaded (no race condition on array mutation)
        // However, we need to ensure we don't start processing undefined if queue became empty
        // between check and shift (though in this loop structure it's fine).
        const target = queue.shift();
        if (!target) break;

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
    };

    // Create worker promises
    const workers = [];
    // If targets are fewer than concurrency, only spawn needed workers
    const workerCount = Math.min(concurrency, targets.length);

    for (let i = 0; i < workerCount; i++) {
      workers.push(worker());
    }
    
    await Promise.all(workers);

    // Restore original order in results if needed (though not strictly required by contract, it's nice)
    // The current implementation appends to results as they finish, so order is not guaranteed.
    // If order matters, we should map back to original targets.
    // The original implementation returned results in order.
    // Let's sort results to match targets order
    const resultsMap = new Map(results.map(r => [r.target.name, r]));
    const orderedResults = targets.map(t => resultsMap.get(t.name)).filter(Boolean);

    return orderedResults;
  }
}

module.exports = ScreenshotCapture;
