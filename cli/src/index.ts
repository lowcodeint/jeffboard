#!/usr/bin/env node

// AgentBoard CLI - Command-line tool for AI agents to update the board

import { Command } from 'commander';
import { config } from 'dotenv';
import { initializeFirebase } from './lib/firebase.js';
import { createUpdateCommand } from './commands/update.js';
import { createCreateCommand } from './commands/create.js';
import { createNoteCommand } from './commands/note.js';
import { createListCommand } from './commands/list.js';
import { createSeedCommand } from './commands/seed.js';

// Load environment variables from .env file if present
config();

const program = new Command();

program
  .name('agentboard')
  .description('CLI tool for AI agents to update AgentBoard')
  .version('1.0.0')
  .option(
    '--service-account <path>',
    'Path to Firebase service account JSON file (or set AGENTBOARD_SERVICE_ACCOUNT env var)'
  )
  .hook('preAction', (thisCommand) => {
    // Initialize Firebase before any command runs
    const options = thisCommand.opts();
    try {
      initializeFirebase(options.serviceAccount);
    } catch (error) {
      console.error('Failed to initialize Firebase:', error instanceof Error ? error.message : error);
      console.error('\nMake sure you have:');
      console.error('1. Created a Firebase service account');
      console.error('2. Downloaded the service account JSON file');
      console.error('3. Set AGENTBOARD_SERVICE_ACCOUNT environment variable to the file path');
      console.error('   OR pass --service-account <path> flag');
      process.exit(1);
    }
  });

// Register commands
program.addCommand(createUpdateCommand());
program.addCommand(createCreateCommand());
program.addCommand(createNoteCommand());
program.addCommand(createListCommand());
program.addCommand(createSeedCommand());

// Parse command line arguments
program.parse(process.argv);
