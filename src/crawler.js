const puppeteer = require('puppeteer');
const { URL } = require('url');

class Crawler {
  constructor(options = {}) {
    this.maxDepth = options.maxDepth || 2;
    this.maxPages = options.maxPages || 20;
    this.defaultSelector = options.selector || 'body';
    this.visited = new Set();
    this.queue = [];
    this.targets = [];
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

  normalizeUrl(url) {
    // Remove hash and trailing slash
    const u = new URL(url);
    u.hash = '';
    if (u.pathname !== '/' && u.pathname.endsWith('/')) {
      u.pathname = u.pathname.slice(0, -1);
    }
    return u.toString();
  }

  async crawl(baseUrl) {
    if (!this.browser) {
      await this.launch();
    }

    const startUrl = this.normalizeUrl(baseUrl);
    this.queue.push({ url: startUrl, depth: 0 });
    this.visited.add(startUrl);

    // Concurrency limit for parallel crawling
    const concurrency = 5;
    const activeWorkers = new Set();

    try {
      while ((this.queue.length > 0 || activeWorkers.size > 0) && this.targets.length < this.maxPages) {

        // Spawn workers if we have queue items and capacity
        while (this.queue.length > 0 && activeWorkers.size < concurrency && this.targets.length < this.maxPages) {
          const { url, depth } = this.queue.shift();

          const promise = this.processPage(url, depth, baseUrl)
            .catch(err => {
              console.error(`Error crawling ${url}: ${err.message}`);
            })
            .finally(() => {
              activeWorkers.delete(promise);
            });

          activeWorkers.add(promise);
        }

        // If we have active workers, wait for one to finish
        if (activeWorkers.size > 0) {
          await Promise.race(activeWorkers);
        }
      }

      // Wait for any remaining workers to finish before closing browser
      if (activeWorkers.size > 0) {
        await Promise.all(activeWorkers);
      }
    } finally {
      await this.close();
    }

    return this.targets;
  }

  async processPage(url, depth, baseUrl) {
    console.log(`Crawling: ${url}`);

    const urlObj = new URL(url);
    const relativePath = urlObj.pathname + urlObj.search;

    let name = relativePath === '/' ? 'homepage' : relativePath.replace(/^\//, '').replace(/\//g, '-');
    name = name.replace(/[^a-z0-9\-_]/gi, '-');

    const target = {
      name: name,
      url: relativePath,
      selector: this.defaultSelector,
      viewport: { width: 1200, height: 800 }
    };

    // If we reached max depth, we add the target without visiting (mimicking original behavior)
    if (depth >= this.maxDepth) {
      if (this.targets.length < this.maxPages) {
         this.targets.push(target);
      }
      return;
    }

    const page = await this.browser.newPage();
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

      // Verify selector exists if not body
      if (this.defaultSelector !== 'body') {
        const element = await page.$(this.defaultSelector);
        if (!element) {
          console.log(`Skipping ${url} (selector "${this.defaultSelector}" not found)`);
          return;
        }
      }

      // If we are here, the page is valid. Add to targets.
      if (this.targets.length < this.maxPages) {
          this.targets.push(target);
      } else {
          return;
      }

      const hrefs = await page.$$eval('a', as => as.map(a => a.href));

      for (const href of hrefs) {
        try {
          const u = new URL(href);
          // Only same origin
          if (u.origin === new URL(baseUrl).origin) {
            const normalized = this.normalizeUrl(href);
            if (!this.visited.has(normalized)) {
              this.visited.add(normalized);
              this.queue.push({ url: normalized, depth: depth + 1 });
            }
          }
        } catch (e) {
          // Ignore invalid URLs
        }
      }
    } finally {
      await page.close();
    }
  }
}

module.exports = Crawler;
