using System.Collections.Generic;
using System.IO;
using Xunit;
using Migrator.CLI;

namespace Migrator.Tests
{
    public class ContentAnalyzerTests
    {
        [Fact]
        public void AnalyzeFile_IdentifiesHtmlIssues()
        {
            // Arrange
            var analyzer = new ContentAnalyzer();
            var testHtml = @"
                <html>
                    <head></head>
                    <body>
                        <!--#include virtual='/header.inc' -->
                        <h1>Hello</h1>
                    </body>
                </html>";

            var tempFile = Path.GetTempFileName() + ".html";
            File.WriteAllText(tempFile, testHtml);

            try
            {
                // Act
                var result = analyzer.AnalyzeFile(tempFile);

                // Assert
                Assert.Contains("Contains SSI include (<!--#include)", result.Issues);
                Assert.Contains("Missing <title> tag", result.Issues);
                Assert.Contains("Missing meta description", result.Issues);
            }
            finally
            {
                if (File.Exists(tempFile)) File.Delete(tempFile);
            }
        }

        [Fact]
        public void AnalyzeFile_ExtractsTitle()
        {
            // Arrange
            var analyzer = new ContentAnalyzer();
            var testHtml = @"<html><head><title>My Legacy Page</title></head><body></body></html>";

            var tempFile = Path.GetTempFileName() + ".html";
            File.WriteAllText(tempFile, testHtml);

            try
            {
                // Act
                var result = analyzer.AnalyzeFile(tempFile);

                // Assert
                Assert.Equal("My Legacy Page", result.Metadata["Title"]);
            }
            finally
            {
                if (File.Exists(tempFile)) File.Delete(tempFile);
            }
        }
    }
}
