const chalk = require('chalk').default;
const fs = require('fs-extra');
const path = require('path');

class Reporter {
  constructor() {
    this.results = [];
  }

  addResult(result) {
    this.results.push(result);
  }

  addResults(results) {
    this.results.push(...results);
  }

  generateConsoleReport() {
    console.log('\n' + chalk.bold.blue('='.repeat(60)));
    console.log(chalk.bold.blue('VISUAL REGRESSION TEST RESULTS'));
    console.log(chalk.bold.blue('='.repeat(60)));

    if (this.results.length === 0) {
      console.log(chalk.yellow('No test results to display.'));
      return;
    }

    const passed = this.results.filter(r => r.passed !== false && r.success !== false);
    const failed = this.results.filter(r => r.passed === false || r.success === false);

    console.log(chalk.green(`✓ Passed: ${passed.length}`));
    console.log(chalk.red(`✗ Failed: ${failed.length}`));
    console.log(chalk.blue(`Total: ${this.results.length}`));
    console.log('');

    if (failed.length > 0) {
      console.log(chalk.bold.red('FAILED TESTS:'));
      console.log(chalk.red('-'.repeat(40)));

      failed.forEach(result => {
        console.log(chalk.red(`✗ ${result.target.name}`));
        
        if (result.error) {
          console.log(chalk.gray(`  Error: ${result.error}`));
        } else if (!result.hasBaseline) {
          console.log(chalk.gray('  No baseline image found'));
        } else {
          console.log(chalk.gray('  Diff pixels: ' + result.diffPixels));
          console.log(chalk.gray('  Diff percentage: ' + result.diffPercentage + '%'));
          if (result.diffPath) {
            console.log(chalk.gray('  Diff image: ' + result.diffPath));
          }
        }
        console.log('');
      });
    }

    if (passed.length > 0) {
      console.log(chalk.bold.green('PASSED TESTS:'));
      console.log(chalk.green('-'.repeat(40)));

      passed.forEach(result => {
        console.log(chalk.green(`✓ ${result.target.name}`));
        if (result.diffPercentage !== undefined) {
          console.log(chalk.gray(`  Diff percentage: ${result.diffPercentage}%`));
        }
      });
      console.log('');
    }

    console.log(chalk.bold.blue('='.repeat(60)));
  }

  async generateHtmlReport(outputPath = 'results/report.html') {
    const html = this.generateHtmlContent();
    
    await fs.ensureDir(path.dirname(outputPath));
    await fs.writeFile(outputPath, html);
    
    console.log(chalk.blue(`HTML report generated: ${outputPath}`));
    return outputPath;
  }

  generateHtmlContent() {
    const passed = this.results.filter(r => r.passed !== false && r.success !== false);
    const failed = this.results.filter(r => r.passed === false || r.success === false);
    const timestamp = new Date().toISOString();

    let html = '<!DOCTYPE html>\n<html lang="en">\n<head>\n';
    html += '    <meta charset="UTF-8">\n';
    html += '    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n';
    html += '    <title>Visual Regression Report</title>\n';
    html += '    <style>\n';
    html += '        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }\n';
    html += '        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden; }\n';
    html += '        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }\n';
    html += '        .header h1 { margin: 0; font-size: 2.5em; }\n';
    html += '        .header p { margin: 10px 0 0 0; opacity: 0.9; }\n';
    html += '        .summary { display: flex; justify-content: space-around; padding: 30px; background: #f8f9fa; border-bottom: 1px solid #e9ecef; }\n';
    html += '        .summary-item { text-align: center; }\n';
    html += '        .summary-item .number { font-size: 2em; font-weight: bold; display: block; }\n';
    html += '        .summary-item .label { color: #6c757d; text-transform: uppercase; font-size: 0.9em; letter-spacing: 1px; }\n';
    html += '        .passed { color: #28a745; }\n';
    html += '        .failed { color: #dc3545; }\n';
    html += '        .total { color: #007bff; }\n';
    html += '        .results { padding: 30px; }\n';
    html += '        .result-item { border: 1px solid #e9ecef; border-radius: 8px; margin-bottom: 20px; overflow: hidden; }\n';
    html += '        .result-header { padding: 15px 20px; font-weight: bold; display: flex; justify-content: space-between; align-items: center; }\n';
    html += '        .result-header.passed { background: #d4edda; color: #155724; }\n';
    html += '        .result-header.failed { background: #f8d7da; color: #721c24; }\n';
    html += '        .result-content { padding: 20px; background: white; }\n';
    html += '        .result-details { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }\n';
    html += '        .detail-item { padding: 10px; background: #f8f9fa; border-radius: 4px; }\n';
    html += '        .detail-label { font-weight: bold; color: #495057; margin-bottom: 5px; }\n';
    html += '        .detail-value { color: #6c757d; }\n';
    html += '        .error-message { background: #f8d7da; color: #721c24; padding: 15px; border-radius: 4px; border: 1px solid #f5c6cb; }\n';
    html += '    </style>\n';
    html += '</head>\n<body>\n';
    html += '    <div class="container">\n';
    html += '        <div class="header">\n';
    html += '            <h1>Visual Regression Report</h1>\n';
    html += '            <p>Generated on ' + new Date(timestamp).toLocaleString() + '</p>\n';
    html += '        </div>\n';
    html += '        <div class="summary">\n';
    html += '            <div class="summary-item">\n';
    html += '                <span class="number passed">' + passed.length + '</span>\n';
    html += '                <span class="label">Passed</span>\n';
    html += '            </div>\n';
    html += '            <div class="summary-item">\n';
    html += '                <span class="number failed">' + failed.length + '</span>\n';
    html += '                <span class="label">Failed</span>\n';
    html += '            </div>\n';
    html += '            <div class="summary-item">\n';
    html += '                <span class="number total">' + this.results.length + '</span>\n';
    html += '                <span class="label">Total</span>\n';
    html += '            </div>\n';
    html += '        </div>\n';
    html += '        <div class="results">\n';
    
    this.results.forEach(result => {
      html += this.generateResultHtml(result);
    });
    
    html += '        </div>\n';
    html += '    </div>\n';
    html += '</body>\n</html>';
    
    return html;
  }

  generateResultHtml(result) {
    const status = result.passed === false || result.success === false ? 'failed' : 'passed';
    const statusText = status === 'passed' ? '✓ PASSED' : '✗ FAILED';
    
    let html = '<div class="result-item">\n';
    html += '    <div class="result-header ' + status + '">\n';
    html += '        <span>' + result.target.name + '</span>\n';
    html += '        <span>' + statusText + '</span>\n';
    html += '    </div>\n';
    html += '    <div class="result-content">\n';
    
    if (result.error) {
      html += '        <div class="error-message"><strong>Error:</strong> ' + result.error + '</div>\n';
    } else {
      html += this.generateResultDetailsSync(result);
    }
    
    html += '    </div>\n';
    html += '</div>\n';
    
    return html;
  }

  generateResultDetailsSync(result) {
    let html = '        <div class="result-details">\n';
    html += '            <div class="detail-item">\n';
    html += '                <div class="detail-label">URL</div>\n';
    html += '                <div class="detail-value">' + result.target.url + '</div>\n';
    html += '            </div>\n';
    html += '            <div class="detail-item">\n';
    html += '                <div class="detail-label">Selector</div>\n';
    html += '                <div class="detail-value">' + result.target.selector + '</div>\n';
    html += '            </div>\n';
    html += '            <div class="detail-item">\n';
    html += '                <div class="detail-label">Viewport</div>\n';
    html += '                <div class="detail-value">' + result.target.viewport.width + 'x' + result.target.viewport.height + '</div>\n';
    html += '            </div>\n';

    if (result.diffPixels !== undefined) {
      html += '            <div class="detail-item">\n';
      html += '                <div class="detail-label">Diff Pixels</div>\n';
      html += '                <div class="detail-value">' + result.diffPixels + '</div>\n';
      html += '            </div>\n';
      html += '            <div class="detail-item">\n';
      html += '                <div class="detail-label">Diff Percentage</div>\n';
      html += '                <div class="detail-value">' + result.diffPercentage + '%</div>\n';
      html += '            </div>\n';
    }

    html += '        </div>\n';
    return html;
  }

  async imageToBase64(imagePath) {
    try {
      const imageBuffer = await fs.readFile(imagePath);
      return imageBuffer.toString('base64');
    } catch (error) {
      return '';
    }
  }

  clearResults() {
    this.results = [];
  }

  getSummary() {
    const passed = this.results.filter(r => r.passed !== false && r.success !== false);
    const failed = this.results.filter(r => r.passed === false || r.success === false);
    
    return {
      total: this.results.length,
      passed: passed.length,
      failed: failed.length,
      successRate: this.results.length > 0 ? ((passed.length / this.results.length) * 100).toFixed(2) : 0
    };
  }
}

module.exports = Reporter;
