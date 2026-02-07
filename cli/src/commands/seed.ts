// Seed command: Populate Firestore with sample data

import { Command } from 'commander';
import { FieldValue } from 'firebase-admin/firestore';
import { getDb } from '../lib/firebase.js';
import { COLLECTIONS } from '../lib/firestore.js';

const AGENTS = [
  {
    id: 'product-manager',
    name: 'product-manager',
    displayName: 'Product Manager',
    abbreviation: 'PM',
    color: 'yellow',
    colorHex: '#FACC15',
    role: 'Defines product requirements and writes user stories',
    model: 'opus'
  },
  {
    id: 'solution-architect',
    name: 'solution-architect',
    displayName: 'Solution Architect',
    abbreviation: 'SA',
    color: 'orange',
    colorHex: '#FB923C',
    role: 'Designs technical architecture and system components',
    model: 'opus'
  },
  {
    id: 'lead-engineer',
    name: 'lead-engineer',
    displayName: 'Lead Engineer',
    abbreviation: 'LE',
    color: 'cyan',
    colorHex: '#22D3EE',
    role: 'Implements features and writes production code',
    model: 'sonnet'
  },
  {
    id: 'security-reviewer',
    name: 'security-reviewer',
    displayName: 'Security Reviewer',
    abbreviation: 'SR',
    color: 'red',
    colorHex: '#F87171',
    role: 'Reviews code for security vulnerabilities',
    model: 'sonnet'
  },
  {
    id: 'ui-consistency-reviewer',
    name: 'ui-consistency-reviewer',
    displayName: 'UI Consistency Reviewer',
    abbreviation: 'UI',
    color: 'blue',
    colorHex: '#60A5FA',
    role: 'Ensures UI consistency and accessibility',
    model: 'sonnet'
  },
  {
    id: 'mendix-code-explainer',
    name: 'mendix-code-explainer',
    displayName: 'Mendix Code Explainer',
    abbreviation: 'MCE',
    color: 'green',
    colorHex: '#4ADE80',
    role: 'Explains Mendix code and architecture',
    model: 'sonnet'
  }
];

export function createSeedCommand() {
  return new Command('seed')
    .description('Seed Firestore with sample data')
    .option('--uid <uid>', 'Firebase Auth UID to add to allowedUsers')
    .option('--agents-only', 'Only seed agents collection')
    .action(async (options) => {
      try {
        const db = getDb();

        console.log('Seeding Firestore...\n');

        // Seed agents
        console.log('Creating agents...');
        for (const agent of AGENTS) {
          await db.collection(COLLECTIONS.AGENTS).doc(agent.id).set(agent);
          console.log(`  ✓ ${agent.displayName}`);
        }

        if (options.agentsOnly) {
          console.log('\nAgents seeded successfully!');
          return;
        }

        // Seed allowed users config if UID provided
        if (options.uid) {
          console.log('\nConfiguring allowed users...');
          await db
            .collection(COLLECTIONS.CONFIG)
            .doc('allowedUsers')
            .set({
              uids: [options.uid]
            });
          console.log(`  ✓ Added UID: ${options.uid}`);
        }

        // Create sample project
        console.log('\nCreating sample project...');
        const projectRef = db.collection(COLLECTIONS.PROJECTS).doc();
        await projectRef.set({
          id: projectRef.id,
          name: 'AgentBoard',
          description: 'Kanban board for AI agent work monitoring',
          shortCode: 'AB',
          isArchived: false,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        });
        console.log(`  ✓ AgentBoard (${projectRef.id})`);

        // Initialize story counter
        await db
          .collection(COLLECTIONS.COUNTERS)
          .doc('stories')
          .set({
            AB: 0
          });

        // Create sample stories
        console.log('\nCreating sample stories...');

        const sampleStories = [
          {
            shortId: 'AB-1',
            title: 'Set up Firebase project and Firestore',
            epicName: 'Core Infrastructure',
            status: 'done',
            priority: 'P0',
            complexity: 'M',
            assignedAgent: 'lead-engineer',
            description: 'Initialize Firebase project with Firestore configuration'
          },
          {
            shortId: 'AB-2',
            title: 'Build React app scaffold with Vite',
            epicName: 'Core Infrastructure',
            status: 'done',
            priority: 'P0',
            complexity: 'M',
            assignedAgent: 'lead-engineer',
            description: 'Create React + Vite + TypeScript project structure'
          },
          {
            shortId: 'AB-3',
            title: 'Implement Kanban board layout',
            epicName: 'Board UI',
            status: 'in-progress',
            priority: 'P0',
            complexity: 'L',
            assignedAgent: 'lead-engineer',
            description: 'Create swipeable column layout for mobile'
          },
          {
            shortId: 'AB-4',
            title: 'Design story card component',
            epicName: 'Board UI',
            status: 'in-design',
            priority: 'P0',
            complexity: 'M',
            assignedAgent: 'solution-architect',
            description: 'Design collapsed and expanded card views'
          },
          {
            shortId: 'AB-5',
            title: 'Implement Google authentication',
            epicName: 'Authentication',
            status: 'in-review',
            priority: 'P0',
            complexity: 'M',
            assignedAgent: 'security-reviewer',
            description: 'Set up Firebase Auth with Google sign-in'
          },
          {
            shortId: 'AB-6',
            title: 'Add dark mode support',
            epicName: 'Polish',
            status: 'backlog',
            priority: 'P2',
            complexity: 'S',
            assignedAgent: null,
            description: 'Implement dark mode with system preference detection'
          },
          {
            shortId: 'AB-7',
            title: 'Fix iOS Safari scroll behavior',
            epicName: 'Bug Fixes',
            status: 'blocked',
            priority: 'P1',
            complexity: 'S',
            assignedAgent: 'lead-engineer',
            description: 'Resolve scroll-snap issues on iOS Safari',
            blockedReason: 'Need to test on physical iPhone device'
          }
        ];

        for (let i = 0; i < sampleStories.length; i++) {
          const story = sampleStories[i];
          const storyRef = db.collection(COLLECTIONS.STORIES).doc();

          await storyRef.set({
            id: storyRef.id,
            shortId: story.shortId,
            projectId: projectRef.id,
            epicName: story.epicName,
            title: story.title,
            description: story.description,
            userStory: '',
            acceptanceCriteria: [],
            status: story.status,
            previousStatus: null,
            blockedReason: story.blockedReason || null,
            priority: story.priority,
            complexity: story.complexity,
            assignedAgent: story.assignedAgent,
            notes: [],
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
          });

          // Add creation activity
          await storyRef.collection(COLLECTIONS.ACTIVITY).add({
            fromStatus: null,
            toStatus: story.status,
            agent: story.assignedAgent || 'system',
            note: 'Story created',
            timestamp: FieldValue.serverTimestamp()
          });

          console.log(`  ✓ ${story.shortId}: ${story.title}`);
        }

        // Update counter to reflect seeded stories
        await db
          .collection(COLLECTIONS.COUNTERS)
          .doc('stories')
          .set({
            AB: sampleStories.length
          });

        console.log('\n✓ Seed complete!');
        console.log(`\nProject ID: ${projectRef.id}`);
        console.log('Stories: 7 sample stories created across all statuses');
        console.log('Agents: 6 agents configured');

        if (options.uid) {
          console.log(`Allowed users: ${options.uid}`);
        } else {
          console.log('\nNote: Run with --uid <your-firebase-auth-uid> to configure allowed users');
        }
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
}
