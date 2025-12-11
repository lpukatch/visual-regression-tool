using System;
using System.IO;
using System.Text.Json;

namespace Migrator.CLI
{
    class Program
    {
        static void Main(string[] args)
        {
            Console.WriteLine("Migrator 🔄 - Legacy Content Analysis Tool");

            string targetDir = args.Length > 0 ? args[0] : Directory.GetCurrentDirectory();
            Console.WriteLine($"Analyzing directory: {targetDir}");

            var analyzer = new ContentAnalyzer();
            try
            {
                var report = analyzer.AnalyzeDirectory(targetDir);

                Console.WriteLine($"\nFound {report.Count} files.");

                int issueCount = 0;
                foreach (var file in report)
                {
                    if (file.Issues.Count > 0)
                    {
                        Console.WriteLine($"\n⚠️  {file.FilePath} ({file.FileType})");
                        foreach (var issue in file.Issues)
                        {
                            Console.WriteLine($"   - {issue}");
                            issueCount++;
                        }
                    }
                }

                Console.WriteLine($"\nAnalysis complete. Total issues found: {issueCount}");

                // Save report
                var jsonOptions = new JsonSerializerOptions { WriteIndented = true };
                string json = JsonSerializer.Serialize(report, jsonOptions);
                File.WriteAllText("migration-report.json", json);
                Console.WriteLine("Full report saved to 'migration-report.json'");

            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Error: {ex.Message}");
            }
        }
    }
}
