using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;

namespace Migrator.CLI
{
    public class ContentAnalyzer
    {
        public class FileAnalysis
        {
            public string FilePath { get; set; }
            public string FileType { get; set; }
            public long SizeBytes { get; set; }
            public List<string> Issues { get; set; } = new List<string>();
            public Dictionary<string, string> Metadata { get; set; } = new Dictionary<string, string>();
        }

        public List<FileAnalysis> AnalyzeDirectory(string path)
        {
            var results = new List<FileAnalysis>();
            if (!Directory.Exists(path))
            {
                throw new DirectoryNotFoundException($"Directory not found: {path}");
            }

            var files = Directory.GetFiles(path, "*.*", SearchOption.AllDirectories);

            // Skip the migration tool itself, hidden files/dirs, and node_modules
            files = files.Where(f => !f.Contains("/migration/") && !f.Contains("/.git/") && !f.Contains("/node_modules/")).ToArray();

            foreach (var file in files)
            {
                results.Add(AnalyzeFile(file));
            }

            return results;
        }

        public FileAnalysis AnalyzeFile(string filePath)
        {
            var analysis = new FileAnalysis
            {
                FilePath = filePath,
                SizeBytes = new FileInfo(filePath).Length,
                FileType = Path.GetExtension(filePath).ToLower()
            };

            if (analysis.FileType == ".html" || analysis.FileType == ".htm")
            {
                AnalyzeHtml(filePath, analysis);
            }

            // Detect encoding issues or unknown types
            if (string.IsNullOrEmpty(analysis.FileType))
            {
                analysis.Issues.Add("Unknown file type (no extension)");
            }

            return analysis;
        }

        private void AnalyzeHtml(string filePath, FileAnalysis analysis)
        {
            try
            {
                string content = File.ReadAllText(filePath);

                // Check for legacy CMS patterns
                if (Regex.IsMatch(content, @"<!--#include", RegexOptions.IgnoreCase))
                {
                    analysis.Issues.Add("Contains SSI include (<!--#include)");
                }

                if (Regex.IsMatch(content, @"<asp:", RegexOptions.IgnoreCase) || Regex.IsMatch(content, @"<%"))
                {
                    analysis.Issues.Add("Contains ASP.NET WebForms markup");
                }

                // Check for missing metadata
                if (!content.Contains("<title>", StringComparison.OrdinalIgnoreCase))
                {
                    analysis.Issues.Add("Missing <title> tag");
                }

                if (!content.Contains("name=\"description\"", StringComparison.OrdinalIgnoreCase))
                {
                    analysis.Issues.Add("Missing meta description");
                }

                // Extract title for metadata
                var titleMatch = Regex.Match(content, @"<title>(.*?)</title>", RegexOptions.IgnoreCase | RegexOptions.Singleline);
                if (titleMatch.Success)
                {
                    analysis.Metadata["Title"] = titleMatch.Groups[1].Value.Trim();
                }
            }
            catch (Exception ex)
            {
                analysis.Issues.Add($"Error reading file: {ex.Message}");
            }
        }
    }
}
