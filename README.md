# Visual Regression Testing Tool

A self-hosted visual regression testing tool built with Node.js that allows you to set baselines and compare screenshots of your website across different URLs and selectors.

## Features

- 📸 Screenshot capture with Puppeteer
- 🔍 Pixel-level image comparison with Pixelmatch
- 📊 Console and HTML reporting
- ⚙️ Flexible configuration for multiple URLs and selectors
- 🎯 Support for different viewport sizes
- 📁 Baseline management system
- 🚀 Easy-to-use CLI interface

## Installation

1. Clone or download this project
2. Install dependencies:
```bash
npm install
```

## Quick Start

1. **Initialize configuration:**
```bash
node index.js init
```

2. **Edit the configuration file** (`config/visual-regression.config.json`) to match your website:
```json
{
  "baseUrl": "http://localhost:3000",
  "targets": [
    {
      "name": "homepage",
      "url": "/",
      "selector": "body",
      "viewport": { "width": 1200, "height": 800 }
    },
    {
      "name": "header",
      "url": "/",
      "selector": "header",
      "viewport": { "width": 1200, "height": 200 }
    }
  ],
  "options": {
    "waitTime": 3000,
    "threshold": 0.1,
    "includeAA": false,
    "diffMask": [255, 0, 255]
  }
}
```

3. **Set baseline screenshots:**
```bash
node index.js baseline
```

4. **Run visual regression tests:**
```bash
node index.js test --html
```

## CLI Commands

### `init`
Initialize a sample configuration file.
```bash
node index.js init [--force]
```
- `--force`: Overwrite existing configuration

### `crawl`
Crawl a website to auto-discover pages and generate configuration.
```bash
node index.js crawl <url> [--depth <number>] [--pages <number>] [--selector <selector>] [--save]
```
- `<url>`: Base URL to crawl (e.g., http://localhost:3000)
- `--depth`: Max crawl depth (default: 2)
- `--pages`: Max pages to find (default: 20)
- `--selector`: CSS selector to target on each page (default: body)
- `--save`: Save found targets to config/visual-regression.config.json

### `ci`
Setup CI/CD integration.
```bash
node index.js ci --gitlab
```
- `--gitlab`: Generate a .gitlab-ci.yml file

### `baseline`
Set baseline screenshots for comparison.
```bash
node index.js baseline [--config <path>] [--target <name>]
```
- `--config`: Configuration file path (default: config/visual-regression.config.json)
- `--target`: Set baseline for specific target only

### `test`
Run visual regression tests.
```bash
node index.js test [--config <path>] [--output <dir>] [--html]
```
- `--config`: Configuration file path (default: config/visual-regression.config.json)
- `--output`: Output directory for results (default: results)
- `--html`: Generate HTML report

### `list`
List all baseline screenshots.
```bash
node index.js list
```

### `clear`
Clear all baseline screenshots.
```bash
node index.js clear [--yes]
```
- `--yes`: Skip confirmation prompt

## Configuration

The configuration file (`config/visual-regression.config.json`) supports the following options:

### baseUrl
The base URL for your website (e.g., `http://localhost:3000`).

### targets
Array of targets to test. Each target can have:
- `name`: Unique identifier for the target
- `url`: URL path relative to baseUrl
- `selector`: CSS selector to capture (e.g., `body`, `#main`, `.header`)
- `viewport`: Object with `width` and `height` for browser viewport
- `ignoreSelectors`: Array of CSS selectors to hide (visibility: hidden)
- `maskSelectors`: Array of CSS selectors to mask with solid color

### options
Comparison and capture options:
- `waitTime`: Time to wait after page load before screenshot (ms)
- `threshold`: Difference threshold (0-1, lower = stricter)
- `includeAA`: Include anti-aliased pixels in comparison
- `diffMask`: RGB color for highlighting differences

## Workflow

1. **Setup**: Configure your targets in the config file
2. **Baseline**: Capture initial screenshots as the "golden" baseline
3. **Develop**: Make changes to your website
4. **Test**: Run regression tests to compare against baseline
5. **Review**: Check console output and HTML report for differences
6. **Update**: If changes are expected, update the baseline

## Output Structure

```
results/
├── current-YYYY-MM-DDTHH-MM-SS-SSSZ/    # Current screenshots
├── diff-YYYY-MM-DDTHH-MM-SS-SSSZ/       # Difference images
└── report-YYYY-MM-DDTHH-MM-SS-SSSZ.html # HTML report
baseline/                                 # Baseline screenshots
```

## Examples

### Test Multiple Viewports
```json
{
  "targets": [
    {
      "name": "homepage-desktop",
      "url": "/",
      "selector": "body",
      "viewport": { "width": 1200, "height": 800 }
    },
    {
      "name": "homepage-mobile",
      "url": "/",
      "selector": "body",
      "viewport": { "width": 375, "height": 667 }
    }
  ]
}
```

### Test Specific Components
```json
{
  "targets": [
    {
      "name": "navigation",
      "url": "/",
      "selector": "nav",
      "viewport": { "width": 1200, "height": 100 }
    },
    {
      "name": "footer",
      "url": "/",
      "selector": "footer",
      "viewport": { "width": 1200, "height": 200 }
    }
  ]
}
```

### Test Multiple Pages
```json
{
  "targets": [
    {
      "name": "home",
      "url": "/",
      "selector": "body",
      "viewport": { "width": 1200, "height": 800 }
    },
    {
      "name": "about",
      "url": "/about",
      "selector": "body",
      "viewport": { "width": 1200, "height": 800 }
    }
  ]
}
```

## Integration with CI/CD

This tool can be easily integrated into CI/CD pipelines:

```bash
# Set baseline (run once or when updating)
node index.js baseline

# Run tests in CI
node index.js test --html

# The tool will exit with code 1 if any tests fail
```

## Troubleshooting

### Common Issues

1. **Screenshots are blank**: Increase `waitTime` in configuration
2. **Element not found**: Check that the selector exists and the page is fully loaded
3. **Connection refused**: Ensure your website is running on the specified baseUrl
4. **Permission denied**: Check file permissions for the project directory

### Debug Mode

For debugging, you can modify the `screenshot-capture.js` to enable headful mode:
```javascript
await puppeteer.launch({
  headless: false, // Set to false for debugging
  // ... other options
});
```

## Dependencies

- **puppeteer**: Browser automation for screenshot capture
- **pixelmatch**: Pixel-level image comparison
- **fs-extra**: Enhanced file system operations
- **commander**: CLI framework
- **chalk**: Terminal colors and formatting

## License

MIT License - feel free to use this in your projects!
