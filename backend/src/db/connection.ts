import { users, accounts, categories, transactions, uploads, parseJobs, reminders } from '../services/jsonStorage';

// Initialize JSON storage (create data directory and files)
export async function initializeDatabase() {
  try {
    // Initialize all JSON file managers
    await users.findAll();
    await accounts.findAll();
    await categories.findAll();
    await transactions.findAll();
    await uploads.findAll();
    await parseJobs.findAll();
    await reminders.findAll();
    
    console.log('JSON storage initialized successfully');
  } catch (error) {
    console.error('JSON storage initialization failed:', error);
    throw error;
  }
}

// Export the JSON storage managers as db for compatibility
export const db = {
  users,
  accounts,
  categories,
  transactions,
  uploads,
  parseJobs,
  reminders
};