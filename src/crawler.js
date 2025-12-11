const puppeteer = require('puppeteer');
const { URL } = require('url');

class Crawler {
  constructor(options = {}) {
    this.maxDepth = options.maxDepth || 2;
    this.maxPages = options.maxPages || 20;
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

    try {
      while (this.queue.length > 0 && this.targets.length < this.maxPages) {
        const { url, depth } = this.queue.shift();

        console.log(`Crawling: ${url}`);

        // Add to targets
        const urlObj = new URL(url);
        const relativePath = urlObj.pathname + urlObj.search;

        // Avoid adding duplicates (though visited set handles URLs, targets need names)
        let name = relativePath === '/' ? 'homepage' : relativePath.replace(/^\//, '').replace(/\//g, '-');

        // Sanitize name for filenames
        name = name.replace(/[^a-z0-9\-_]/gi, '-');

        this.targets.push({
          name: name,
          url: relativePath,
          selector: 'body',
          viewport: { width: 1200, height: 800 }
        });

        if (depth >= this.maxDepth) {
          continue;
        }

        try {
          const page = await this.browser.newPage();
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

          const hrefs = await page.$$eval('a', as => as.map(a => a.href));
          await page.close();

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
        } catch (err) {
          console.error(`Error crawling ${url}: ${err.message}`);
        }
      }
    } finally {
      await this.close();
    }

    return this.targets;
  }
}

module.exports = Crawler;
