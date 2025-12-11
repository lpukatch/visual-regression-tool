#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk').default;
const path = require('path');
const fs = require('fs-extra');

const ConfigLoader = require('./src/config-loader');
const ScreenshotCapture = require('./src/screenshot-capture');
const ImageComparator = require('./src/image-comparator');
const BaselineManager = require('./src/baseline-manager');
const Reporter = require('./src/reporter');
const Crawler = require('./src/crawler');

const program = new Command();

program
  .name('visual-regression')
  .description('Self-hosted visual regression testing tool')
  .version('1.0.0');

program
  .command('init')
  .description('Initialize a sample configuration file')
  .option('-f, --force', 'Overwrite existing configuration')
  .action(async (options) => {
    try {
      const configLoader = new ConfigLoader();
      
      if (await fs.pathExists(configLoader.configPath) && !options.force) {
        console.log(chalk.yellow('Configuration file already exists. Use --force to overwrite.'));
        return;
      }
      
      await configLoader.createSampleConfig();
      console.log(chalk.green('Sample configuration created at config/visual-regression.config.json'));
      console.log(chalk.blue('Edit the configuration file to match your website URLs and targets.'));
    } catch (error) {
      console.error(chalk.red('Error creating configuration:'), error.message);
      process.exit(1);
    }
  });

program
  .command('crawl')
  .description('Crawl website to auto-discover targets')
  .argument('<url>', 'Base URL to crawl')
  .option('-d, --depth <number>', 'Max depth to crawl', '2')
  .option('-p, --pages <number>', 'Max pages to find', '20')
  .option('-s, --save', 'Save found targets to config file')
  .action(async (url, options) => {
    try {
      console.log(chalk.blue(`Crawling ${url}...`));

      const crawler = new Crawler({
        maxDepth: parseInt(options.depth),
        maxPages: parseInt(options.pages)
      });

      const targets = await crawler.crawl(url);

      console.log(chalk.green(`\nFound ${targets.length} targets:`));
      targets.forEach(t => {
        console.log(chalk.gray(`  - ${t.name}: ${t.url}`));
      });

      if (options.save) {
        const configLoader = new ConfigLoader();
        const existingConfig = await configLoader.loadConfig();

        // Update config with new targets
        const newConfig = {
          ...existingConfig,
          baseUrl: url,
          targets: targets
        };

        await configLoader.saveConfig(newConfig);
        console.log(chalk.green('\nConfiguration updated with found targets.'));
      }

    } catch (error) {
      console.error(chalk.red('Error crawling website:'), error.message);
      process.exit(1);
    }
  });

program
  .command('ci')
  .description('Setup CI/CD integration')
  .option('--gitlab', 'Generate GitLab CI configuration')
  .action(async (options) => {
    try {
      if (options.gitlab) {
        const templatePath = path.join(__dirname, 'templates', '.gitlab-ci.yml');
        const destPath = path.join(process.cwd(), '.gitlab-ci.yml');

        if (await fs.pathExists(destPath)) {
          console.log(chalk.yellow('.gitlab-ci.yml already exists.'));
          // Could ask to overwrite, but safer to just warn
        } else {
          await fs.copy(templatePath, destPath);
          console.log(chalk.green('Created .gitlab-ci.yml'));
        }
      } else {
        console.log(chalk.yellow('Please specify a CI provider (e.g., --gitlab)'));
      }
    } catch (error) {
      console.error(chalk.red('Error setting up CI:'), error.message);
      process.exit(1);
    }
  });

program
  .command('baseline')
  .description('Set baseline screenshots')
  .option('-c, --config <path>', 'Configuration file path', 'config/visual-regression.config.json')
  .option('-t, --target <name>', 'Set baseline for specific target only')
  .action(async (options) => {
    try {
      console.log(chalk.blue('Setting baseline screenshots...'));
      
      const configLoader = new ConfigLoader(options.config);
      const config = await configLoader.loadConfig();
      configLoader.validateConfig(config);
      
      const capture = new ScreenshotCapture();
      const baselineManager = new BaselineManager();
      const reporter = new Reporter();
      
      await capture.launch();
      
      try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const tempDir = path.join('results', 'temp-' + timestamp);
        
        let targets = config.targets;
        if (options.target) {
          targets = targets.filter(t => t.name === options.target);
          if (targets.length === 0) {
            throw new Error(`Target "${options.target}" not found in configuration`);
          }
        }
        
        console.log(chalk.gray(`Capturing ${targets.length} target(s)...`));
        const captureResults = await capture.captureMultiple(config, targets, tempDir);
        
        const successfulCaptures = captureResults.filter(r => r.success);
        console.log(chalk.green(`Successfully captured ${successfulCaptures.length} screenshot(s)`));
        
        if (successfulCaptures.length > 0) {
          if (options.target) {
            await baselineManager.setBaseline(tempDir, options.target);
          } else {
            await baselineManager.setBaseline(tempDir);
          }
          
          console.log(chalk.green('Baseline set successfully!'));
        }
        
        // Clean up temp directory
        await fs.remove(tempDir);
        
      } finally {
        await capture.close();
      }
      
    } catch (error) {
      console.error(chalk.red('Error setting baseline:'), error.message);
      process.exit(1);
    }
  });

program
  .command('test')
  .description('Run visual regression tests')
  .option('-c, --config <path>', 'Configuration file path', 'config/visual-regression.config.json')
  .option('-o, --output <dir>', 'Output directory for results', 'results')
  .option('--html', 'Generate HTML report')
  .action(async (options) => {
    try {
      console.log(chalk.blue('Running visual regression tests...'));
      
      const configLoader = new ConfigLoader(options.config);
      const config = await configLoader.loadConfig();
      configLoader.validateConfig(config);
      
      const capture = new ScreenshotCapture();
      const comparator = new ImageComparator(config.options);
      const baselineManager = new BaselineManager();
      const reporter = new Reporter();
      
      await capture.launch();
      
      try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const currentDir = path.join(options.output, 'current-' + timestamp);
        const diffDir = path.join(options.output, 'diff-' + timestamp);
        
        console.log(chalk.gray('Capturing current screenshots...'));
        const captureResults = await capture.captureMultiple(config, config.targets, currentDir);
        
        console.log(chalk.gray('Comparing with baseline...'));
        const comparisonResults = await comparator.compareMultiple(
          'baseline',
          currentDir,
          diffDir,
          config.targets
        );
        
        reporter.addResults(comparisonResults);
        reporter.generateConsoleReport();
        
        if (options.html) {
          const htmlPath = path.join(options.output, 'report-' + timestamp + '.html');
          await reporter.generateHtmlReport(htmlPath);
        }
        
        const summary = reporter.getSummary();
        console.log(chalk.blue('\nTest Summary:'));
        console.log(chalk.green(`✓ Passed: ${summary.passed}`));
        console.log(chalk.red(`✗ Failed: ${summary.failed}`));
        console.log(chalk.blue(`Success Rate: ${summary.successRate}%`));
        
        if (summary.failed > 0) {
          process.exit(1);
        }
        
      } finally {
        await capture.close();
      }
      
    } catch (error) {
      console.error(chalk.red('Error running tests:'), error.message);
      process.exit(1);
    }
  });

program
  .command('list')
  .description('List all baseline screenshots')
  .action(async () => {
    try {
      const baselineManager = new BaselineManager();
      const baselines = await baselineManager.getAllBaselineInfo();
      
      if (baselines.length === 0) {
        console.log(chalk.yellow('No baseline screenshots found.'));
        return;
      }
      
      console.log(chalk.blue('Baseline Screenshots:'));
      baselines.forEach(baseline => {
        console.log(chalk.green(`✓ ${baseline.name}`));
        console.log(chalk.gray(`  Path: ${baseline.path}`));
        console.log(chalk.gray(`  Size: ${(baseline.size / 1024).toFixed(2)} KB`));
        console.log(chalk.gray(`  Created: ${baseline.created.toLocaleString()}`));
        console.log('');
      });
      
    } catch (error) {
      console.error(chalk.red('Error listing baselines:'), error.message);
      process.exit(1);
    }
  });

program
  .command('clear')
  .description('Clear all baseline screenshots')
  .option('-y, --yes', 'Skip confirmation prompt')
  .action(async (options) => {
    try {
      if (!options.yes) {
        const readline = require('readline');
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });
        
        const answer = await new Promise(resolve => {
          rl.question(chalk.yellow('Are you sure you want to clear all baselines? (y/N): '), resolve);
        });
        
        rl.close();
        
        if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
          console.log(chalk.gray('Operation cancelled.'));
          return;
        }
      }
      
      const baselineManager = new BaselineManager();
      await baselineManager.clearAllBaselines();
      console.log(chalk.green('All baselines cleared successfully!'));
      
    } catch (error) {
      console.error(chalk.red('Error clearing baselines:'), error.message);
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
