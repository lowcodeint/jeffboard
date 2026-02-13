// Project write operations via client Firebase SDK

import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db, COLLECTIONS } from './firestore';

/**
 * Toggle burst mode on a project document.
 * The real-time listener in useProjects will pick up the change automatically.
 */
export async function updateProjectBurstMode(
  projectId: string,
  enabled: boolean,
): Promise<void> {
  const projectRef = doc(db, COLLECTIONS.PROJECTS, projectId);
  await updateDoc(projectRef, {
    burstMode: enabled,
    updatedAt: Timestamp.now(),
  });
}
