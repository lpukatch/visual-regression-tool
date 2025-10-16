const fs = require('fs-extra');
const path = require('path');

class ConfigLoader {
  constructor(configPath = 'config/visual-regression.config.json') {
    this.configPath = configPath;
    this.defaultConfig = {
      baseUrl: 'http://localhost:3000',
      targets: [
        {
          name: 'homepage',
          url: '/',
          selector: 'body',
          viewport: { width: 1200, height: 800 }
        }
      ],
      options: {
        waitTime: 3000,
        threshold: 0.1,
        includeAA: false,
        diffMask: [255, 0, 255]
      }
    };
  }

  async loadConfig() {
    try {
      if (await fs.pathExists(this.configPath)) {
        const configData = await fs.readJson(this.configPath);
        return this.mergeWithDefaults(configData);
      } else {
        console.log(`Config file not found at ${this.configPath}, using defaults`);
        return this.defaultConfig;
      }
    } catch (error) {
      console.error(`Error loading config: ${error.message}`);
      console.log('Using default configuration');
      return this.defaultConfig;
    }
  }

  mergeWithDefaults(userConfig) {
    return {
      baseUrl: userConfig.baseUrl || this.defaultConfig.baseUrl,
      targets: userConfig.targets || this.defaultConfig.targets,
      options: {
        ...this.defaultConfig.options,
        ...userConfig.options
      }
    };
  }

  async saveConfig(config) {
    try {
      await fs.ensureDir(path.dirname(this.configPath));
      await fs.writeJson(this.configPath, config, { spaces: 2 });
      console.log(`Configuration saved to ${this.configPath}`);
      return true;
    } catch (error) {
      console.error(`Error saving config: ${error.message}`);
      return false;
    }
  }

  validateConfig(config) {
    const errors = [];

    if (!config.baseUrl) {
      errors.push('baseUrl is required');
    }

    if (!config.targets || !Array.isArray(config.targets) || config.targets.length === 0) {
      errors.push('targets must be a non-empty array');
    } else {
      config.targets.forEach((target, index) => {
        if (!target.name) {
          errors.push(`Target ${index}: name is required`);
        }
        if (!target.url) {
          errors.push(`Target ${index}: url is required`);
        }
        if (!target.viewport) {
          errors.push(`Target ${index}: viewport is required`);
        } else {
          if (!target.viewport.width || !target.viewport.height) {
            errors.push(`Target ${index}: viewport must have width and height`);
          }
        }
      });
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }

    return true;
  }

  async createSampleConfig() {
    const sampleConfig = {
      baseUrl: "http://localhost:3000",
      targets: [
        {
          name: "homepage",
          url: "/",
          selector: "body",
          viewport: { "width": 1200, "height": 800 }
        },
        {
          name: "header",
          url: "/",
          selector: "header",
          viewport: { "width": 1200, "height": 200 }
        },
        {
          name: "mobile-homepage",
          url: "/",
          selector: "body",
          viewport: { "width": 375, "height": 667 }
        }
      ],
      options: {
        waitTime: 3000,
        threshold: 0.1,
        includeAA: false,
        diffMask: [255, 0, 255]
      }
    };

    await this.saveConfig(sampleConfig);
    return sampleConfig;
  }
}

module.exports = ConfigLoader;
