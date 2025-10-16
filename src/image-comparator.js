const fs = require('fs-extra');
const path = require('path');
const { default: pixelmatch } = require('pixelmatch');
const { PNG } = require('pngjs');

class ImageComparator {
  constructor(options = {}) {
    this.threshold = options.threshold || 0.1;
    this.includeAA = options.includeAA || false;
    this.diffMask = options.diffMask || [255, 0, 255];
  }

  async compareImages(imagePath1, imagePath2, diffOutputPath) {
    try {
      // Read both images
      const img1 = PNG.sync.read(await fs.readFile(imagePath1));
      const img2 = PNG.sync.read(await fs.readFile(imagePath2));

      // Check if images have same dimensions
      if (img1.width !== img2.width || img1.height !== img2.height) {
        throw new Error(`Image dimensions differ: ${img1.width}x${img1.height} vs ${img2.width}x${img2.height}`);
      }

      // Create diff image
      const diff = new PNG({ width: img1.width, height: img1.height });

      // Compare images
      const numDiffPixels = pixelmatch(
        img1.data,
        img2.data,
        diff.data,
        img1.width,
        img1.height,
        {
          threshold: this.threshold,
          includeAA: this.includeAA,
          diffMask: this.diffMask
        }
      );

      // Save diff image if there are differences
      if (numDiffPixels > 0 && diffOutputPath) {
        await fs.ensureDir(path.dirname(diffOutputPath));
        await fs.writeFile(diffOutputPath, PNG.sync.write(diff));
      }

      // Calculate percentage difference
      const totalPixels = img1.width * img1.height;
      const diffPercentage = (numDiffPixels / totalPixels) * 100;

      return {
        passed: numDiffPixels === 0,
        diffPixels: numDiffPixels,
        totalPixels,
        diffPercentage: diffPercentage.toFixed(2),
        diffPath: numDiffPixels > 0 ? diffOutputPath : null
      };
    } catch (error) {
      throw new Error(`Failed to compare images: ${error.message}`);
    }
  }

  async compareMultiple(baselineDir, currentDir, diffDir, targets) {
    const results = [];

    for (const target of targets) {
      const baselinePath = path.join(baselineDir, `${target.name}.png`);
      const currentPath = path.join(currentDir, `${target.name}.png`);
      const diffPath = path.join(diffDir, `${target.name}-diff.png`);

      try {
        // Check if baseline exists
        if (!(await fs.pathExists(baselinePath))) {
          results.push({
            target,
            success: false,
            error: 'Baseline image not found',
            hasBaseline: false
          });
          continue;
        }

        // Check if current image exists
        if (!(await fs.pathExists(currentPath))) {
          results.push({
            target,
            success: false,
            error: 'Current image not found',
            hasBaseline: true
          });
          continue;
        }

        const comparison = await this.compareImages(baselinePath, currentPath, diffPath);
        
        results.push({
          target,
          success: true,
          hasBaseline: true,
          ...comparison
        });
      } catch (error) {
        results.push({
          target,
          success: false,
          error: error.message,
          hasBaseline: await fs.pathExists(baselinePath)
        });
      }
    }

    return results;
  }
}

module.exports = ImageComparator;
