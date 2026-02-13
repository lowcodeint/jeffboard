#!/usr/bin/env node

// JeffBoard CLI - Command-line tool for AI agents to update the board

import { Command } from 'commander';
import { config } from 'dotenv';
import { initializeFirebase } from './lib/firebase.js';
import { createUpdateCommand } from './commands/update.js';
import { createCreateCommand } from './commands/create.js';
import { createNoteCommand } from './commands/note.js';
import { createListCommand } from './commands/list.js';
import { createSeedCommand } from './commands/seed.js';
import { createInitCommand } from './commands/init.js';
import { createAckCommand } from './commands/ack.js';
import { createGetCommand } from './commands/get.js';
import { createContextCommand } from './commands/context.js';
import { createConfigCommand } from './commands/config.js';
import { createHeartbeatCommand } from './commands/heartbeat.js';
import { createUsageCommand } from './commands/usage.js';
import { createCheckDuplicatesCommand } from './commands/check-duplicates.js';
import { createReserveCommand } from './commands/reserve.js';
import { createScheduleCommand } from './commands/schedule.js';
import { createRouteCommand } from './commands/route.js';
import { createSchedulerStatusCommand } from './commands/scheduler-status.js';
import { createMeetingCommand } from './commands/meeting.js';
import { createWatchdogCommand } from './commands/watchdog.js';

// Load environment variables from .env file if present
config();

const program = new Command();

program
  .name('jeffboard')
  .description('CLI tool for AI agents to update JeffBoard')
  .version('1.0.0')
  .option(
    '--service-account <path>',
    'Path to Firebase service account JSON file (or set JEFFBOARD_SERVICE_ACCOUNT env var)'
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
      console.error('3. Set JEFFBOARD_SERVICE_ACCOUNT environment variable to the file path');
      console.error('   OR pass --service-account <path> flag');
      process.exit(1);
    }
  });

// Register commands
program.addCommand(createInitCommand());
program.addCommand(createConfigCommand());
program.addCommand(createUpdateCommand());
program.addCommand(createCreateCommand());
program.addCommand(createNoteCommand());
program.addCommand(createListCommand());
program.addCommand(createAckCommand());
program.addCommand(createGetCommand());
program.addCommand(createContextCommand());
program.addCommand(createHeartbeatCommand());
program.addCommand(createUsageCommand());
program.addCommand(createSeedCommand());
program.addCommand(createCheckDuplicatesCommand());
program.addCommand(createReserveCommand());
program.addCommand(createScheduleCommand());
program.addCommand(createRouteCommand());
program.addCommand(createSchedulerStatusCommand());
program.addCommand(createMeetingCommand());
program.addCommand(createWatchdogCommand());

// Parse command line arguments
program.parse(process.argv);
