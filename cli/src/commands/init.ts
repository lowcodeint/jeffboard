// Init command: Initialize a repository's JeffBoard project connection

import { Command } from 'commander';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { getDb } from '../lib/firebase.js';
import { COLLECTIONS } from '../lib/firestore.js';

const CONFIG_FILE_NAME = '.claude/jeffboard.json';

/**
 * Validate short code format
 * @param shortCode Short code to validate
 * @throws Error if invalid
 */
function validateShortCode(shortCode: string): void {
  if (!/^[A-Z0-9]{2,5}$/.test(shortCode)) {
    throw new Error('Short code must be 2-5 uppercase alphanumeric characters (e.g., "AB", "JEFF", "MP01")');
  }
}

/**
 * Find or create a project by name
 * @param projectName Project name
 * @param shortCode Short code
 * @param webhookUrl Optional webhook URL
 * @returns Project ID
 */
async function findOrCreateProject(projectName: string, shortCode: string, webhookUrl?: string): Promise<string> {
  const db = getDb();
  const projectsRef = db.collection(COLLECTIONS.PROJECTS);

  // Search for existing project with this name
  const snapshot = await projectsRef.where('name', '==', projectName).limit(1).get();

  if (!snapshot.empty) {
    const existingProject = snapshot.docs[0];
    const existingData = existingProject.data();

    // Verify short code matches
    if (existingData.shortCode !== shortCode) {
      console.warn(`Warning: Project "${projectName}" already exists with short code "${existingData.shortCode}"`);
      console.warn(`Using existing short code "${existingData.shortCode}" instead of "${shortCode}"`);
    }

    return existingProject.id;
  }

  // Create new project
  const projectRef = projectsRef.doc();
  const projectData: Record<string, unknown> = {
    id: projectRef.id,
    name: projectName,
    shortCode,
    description: '',
    isArchived: false,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  // Add webhookUrl if provided
  if (webhookUrl) {
    projectData.webhookUrl = webhookUrl;
  }

  await projectRef.set(projectData);

  // Initialize story counter for this short code
  const counterRef = db.collection(COLLECTIONS.COUNTERS).doc('stories');
  await counterRef.set({ [shortCode]: 0 }, { merge: true });

  return projectRef.id;
}

export function createInitCommand() {
  return new Command('init')
    .description('Initialize JeffBoard for this repository')
    .requiredOption('-n, --name <projectName>', 'Project name (e.g., "JeffBoard")')
    .requiredOption('-s, --short-code <shortCode>', 'Project short code (e.g., "AB")')
    .option('-w, --webhook-url <url>', 'Webhook URL for status change notifications')
    .action(async (options) => {
      try {
        const configPath = resolve(process.cwd(), CONFIG_FILE_NAME);

        // Check if config already exists
        if (existsSync(configPath)) {
          const existingContent = require(configPath);
          console.log('✓ JeffBoard config already exists:');
          console.log(`  Project: ${existingContent.projectName}`);
          console.log(`  Short Code: ${existingContent.shortCode}`);
          console.log(`  Project ID: ${existingContent.projectId}`);
          console.log(`  Config: ${configPath}`);
          return;
        }

        // Validate short code
        validateShortCode(options.shortCode);

        // Find or create project in Firestore
        console.log(`Initializing JeffBoard project "${options.name}"...`);
        const projectId = await findOrCreateProject(options.name, options.shortCode, options.webhookUrl);

        // Create config object
        const config = {
          projectId,
          shortCode: options.shortCode,
          projectName: options.name
        };

        // Ensure .claude directory exists
        const configDir = dirname(configPath);
        if (!existsSync(configDir)) {
          mkdirSync(configDir, { recursive: true });
        }

        // Write config file
        writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

        console.log('\n✓ JeffBoard initialized successfully!');
        console.log(`  Project: ${options.name}`);
        console.log(`  Short Code: ${options.shortCode}`);
        console.log(`  Project ID: ${projectId}`);
        if (options.webhookUrl) {
          console.log(`  Webhook URL: ${options.webhookUrl}`);
        }
        console.log(`  Config: ${configPath}`);
        console.log('\nNext steps:');
        console.log('  1. Commit .claude/jeffboard.json to version control');
        console.log('  2. Agents can now use CLI commands without --project flag');
        console.log('  3. Run "jeffboard list" to verify connection');
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
}
