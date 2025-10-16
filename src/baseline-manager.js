const fs = require('fs-extra');
const path = require('path');

class BaselineManager {
  constructor(baselineDir = 'baseline') {
    this.baselineDir = baselineDir;
  }

  async ensureBaselineDir() {
    await fs.ensureDir(this.baselineDir);
  }

  async setBaseline(sourceDir, targetName = null) {
    await this.ensureBaselineDir();
    
    if (targetName) {
      // Set baseline for a specific target
      const sourcePath = path.join(sourceDir, `${targetName}.png`);
      const targetPath = path.join(this.baselineDir, `${targetName}.png`);
      
      if (!(await fs.pathExists(sourcePath))) {
        throw new Error(`Source image not found: ${sourcePath}`);
      }
      
      await fs.copy(sourcePath, targetPath);
      console.log(`Baseline set: ${targetName}`);
      return targetPath;
    } else {
      // Set baseline for all images in directory
      const files = await fs.readdir(sourceDir);
      const pngFiles = files.filter(file => file.endsWith('.png'));
      
      const results = [];
      for (const file of pngFiles) {
        const sourcePath = path.join(sourceDir, file);
        const targetPath = path.join(this.baselineDir, file);
        
        await fs.copy(sourcePath, targetPath);
        console.log(`Baseline set: ${file}`);
        results.push(targetPath);
      }
      
      return results;
    }
  }

  async getBaseline(targetName) {
    const baselinePath = path.join(this.baselineDir, `${targetName}.png`);
    
    if (!(await fs.pathExists(baselinePath))) {
      return null;
    }
    
    return baselinePath;
  }

  async listBaselines() {
    if (!(await fs.pathExists(this.baselineDir))) {
      return [];
    }
    
    const files = await fs.readdir(this.baselineDir);
    return files.filter(file => file.endsWith('.png')).map(file => file.replace('.png', ''));
  }

  async removeBaseline(targetName) {
    const baselinePath = path.join(this.baselineDir, `${targetName}.png`);
    
    if (await fs.pathExists(baselinePath)) {
      await fs.remove(baselinePath);
      console.log(`Baseline removed: ${targetName}`);
      return true;
    }
    
    return false;
  }

  async clearAllBaselines() {
    if (await fs.pathExists(this.baselineDir)) {
      await fs.emptyDir(this.baselineDir);
      console.log('All baselines cleared');
    }
  }

  async baselineExists(targetName) {
    const baselinePath = path.join(this.baselineDir, `${targetName}.png`);
    return await fs.pathExists(baselinePath);
  }

  async getBaselineInfo(targetName) {
    const baselinePath = path.join(this.baselineDir, `${targetName}.png`);
    
    if (!(await fs.pathExists(baselinePath))) {
      return null;
    }
    
    const stats = await fs.stat(baselinePath);
    return {
      name: targetName,
      path: baselinePath,
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime
    };
  }

  async getAllBaselineInfo() {
    const baselines = await this.listBaselines();
    const info = [];
    
    for (const baseline of baselines) {
      const baselineInfo = await this.getBaselineInfo(baseline);
      if (baselineInfo) {
        info.push(baselineInfo);
      }
    }
    
    return info;
  }
}

module.exports = BaselineManager;
