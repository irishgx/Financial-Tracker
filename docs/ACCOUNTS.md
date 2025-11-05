# Accounts System - LocalStorage Integration

## Overview

The Accounts system uses localStorage for frontend-only persistence. All accounts and transactions are stored locally in the browser under the key `finance_app_v1`.

## Storage Schema

```typescript
{
  accounts: Account[],
  transactions: Transaction[],
  meta: {
    lastSelectedAccountId?: string,
    version: string,
    lastUpdated: string
  }
}
```

## Key Features

### Accounts Management
- Create, edit, and archive accounts
- Account types: checking, savings, credit, investment, loan, other
- Track account balances and metadata

### Transaction Import
- Upload bank statements (PDF, CSV, Excel, OFX)
- Parse transactions server-side (backend parser reused)
- Select target account during import
- Create new accounts inline during upload
- Automatic deduplication based on raw transaction data
- Optional balance update from statement

### Export/Import
- Export all data as JSON file
- Import JSON with merge or replace options
- Full data backup and restore capability

## Usage

### Creating an Account

```typescript
import { createAccount } from '../services/accountsStore'

const account = createAccount({
  name: 'Main Checking',
  institution_name: 'Chase',
  account_type: 'checking',
  masked_number: '1234',
  opening_balance: 1000.00
})
```

### Importing Transactions

1. Upload a statement file via `/upload`
2. Review parsed transactions on `/review/:parseJobId`
3. Select transactions to import
4. Click "Import Transactions"
5. Select or create an account
6. Optionally update account balance from statement
7. Confirm import

### Exporting Data

Click "Export" button on Accounts page to download a JSON file containing all accounts and transactions.

### Importing Data

Click "Import" button on Accounts page to:
- **Merge**: Add new accounts/transactions without overwriting existing data
- **Replace**: Replace all data (WARNING: Destructive operation)

## Migration

If you have existing transactions without account IDs, use the migration helper on the Accounts page to map orphan transactions to accounts.

## Testing

Run unit tests for the store:
```bash
npm test -- accountsStore.test.ts
```

## File Structure

- `src/services/accountsStore.ts` - Core localStorage store
- `src/components/accounts/` - Account UI components
- `src/pages/AccountsPage.tsx` - Main accounts page
- `src/pages/ReviewPage.tsx` - Transaction review with account selection

