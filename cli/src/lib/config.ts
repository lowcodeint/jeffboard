// Config file discovery and management

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';

export interface JeffBoardConfig {
  projectId: string;
  shortCode: string;
  projectName: string;
}

const CONFIG_FILE_NAME = '.claude/jeffboard.json';

/**
 * Search for .claude/jeffboard.json starting from the current directory
 * and walking up the directory tree
 * @param startDir Starting directory (defaults to process.cwd())
 * @returns Config object or null if not found
 */
export function findConfig(startDir: string = process.cwd()): JeffBoardConfig | null {
  let currentDir = resolve(startDir);
  const root = resolve('/');

  while (currentDir !== root) {
    const configPath = resolve(currentDir, CONFIG_FILE_NAME);

    if (existsSync(configPath)) {
      try {
        const content = readFileSync(configPath, 'utf-8');
        const config = JSON.parse(content) as JeffBoardConfig;

        // Validate required fields
        if (!config.projectId || !config.shortCode || !config.projectName) {
          throw new Error('Invalid config file: missing required fields (projectId, shortCode, projectName)');
        }

        return config;
      } catch (error) {
        throw new Error(`Failed to read config file at ${configPath}: ${error instanceof Error ? error.message : error}`);
      }
    }

    // Move up one directory
    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) {
      // Reached root
      break;
    }
    currentDir = parentDir;
  }

  return null;
}

/**
 * Get project ID from config file or command option
 * @param optionValue Value from --project flag
 * @returns Project ID
 * @throws Error if neither config nor option provided
 */
export function getProjectId(optionValue?: string): string {
  if (optionValue) {
    return optionValue;
  }

  const config = findConfig();
  if (config) {
    return config.projectId;
  }

  throw new Error(
    'No project ID specified. Either:\n' +
    '  1. Run "jeffboard init --name <name> --short-code <code>" to create a project config, OR\n' +
    '  2. Pass --project <projectId> flag explicitly'
  );
}
