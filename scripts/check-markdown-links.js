#!/usr/bin/env node

/**
 * Cross-platform markdown link checker script
 * Finds all .md files and validates their links using markdown-link-check
 */

import { glob } from "glob";
import markdownLinkCheck from "markdown-link-check";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { pathToFileURL } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");

// Configuration for markdown-link-check
const config = JSON.parse(
  readFileSync(join(rootDir, ".markdown-link-check.json"), "utf8"),
);

// Find all markdown files
const patterns = ["specs/**/*.md", ".specify/**/*.md", ".github/**/*.md"];

const ignorePatterns = ["**/node_modules/**", "**/dist/**"];

async function checkLinks() {
  let hasErrors = false;

  for (const pattern of patterns) {
    const files = await glob(pattern, { ignore: ignorePatterns });

    for (const file of files) {
      const markdown = readFileSync(file, "utf8");
      const fileDir = join(process.cwd(), dirname(file));
      const opts = {
        ...config,
        baseUrl: pathToFileURL(fileDir).href + "/",
      };

      await new Promise((resolve) => {
        markdownLinkCheck(markdown, opts, (err, results) => {
          if (err) {
            console.error(`Error checking ${file}:`, err);
            hasErrors = true;
            resolve();
            return;
          }

          const deadLinks = results.filter((result) => {
            if (result.status === "dead") {
              // Only skip file:// URLs that markdown-link-check struggles with
              // These are internal links that we want to validate differently
              if (result.link && result.link.startsWith("file://")) {
                return false;
              }
              return true;
            }
            return false;
          });

          if (deadLinks.length > 0) {
            console.error(`\n${file}:`);
            deadLinks.forEach((link) => {
              console.error(`  ✗ ${link.link} - ${link.statusCode}`);
            });
            hasErrors = true;
          }

          resolve();
        });
      });
    }
  }

  if (hasErrors) {
    console.error("\nLink check failed!");
    process.exit(1);
  } else {
    console.log("All links valid!");
  }
}

checkLinks().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
