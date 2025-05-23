// src/components/admin/DataMigration.tsx
import React, { useState } from 'react';
import { migrateTeamsToMultipleEmails } from '../../services/lotteryService';

const DataMigration: React.FC = () => {
  const [migrating, setMigrating] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const runMigration = async () => {
    if (migrating) return;
    
    try {
      setMigrating(true);
      setResult(null);
      setError(null);
      
      await migrateTeamsToMultipleEmails();
      
      setResult('Migration completed successfully! All teams now support multiple emails.');
    } catch (err: any) {
      setError(`Migration failed: ${err.message}`);
    } finally {
      setMigrating(false);
    }
  };
  
  return (
    <div className="max-w-lg mx-auto my-10 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-center">Data Migration Tool</h2>
      <p className="mb-6 text-gray-600">
        This tool will update all existing teams to support multiple email addresses for co-owners.
        Run this once after deploying the code changes.
      </p>
      
      {result && (
        <div className="mb-4 p-3 bg-green-100 text-green-800 rounded border border-green-200">
          {result}
        </div>
      )}
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-800 rounded border border-red-200">
          {error}
        </div>
      )}
      
      <div className="flex justify-center">
        <button
          className={`py-2 px-6 rounded-lg font-medium ${
            migrating
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
          onClick={runMigration}
          disabled={migrating}
        >
          {migrating ? 'Migration in Progress...' : 'Run Migration'}
        </button>
      </div>
      
      <div className="mt-6 text-sm text-gray-500">
        <p className="font-medium">What this migration does:</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>Updates all existing teams to include an <code>emails</code> array</li>
          <li>Initializes the array with the existing email if present</li>
          <li>Maintains backward compatibility with existing code</li>
        </ul>
      </div>
    </div>
  );
};

export default DataMigration;