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
    this.concurrency = 5;
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

  async processPage(url, depth) {
    console.log(`Crawling: ${url}`);

    // Add to targets (thread-safe push in JS)
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

    this.targets.push(target);

    if (depth >= this.maxDepth) {
      return;
    }

    try {
      const page = await this.browser.newPage();
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // Verify selector exists
        if (this.defaultSelector !== 'body') {
          const element = await page.$(this.defaultSelector);
          if (!element) {
             const idx = this.targets.indexOf(target);
             if (idx > -1) {
               this.targets.splice(idx, 1);
             }
             console.log(`Skipping ${url} (selector "${this.defaultSelector}" not found)`);
             return;
          }
        }

        const hrefs = await page.$$eval('a', as => as.map(a => a.href));

        // Process links
        for (const href of hrefs) {
          try {
            const u = new URL(href);
            // Only same origin
            const currentOrigin = new URL(url).origin;

            if (u.origin === currentOrigin) {
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
    } catch (err) {
      console.error(`Error crawling ${url}: ${err.message}`);
      // Remove target on error
      const idx = this.targets.indexOf(target);
      if (idx > -1) {
        this.targets.splice(idx, 1);
      }
    }
  }

  async crawl(baseUrl) {
    if (!this.browser) {
      await this.launch();
    }

    const startUrl = this.normalizeUrl(baseUrl);
    this.queue.push({ url: startUrl, depth: 0 });
    this.visited.add(startUrl);

    const activePromises = new Set();

    try {
      // Loop as long as there is work to do OR work being done
      while (this.queue.length > 0 || activePromises.size > 0) {

        // Check if we are done with targets, but only if no active promises are running that might fail.
        // If active promises are running, we must wait because one might fail and we need to replace it.
        // Actually, if we hit maxPages, we should just stop adding new ones.
        // But if an active one fails, we drop below maxPages, and we should add more if queue has items.

        // Fill up concurrency slots
        // Condition to add more:
        // 1. We have slots (activePromises < concurrency)
        // 2. We have items in queue
        // 3. We haven't reached maxPages
        while (
            activePromises.size < this.concurrency &&
            this.queue.length > 0 &&
            this.targets.length < this.maxPages
        ) {
          const { url, depth } = this.queue.shift();

          const promise = this.processPage(url, depth).then(() => {
             activePromises.delete(promise);
          }).catch(err => {
             console.error(`Unexpected error in worker: ${err}`);
             activePromises.delete(promise);
          });

          activePromises.add(promise);
        }

        // If we have hit maxPages, but we have active promises, we should wait.
        // If they succeed, we are done. If they fail, we might need to process queue again.
        // So the outer loop condition (queue > 0 || active > 0) is correct.
        // But we need to break if:
        // targets >= maxPages AND activePromises == 0
        if (this.targets.length >= this.maxPages && activePromises.size === 0) {
            break;
        }

        // Wait for one to finish if we are full or queue is empty but things are running
        // OR if we are just waiting because we hit maxPages limit but have active workers
        if (activePromises.size > 0) {
           await Promise.race(activePromises);
        }
      }

    } finally {
      await this.close();
    }

    return this.targets;
  }
}

module.exports = Crawler;
