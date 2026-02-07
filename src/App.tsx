// Main App component

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          AgentBoard
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
          Kanban board for AI agent work monitoring
        </p>

        <div className="space-y-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <h2 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Epic 1: Foundation - Complete
            </h2>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>✓ Firebase project and Firestore configured</li>
              <li>✓ React + Vite + TypeScript project scaffold</li>
              <li>✓ Tailwind CSS with mobile-first design</li>
              <li>✓ PWA configuration with service worker</li>
              <li>✓ Firebase client SDK integration</li>
              <li>✓ Zustand state management</li>
              <li>✓ CLI tool with commander and firebase-admin</li>
              <li>✓ Seed command with sample data</li>
            </ul>
          </div>

          <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
            <h2 className="font-semibold text-green-900 dark:text-green-100 mb-2">
              Next Steps
            </h2>
            <ul className="text-sm text-green-800 dark:text-green-200 space-y-1">
              <li>• Configure Firebase project in Firebase Console</li>
              <li>• Add .env file with Firebase credentials</li>
              <li>• Deploy Firestore security rules and indexes</li>
              <li>• Run CLI seed command to populate initial data</li>
              <li>• Begin Epic 2: iPhone-First Kanban Board UI</li>
            </ul>
          </div>

          <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
            <h2 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
              Project Structure
            </h2>
            <p className="text-sm text-purple-800 dark:text-purple-200">
              All foundation files are in place. Check the project directory for:
            </p>
            <ul className="text-sm text-purple-800 dark:text-purple-200 space-y-1 mt-2">
              <li>• <code>src/</code> - React application code</li>
              <li>• <code>cli/</code> - AgentBoard CLI tool</li>
              <li>• <code>firebase.json</code> - Firebase configuration</li>
              <li>• <code>firestore.rules</code> - Security rules</li>
              <li>• <code>FIRESTORE_DATA_MODEL.md</code> - Data model documentation</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
          Sign in to AgentBoard
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Authentication will be implemented in Epic 4
        </p>
      </div>
    </div>
  );
}

export default App;
