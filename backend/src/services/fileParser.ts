import csv from 'csv-parser';
import { Readable } from 'stream';
// pdf-parse uses CommonJS exports - require returns the function directly in v1.x
const pdfParse = require('pdf-parse');

export interface ParsedTransaction {
  amount: number;
  description: string;
  merchant?: string;
  date: string;
  type: 'income' | 'expense' | 'transfer';
}

export interface ParseResult {
  transactions: ParsedTransaction[];
  totalCount: number;
  errors: string[];
}

export class FileParser {
  private static detectAmountColumn(headers: string[]): string | null {
    const amountKeywords = ['amount', 'value', 'total', 'sum', 'price', 'cost'];
    const debitKeywords = ['debit', 'withdrawal', 'payment'];
    const creditKeywords = ['credit', 'deposit', 'income'];
    
    for (const header of headers) {
      const lowerHeader = header.toLowerCase().trim();
      
      if (amountKeywords.some(keyword => lowerHeader.includes(keyword))) {
        return header;
      }
    }
    
    // Check for separate debit/credit columns
    const hasDebit = headers.some(h => debitKeywords.some(k => h.toLowerCase().includes(k)));
    const hasCredit = headers.some(h => creditKeywords.some(k => h.toLowerCase().includes(k)));
    
    if (hasDebit && hasCredit) {
      return 'debit_credit'; // Special case for separate columns
    }
    
    return null;
  }

  private static detectDateColumn(headers: string[]): string | null {
    const dateKeywords = ['date', 'time', 'timestamp', 'created', 'posted'];
    
    for (const header of headers) {
      const lowerHeader = header.toLowerCase().trim();
      if (dateKeywords.some(keyword => lowerHeader.includes(keyword))) {
        return header;
      }
    }
    
    return null;
  }

  private static detectDescriptionColumn(headers: string[]): string | null {
    const descKeywords = ['description', 'memo', 'note', 'details', 'reference', 'payee'];
    
    for (const header of headers) {
      const lowerHeader = header.toLowerCase().trim();
      if (descKeywords.some(keyword => lowerHeader.includes(keyword))) {
        return header;
      }
    }
    
    return null;
  }

  private static parseAmount(value: any): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      // Remove currency symbols and commas
      const cleaned = value.replace(/[$,]/g, '').trim();
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  private static parseDate(value: any): string {
    if (!value) return new Date().toISOString().split('T')[0];
    
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return new Date().toISOString().split('T')[0];
    }
    
    return date.toISOString().split('T')[0];
  }

  private static extractMerchant(description: string): string | undefined {
    if (!description) return undefined;
    
    // Simple merchant extraction - look for common patterns
    const merchantPatterns = [
      /^([A-Z\s&]+)\s/, // All caps at start
      /^([A-Za-z\s&]+)\s+\d/, // Name followed by number
      /^([A-Za-z\s&]+)\s*$/, // Just the name
    ];
    
    for (const pattern of merchantPatterns) {
      const match = description.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return undefined;
  }

  private static determineTransactionType(amount: number, description: string, merchant?: string): 'income' | 'expense' | 'transfer' {
    const lowerDesc = description.toLowerCase();
    const lowerMerchant = merchant?.toLowerCase() || '';
    const combinedText = `${lowerDesc} ${lowerMerchant}`.trim();

    // Income indicators - check these first as they're usually more reliable
    const incomeKeywords = [
      'deposit', 'salary', 'payroll', 'paycheck', 'wages', 'income',
      'refund', 'return', 'credit', 'interest', 'dividend', 'bonus',
      'reimbursement', 'reimburse', 'payout', 'payment received',
      'direct deposit', 'ach credit', 'wire transfer received',
      'tax refund', 'social security', 'pension', 'annuity',
      'rewards', 'cashback', 'rebate', 'settlement', 'adjustment credit'
    ];

    // Expense indicators
    const expenseKeywords = [
      'purchase', 'payment', 'charge', 'debit', 'withdrawal',
      'fee', 'service charge', 'atm fee', 'overdraft', 'late fee',
      'subscription', 'recurring', 'autopay', 'bill pay',
      'transfer sent', 'wire sent', 'ach debit', 'check',
      'pos', 'point of sale', 'merchant', 'vendor'
    ];

    // Transfer indicators
    const transferKeywords = [
      'transfer', 'move', 'move money', 'between accounts',
      'account transfer', 'internal transfer', 'transfer from',
      'transfer to', 'balance transfer', 'funds transfer'
    ];

    // Bank/account specific patterns
    const bankPatterns = {
      income: [
        /(direct\s+)?deposit/i,
        /ach\s+credit/i,
        /wire\s+(credit|received)/i,
        /salary|payroll|paycheck/i,
        /interest\s+payment/i,
        /dividend/i,
        /refund/i
      ],
      expense: [
        /ach\s+debit/i,
        /wire\s+sent/i,
        /pos\s+transaction/i,
        /atm\s+(withdrawal|fee)/i,
        /service\s+charge/i,
        /overdraft/i
      ],
      transfer: [
        /transfer\s+(from|to)/i,
        /internal\s+transfer/i,
        /between\s+accounts/i,
        /move\s+money/i
      ]
    };

    // Check for explicit transfer indicators first (highest priority)
    if (transferKeywords.some(keyword => combinedText.includes(keyword)) ||
        bankPatterns.transfer.some(pattern => pattern.test(combinedText))) {
      return 'transfer';
    }

    // Check for income indicators
    const hasIncomeIndicator = incomeKeywords.some(keyword => combinedText.includes(keyword)) ||
                               bankPatterns.income.some(pattern => pattern.test(combinedText));

    // Check for expense indicators
    const hasExpenseIndicator = expenseKeywords.some(keyword => combinedText.includes(keyword)) ||
                                bankPatterns.expense.some(pattern => pattern.test(combinedText));

    // Use amount sign as a strong signal, but override with description patterns when clear
    if (amount > 0) {
      // Positive amount - likely income, but check if description suggests otherwise
      if (hasExpenseIndicator && !hasIncomeIndicator) {
        // Some banks show expenses as positive with "debit" or "payment" indicators
        // If we see strong expense indicators, treat as expense
        return 'expense';
      }
      // Positive amount with income indicators or ambiguous = income
      return 'income';
    } else if (amount < 0) {
      // Negative amount - likely expense, but check if description suggests otherwise
      if (hasIncomeIndicator && !hasExpenseIndicator) {
        // Some banks show income as negative with "credit" indicators
        // If we see strong income indicators, treat as income (but flip amount would be handled elsewhere)
        return 'income';
      }
      // Negative amount with expense indicators or ambiguous = expense
      return 'expense';
    } else {
      // Zero amount - rely entirely on description
      if (hasIncomeIndicator) return 'income';
      if (hasExpenseIndicator) return 'expense';
      if (transferKeywords.some(keyword => combinedText.includes(keyword))) {
        return 'transfer';
      }
      // Default to expense for zero amounts (usually fees or adjustments)
      return 'expense';
    }
  }

  static async parseCSV(buffer: Buffer): Promise<ParseResult> {
    return new Promise((resolve, reject) => {
      const transactions: ParsedTransaction[] = [];
      const errors: string[] = [];
      let headers: string[] = [];
      let amountColumn: string | null = null;
      let dateColumn: string | null = null;
      let descriptionColumn: string | null = null;
      let debitColumn: string | null = null;
      let creditColumn: string | null = null;

      const stream = Readable.from(buffer.toString());
      
      stream
        .pipe(csv())
        .on('headers', (headerList: string[]) => {
          headers = headerList;
          amountColumn = this.detectAmountColumn(headers);
          dateColumn = this.detectDateColumn(headers);
          descriptionColumn = this.detectDescriptionColumn(headers);
          
          // Check for separate debit/credit columns
          const debitKeywords = ['debit', 'withdrawal', 'payment', 'out'];
          const creditKeywords = ['credit', 'deposit', 'income', 'in'];
          
          debitColumn = headers.find(h => 
            debitKeywords.some(k => h.toLowerCase().includes(k))
          ) || null;
          
          creditColumn = headers.find(h => 
            creditKeywords.some(k => h.toLowerCase().includes(k))
          ) || null;
          
          if (!amountColumn && !debitColumn && !creditColumn) {
            errors.push('Could not detect amount column. Please ensure your CSV has an amount, debit, or credit column.');
          }
          
          if (!dateColumn) {
            errors.push('Could not detect date column. Please ensure your CSV has a date column.');
          }
          
          if (!descriptionColumn) {
            errors.push('Could not detect description column. Please ensure your CSV has a description or memo column.');
          }
        })
        .on('data', (row: any) => {
          try {
            let amount = 0;
            let description = '';
            let date = '';
            
            // Parse amount
            if (amountColumn && row[amountColumn] !== undefined) {
              amount = this.parseAmount(row[amountColumn]);
            } else if (debitColumn && creditColumn) {
              const debit = this.parseAmount(row[debitColumn]);
              const credit = this.parseAmount(row[creditColumn]);
              amount = credit - debit; // Positive for income, negative for expense
            } else if (debitColumn) {
              amount = -this.parseAmount(row[debitColumn]); // Negative for expense
            } else if (creditColumn) {
              amount = this.parseAmount(row[creditColumn]); // Positive for income
            }
            
            // Parse description
            if (descriptionColumn && row[descriptionColumn]) {
              description = String(row[descriptionColumn]).trim();
            } else {
              // Try to find any text column
              const textColumns = headers.filter(h => 
                h !== amountColumn && h !== dateColumn && h !== debitColumn && h !== creditColumn
              );
              if (textColumns.length > 0) {
                description = String(row[textColumns[0]] || '').trim();
              }
            }
            
            // Parse date
            if (dateColumn && row[dateColumn]) {
              date = this.parseDate(row[dateColumn]);
            } else {
              date = new Date().toISOString().split('T')[0];
            }
            
            // Skip empty rows
            if (!description && amount === 0) {
              return;
            }
            
            const merchant = this.extractMerchant(description);
            const type = this.determineTransactionType(amount, description, merchant);

            transactions.push({
              amount,
              description,
              merchant,
              date,
              type
            });
          } catch (error) {
            errors.push(`Error parsing row: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        })
        .on('end', () => {
          resolve({
            transactions,
            totalCount: transactions.length,
            errors
          });
        })
        .on('error', (error: Error) => {
          reject(error);
        });
    });
  }

  /**
   * Parse PDF bank statements and extract transactions
   * Supports plain-text, fixed-column bank statement format:
   * - Date at line start marks beginning of transaction
   * - Description may continue on multiple lines until next date
   * - Monetary values with trailing '-' indicate debits/withdrawals
   * - Three monetary values typically: Withdrawal, Deposit, Balance
   * 
   * Based on monospace fixed-column statement parsing logic.
   */
  static async parsePDF(buffer: Buffer): Promise<ParseResult> {
    try {
      const pdfData = await pdfParse(buffer);
      const text = pdfData.text;
      
      const transactions: ParsedTransaction[] = [];
      const errors: string[] = [];

      if (!text || text.trim().length === 0) {
        errors.push('PDF appears to be empty or contains no extractable text. This may be a scanned PDF that requires OCR.');
        return {
          transactions: [],
          totalCount: 0,
          errors
        };
      }

      // Date pattern: matches dates at line start (MM/DD or MM/DD/YY or MM/DD/YYYY)
      // Pattern: ^\s*\d{1,2}/\d{1,2}(?:/\d{2,4})?
      const datePattern = /^\s*(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/;
      
      // Money pattern template (will be recreated as needed to avoid global flag issues)
      // Matches monetary tokens like:
      // - (123.45) - parentheses indicate negative
      // - 123.45- - trailing dash indicates negative/debit
      // - 123.45 or 1,234.56 or .00
      const moneyPatternTemplate = /(\(?\d{1,3}(?:,\d{3})*(?:\.\d{2})\)?-?)|(\d+\.\d{2}-?)|(\.00)/g;
      
      // Header/footer blacklist patterns
      const headerBlacklist = [
        'activity in date order',
        'date description',
        'totally free checking',
        'continued',
        'withdrawals',
        'deposits',
        'balance'
      ];
      
      // Split text into lines (preserve original for column detection)
      const lines = text.split(/\r?\n/);

      // Debug: Log first few lines to understand structure
      console.log('PDF Parser - First 10 lines:', lines.slice(0, 10));
      console.log('PDF Parser - Total lines:', lines.length);
      
      // Use the new plain-text statement parser
      return this.parsePlainTextStatement(lines, datePattern, moneyPatternTemplate, headerBlacklist);
    } catch (error: any) {
      return {
        transactions: [],
        totalCount: 0,
        errors: [`Failed to parse PDF: ${error.message || 'Unknown error'}`]
      };
    }
  }

  /**
   * Parse plain-text bank statement format (fixed-column, monospace)
   */
  private static parsePlainTextStatement(
    lines: string[],
    datePattern: RegExp,
    moneyPatternTemplate: RegExp,
    headerBlacklist: string[]
  ): ParseResult {
    const transactions: ParsedTransaction[] = [];
    const errors: string[] = [];

    interface CurrentTransaction {
      date?: string;
      descriptionLines: string[];
      rawMoneyTokens: string[];
    }

    let current: CurrentTransaction | null = null;

    /**
     * Clean money token - convert parentheses to negative sign
     * Preserves trailing '-' for debit detection
     */
    const cleanMoneyToken = (tok: string): string => {
      tok = tok.trim();
      // Convert parentheses to negative sign
      if (tok.startsWith('(') && tok.endsWith(')')) {
        tok = '-' + tok.slice(1, -1);
      }
      // Preserve trailing '-' (don't remove it here, parseAmount will handle it)
      return tok;
    };

    /**
     * Parse amount from token string
     */
    const parseAmount = (tok: string | null | undefined): number | null => {
      if (!tok) return null;
      
      tok = tok.trim();
      
      // Treat ".00" as 0.00
      if (tok === '.00') {
        return 0.0;
      }
      
      // Detect trailing '-' that indicates negative (debit)
      let negative = false;
      if (tok.endsWith('-')) {
        negative = true;
        tok = tok.slice(0, -1);
      }
      
      // Remove commas, dollar signs, spaces
      tok = tok.replace(/[,$\s]/g, '').trim();
      
      const val = parseFloat(tok);
      if (isNaN(val)) {
        return null;
      }
      
      return negative ? -val : val;
    };

    /**
     * Extract all money tokens from a line
     */
    const extractMoneyTokens = (line: string): string[] => {
      const tokens: string[] = [];
      // Create a new regex instance each time to avoid global flag issues
      const localMoneyPattern = /(\(?\d{1,3}(?:,\d{3})*(?:\.\d{2})\)?-?)|(\d+\.\d{2}-?)|(\.00)/g;
      let match;
      while ((match = localMoneyPattern.exec(line)) !== null) {
        // Find the matched group (group 0 is the full match)
        const tok = match[0];
        tokens.push(cleanMoneyToken(tok));
      }
      return tokens;
    };

    /**
     * Check if line is header or footer
     */
    const isHeaderOrFooter = (line: string): boolean => {
      const low = line.toLowerCase();
      
      for (const black of headerBlacklist) {
        if (low.includes(black)) {
          return true;
        }
      }
      
      // Ignore lines like "-----"
      if (/^\s*-{3,}\s*$/.test(line)) {
        return true;
      }
      
      return false;
    };

    /**
     * Flush current transaction to results
     */
    const flushCurrent = () => {
      if (!current || !current.date) {
        return;
      }

      const tokens = current.rawMoneyTokens || [];
      let withdrawal: number | null = null;
      let deposit: number | null = null;
      let balance: number | null = null;

      // Heuristics: try to determine withdrawal, deposit, balance
      if (tokens.length >= 3) {
        // Assume the last three are withdrawal/deposit/balance (in that order)
        const wTok = tokens[tokens.length - 3];
        const dTok = tokens[tokens.length - 2];
        const bTok = tokens[tokens.length - 1];
        
        withdrawal = parseAmount(wTok);
        deposit = parseAmount(dTok);
        balance = parseAmount(bTok);
      } else if (tokens.length === 2) {
        // Decide which is which by sign or position
        const left = tokens[0];
        const right = tokens[1];
        
        const leftAmt = parseAmount(left);
        const rightAmt = parseAmount(right);
        
        if (left.endsWith('-') && !right.endsWith('-')) {
          withdrawal = leftAmt;
          deposit = 0.0;
          balance = rightAmt;
        } else {
          // Fallback: left=withdrawal, right=deposit or balance
          withdrawal = leftAmt !== null && leftAmt > 0 ? leftAmt : 0.0;
          deposit = rightAmt !== null && (leftAmt === null || rightAmt >= 0) ? rightAmt : 0.0;
        }
      } else if (tokens.length === 1) {
        const only = tokens[0];
        const amt = parseAmount(only);
        
        if (only.endsWith('-')) {
          withdrawal = amt;
          deposit = 0.0;
        } else {
          deposit = amt;
          withdrawal = 0.0;
        }
      } else {
        // No money tokens found
        withdrawal = 0.0;
        deposit = 0.0;
      }

      // Normalize None -> 0.0
      withdrawal = withdrawal === null ? 0.0 : Math.abs(withdrawal);
      deposit = deposit === null ? 0.0 : Math.abs(deposit);
      balance = balance === null ? null : balance;

      // Determine type
      let type: 'income' | 'expense' | 'transfer' = 'expense';
      if (withdrawal > 1e-9) {
        type = 'expense';
      } else if (deposit > 1e-9) {
        type = 'income';
      } else {
        type = 'transfer';
      }

      // Build description
      const description = current.descriptionLines
        .filter(l => l.trim().length > 0)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 500);

      if (description.length < 3 && withdrawal === 0.0 && deposit === 0.0) {
        // Skip transactions with no description and no amounts
        return;
      }

      // Determine final amount (negative for withdrawal, positive for deposit)
      const amount = withdrawal > 0 ? -withdrawal : deposit;

      const merchant = this.extractMerchant(description);
      const finalType = this.determineTransactionType(amount, description, merchant);

      transactions.push({
        date: this.parseDate(current.date),
        description,
        merchant,
        amount,
        type: finalType
      });
    };

    // Main parsing loop
    for (const rawLine of lines) {
      const line = rawLine;

      if (isHeaderOrFooter(line)) {
        continue;
      }

      const dateMatch = datePattern.exec(line);
      
      if (dateMatch) {
        // New transaction starting - flush previous
        if (current) {
          flushCurrent();
        }

        // Start new transaction
        const dateToken = dateMatch[1];
        
        // Extract monetary tokens from the same line
        const moneyTokens = extractMoneyTokens(line);

        // Description: everything after the date
        const afterDate = line.substring(dateMatch[0].length).trim();
        
        // Split on two or more spaces as likely column separator
        // Take first part as description candidate
        const descCandidate = afterDate.split(/\s{2,}/)[0]?.trim() || '';

        current = {
          date: dateToken,
          descriptionLines: descCandidate ? [descCandidate] : [],
          rawMoneyTokens: moneyTokens
        };
      } else {
        // Continuation line (description continuation)
        if (current) {
          const trimmed = line.trim();
          if (trimmed.length > 0 && !/^\s*-{3,}\s*$/.test(trimmed)) {
            // Check if this line has money tokens - if so, extract them
            const moneyTokens = extractMoneyTokens(line);
            if (moneyTokens.length > 0) {
              // This line has amounts - add to money tokens, remove amounts from description
              current.rawMoneyTokens.push(...moneyTokens);
              // Create a new regex to remove money patterns from line
              const removeMoneyPattern = /(\(?\d{1,3}(?:,\d{3})*(?:\.\d{2})\)?-?)|(\d+\.\d{2}-?)|(\.00)/g;
              const withoutMoney = line.replace(removeMoneyPattern, '').trim();
              if (withoutMoney.length > 0) {
                current.descriptionLines.push(withoutMoney);
              }
            } else {
              // Pure description line
              current.descriptionLines.push(trimmed);
            }
          }
        }
      }
    }

    // Flush last transaction
    if (current) {
      flushCurrent();
    }

    if (transactions.length === 0) {
      errors.push('No transactions could be extracted from the PDF.');
      errors.push('The PDF may be in an unsupported format, or it may be a scanned image that requires OCR processing.');
    } else {
      // Remove duplicates
      const uniqueTransactions = transactions.filter((transaction, index, self) => {
        return index === self.findIndex(t => 
          t.date === transaction.date &&
          Math.abs(t.amount - transaction.amount) < 0.01 &&
          t.description.substring(0, 30) === transaction.description.substring(0, 30)
        );
      });

      return {
        transactions: uniqueTransactions,
        totalCount: uniqueTransactions.length,
        errors
      };
    }

    return {
      transactions,
      totalCount: transactions.length,
      errors
    };
  }

  /**
   * Legacy PDF parser - kept as fallback
   * Supports vertically stacked multi-line format:
   * - Date (transaction start marker)
   * - Description (one or more lines)
   * - Withdrawal/Deposit (has amount)
   * - Balance (optional, informational only)
   */
  private static async parsePDFLegacy(buffer: Buffer): Promise<ParseResult> {
    try {
      const pdfData = await pdfParse(buffer);
      const text = pdfData.text;

      // Find transaction start - look for header row or first date
      let startIndex = 0;
      
      // Try to find header row
      for (let i = 0; i < Math.min(30, lines.length); i++) {
        const lowerLine = lines[i].toLowerCase();
        if ((lowerLine.includes('date') && (lowerLine.includes('description') || 
             lowerLine.includes('transaction') || 
             lowerLine.includes('withdrawal') || 
             lowerLine.includes('deposit') || 
             lowerLine.includes('amount') ||
             lowerLine.includes('debit') ||
             lowerLine.includes('credit'))) ||
            lines[i].match(datePattern)) {
          startIndex = lines[i].match(datePattern) ? i : i + 1;
          console.log('PDF Parser - Found header/date at line:', i, 'Start index:', startIndex);
          break;
        }
      }
      
      // If no header found, try to find first date anywhere
      if (startIndex === 0) {
        for (let i = 0; i < lines.length; i++) {
          const dateMatch = lines[i].match(datePattern);
          if (dateMatch) {
            startIndex = i;
            console.log('PDF Parser - Found first date at line:', i);
            break;
          }
        }
      }
      
      // If still no date found, try more flexible date patterns
      if (startIndex === 0) {
        const flexibleDatePattern = /\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/;
        for (let i = 0; i < Math.min(50, lines.length); i++) {
          if (flexibleDatePattern.test(lines[i])) {
            startIndex = i;
            console.log('PDF Parser - Found flexible date at line:', i);
            break;
          }
        }
      }

      // Transaction structure
      interface TransactionData {
        date?: string;
        description: string[];
        withdrawalAmount?: number;
        depositAmount?: number;
        balance?: number;
        withdrawalLine?: string;
        depositLine?: string;
      }

      let currentTransaction: TransactionData = {
        description: []
      };

      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i];
        const lowerLine = line.toLowerCase();
        
        // Skip header/footer lines more aggressively
        if (this.isHeaderFooterLine(lowerLine)) {
          continue;
        }

        // Check if this line starts with a date (new transaction marker)
        // Also check if date appears early in the line (first 20 chars)
        let dateMatch = line.match(datePattern);
        if (!dateMatch && line.length > 0) {
          const firstPart = line.substring(0, 20);
          dateMatch = firstPart.match(/^(\d{1,2}\s*[\/\-\.]\s*\d{1,2}\s*[\/\-\.]\s*\d{2,4})/);
        }
        
        if (dateMatch) {
          // Save previous transaction if valid
          if (currentTransaction.date && (currentTransaction.withdrawalAmount !== undefined || currentTransaction.depositAmount !== undefined)) {
            const transaction = this.buildTransactionFromData(currentTransaction);
            if (transaction) {
              transactions.push(transaction);
            }
          }
          
          // Start new transaction
          currentTransaction = {
            date: dateMatch[1],
            description: [],
            withdrawalAmount: undefined,
            depositAmount: undefined,
            balance: undefined
          };
          
          // Get description from the same line (after date)
          // Extract date string with original spacing for accurate substring
          const dateStr = dateMatch[0]; // Full match including spaces
          const dateValue = dateMatch[1].replace(/\s+/g, ''); // Clean date value
          const afterDate = line.substring(dateStr.length).trim();
          if (afterDate.length > 0) {
            // Check if this part contains just an amount (don't add to description)
            const amountsInLine = afterDate.match(amountPattern);
            const textAfterAmounts = afterDate.replace(amountPattern, '').trim();
            if (!amountsInLine || textAfterAmounts.length > 3) {
              currentTransaction.description.push(textAfterAmounts || afterDate);
            }
          }
        } else if (currentTransaction.date) {
          // This line belongs to the current transaction
          
          // Extract all amounts from the line
          const amounts = line.match(amountPattern);
          
          if (amounts && amounts.length > 0) {
            // Parse amounts
            const parsedAmounts = amounts.map(amt => {
              const cleaned = amt.replace(/[\$£€,]/g, '').trim();
              return parseFloat(cleaned);
            }).filter(amt => !isNaN(amt) && amt > 0);
            
            if (parsedAmounts.length > 0) {
              // Intelligent detection: Check keywords and structure
              const isWithdrawal = this.detectWithdrawalLine(lowerLine, withdrawalKeywords);
              const isDeposit = this.detectDepositLine(lowerLine, depositKeywords);
              const isBalance = this.detectBalanceLine(lowerLine, balanceKeywords);
              
              // Get the primary amount (usually last or largest if multiple)
              const primaryAmount = parsedAmounts.length === 1 
                ? parsedAmounts[0] 
                : parsedAmounts[parsedAmounts.length - 1];
              
              if (isBalance && !isWithdrawal && !isDeposit) {
                // Balance line - store for reference but don't use as transaction amount
                currentTransaction.balance = primaryAmount;
              } else if (isWithdrawal && !isDeposit) {
                // Withdrawal line - clear indicator
                currentTransaction.withdrawalAmount = primaryAmount;
                currentTransaction.withdrawalLine = line;
              } else if (isDeposit && !isWithdrawal) {
                // Deposit line - clear indicator
                currentTransaction.depositAmount = primaryAmount;
                currentTransaction.depositLine = line;
              } else {
                // Ambiguous line - try to determine based on context and patterns
                // Check if line structure suggests it's a withdrawal or deposit field
                
                // Pattern: If line is very short and mostly numbers, might be a separate amount field
                const isAmountField = line.trim().length < 30 && 
                                     line.replace(/[\d\$£€,\s\.\-\(\)]/g, '').length < 5;
                
                if (isAmountField) {
                  // This looks like a standalone amount field (withdrawal or deposit)
                  // Use context: if we already have one, the other is this
                  if (currentTransaction.withdrawalAmount === undefined && 
                      currentTransaction.depositAmount === undefined) {
                    // No amount set yet - try to guess based on line position/context
                    // Often withdrawal comes before deposit in statements
                    // Check surrounding lines for hints
                    const nextLines = lines.slice(i, Math.min(i + 3, lines.length))
                      .map(l => l.toLowerCase()).join(' ');
                    const prevLines = lines.slice(Math.max(0, i - 2), i)
                      .map(l => l.toLowerCase()).join(' ');
                    
                    const contextHasDeposit = depositKeywords.some(k => 
                      nextLines.includes(k) || prevLines.includes(k));
                    const contextHasWithdrawal = withdrawalKeywords.some(k => 
                      nextLines.includes(k) || prevLines.includes(k));
                    
                    if (contextHasWithdrawal && !contextHasDeposit) {
                      currentTransaction.withdrawalAmount = primaryAmount;
                    } else if (contextHasDeposit && !contextHasWithdrawal) {
                      currentTransaction.depositAmount = primaryAmount;
                    } else {
                      // Default: assume withdrawal if no other clue (most common)
                      currentTransaction.withdrawalAmount = primaryAmount;
                    }
                  } else if (currentTransaction.withdrawalAmount === undefined) {
                    currentTransaction.withdrawalAmount = primaryAmount;
                  } else if (currentTransaction.depositAmount === undefined) {
                    currentTransaction.depositAmount = primaryAmount;
                  }
                } else {
                  // Line has text - check for hints in the text
                  const hasWithdrawalHints = withdrawalKeywords.some(k => lowerLine.includes(k)) ||
                                            lowerLine.includes('payment') || 
                                            lowerLine.includes('charge') ||
                                            lowerLine.includes('check') ||
                                            lowerLine.includes('atm');
                  const hasDepositHints = depositKeywords.some(k => lowerLine.includes(k)) ||
                                         lowerLine.includes('deposit') ||
                                         lowerLine.includes('credit') ||
                                         lowerLine.includes('transfer') ||
                                         lowerLine.includes('income');
                  
                  if (hasWithdrawalHints && !hasDepositHints && currentTransaction.withdrawalAmount === undefined) {
                    currentTransaction.withdrawalAmount = primaryAmount;
                    currentTransaction.withdrawalLine = line;
                  } else if (hasDepositHints && !hasWithdrawalHints && currentTransaction.depositAmount === undefined) {
                    currentTransaction.depositAmount = primaryAmount;
                    currentTransaction.depositLine = line;
                  } else if (currentTransaction.withdrawalAmount === undefined && 
                             currentTransaction.depositAmount === undefined) {
                    // Still no clue - check if amount is in parentheses (often indicates negative/withdrawal)
                    if (line.includes('(') && line.includes(')')) {
                      currentTransaction.withdrawalAmount = primaryAmount;
                    } else {
                      // Default to withdrawal (most common transaction type)
                      currentTransaction.withdrawalAmount = primaryAmount;
                    }
                  }
                }
              }
            }
          }
          
          // If line doesn't have amounts or isn't a special line, add to description
          if (!amounts || amounts.length === 0 || (!this.detectWithdrawalLine(lowerLine, withdrawalKeywords) &&
              !this.detectDepositLine(lowerLine, depositKeywords) &&
              !this.detectBalanceLine(lowerLine, balanceKeywords))) {
            // Only add if it's meaningful text (not just numbers/spaces)
            if (line.replace(/[\d\$£€,\s\.\-]/g, '').length > 2) {
              currentTransaction.description.push(line);
            }
          }
        }
      }

      // Don't forget the last transaction
      if (currentTransaction.date && (currentTransaction.withdrawalAmount !== undefined || currentTransaction.depositAmount !== undefined)) {
        const transaction = this.buildTransactionFromData(currentTransaction);
        if (transaction) {
          transactions.push(transaction);
        }
      }

      console.log('PDF Parser - Multi-line transactions found:', transactions.length);

      if (transactions.length === 0) {
        // Fallback: try single-line parsing
        console.log('PDF Parser - Trying fallback single-line parsing...');
        transactions.push(...this.fallbackSingleLineParsing(lines, datePattern, amountPattern));
        console.log('PDF Parser - Fallback transactions found:', transactions.length);
      }
      
      // Additional fallback: try parsing lines that contain dates with amounts nearby
      if (transactions.length === 0) {
        console.log('PDF Parser - Trying additional fallback: date + nearby amounts...');
        transactions.push(...this.emergencyFallbackParsing(lines));
        console.log('PDF Parser - Emergency fallback transactions found:', transactions.length);
      }

      if (transactions.length === 0) {
        // Enhanced error message with diagnostic info
        const sampleLines = lines.slice(startIndex, Math.min(startIndex + 10, lines.length))
          .filter(l => l.length > 0)
          .slice(0, 5);
        
        errors.push('No transactions could be extracted from the PDF.');
        errors.push('The PDF may be in an unsupported format, or it may be a scanned image that requires OCR processing.');
        
        if (sampleLines.length > 0) {
          errors.push(`Sample lines from PDF: ${sampleLines.join(' | ').substring(0, 200)}`);
        }
      } else {
        // Remove duplicates
        const uniqueTransactions = transactions.filter((transaction, index, self) => {
          return index === self.findIndex(t => 
            t.date === transaction.date &&
            Math.abs(t.amount - transaction.amount) < 0.01 &&
            t.description.substring(0, 30) === transaction.description.substring(0, 30)
          );
        });

        return {
          transactions: uniqueTransactions,
          totalCount: uniqueTransactions.length,
          errors
        };
      }

      return {
        transactions,
        totalCount: transactions.length,
        errors
      };
    } catch (error: any) {
      return {
        transactions: [],
        totalCount: 0,
        errors: [`Failed to parse PDF: ${error.message || 'Unknown error'}`]
      };
    }
  }

  /**
   * Check if a line is a header or footer
   */
  private static isHeaderFooterLine(lowerLine: string): boolean {
    return lowerLine.includes('page') ||
           (lowerLine.includes('statement') && (lowerLine.includes('summary') || lowerLine.includes('total'))) ||
           (lowerLine.includes('account number') && lowerLine.includes(':')) ||
           lowerLine.includes('account statement') ||
           lowerLine.match(/^page\s+\d+/i) !== null ||
           (lowerLine.includes('beginning') && lowerLine.includes('balance')) ||
           (lowerLine.includes('ending') && lowerLine.includes('balance') && !lowerLine.includes('transaction'));
  }

  /**
   * Detect if a line is a withdrawal/debit line
   */
  private static detectWithdrawalLine(line: string, keywords: string[]): boolean {
    return keywords.some(keyword => {
      const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      return regex.test(line);
    });
  }

  /**
   * Detect if a line is a deposit/credit line
   */
  private static detectDepositLine(line: string, keywords: string[]): boolean {
    return keywords.some(keyword => {
      const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      return regex.test(line);
    });
  }

  /**
   * Detect if a line is a balance line
   */
  private static detectBalanceLine(line: string, keywords: string[]): boolean {
    return keywords.some(keyword => {
      const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      return regex.test(line);
    });
  }

  /**
   * Build a ParsedTransaction from transaction data
   * Uses intelligent logic: if withdrawal amount exists, it's a withdrawal (negative)
   * If deposit amount exists, it's a deposit (positive)
   */
  private static buildTransactionFromData(data: TransactionData): ParsedTransaction | null {
    if (!data.date) return null;

    let amount = 0;
    let hasTransaction = false;

    // Intelligent determination: Use withdrawal if it exists, otherwise use deposit
    // This matches the user's requirement: "determine if the transaction is a deposit 
    // or withdrawal based on the given amounts for each"
    if (data.withdrawalAmount !== undefined && data.withdrawalAmount > 0) {
      amount = -Math.abs(data.withdrawalAmount); // Negative for withdrawal
      hasTransaction = true;
    } else if (data.depositAmount !== undefined && data.depositAmount > 0) {
      amount = Math.abs(data.depositAmount); // Positive for deposit
      hasTransaction = true;
    }

    if (!hasTransaction || amount === 0) {
      return null;
    }

    // Combine description lines, filtering out amount-only lines and balance references
    const description = data.description
      .filter(desc => {
        const trimmed = desc.trim();
        if (trimmed.length === 0) return false;
        
        // Filter out lines that are just amounts
        const amountOnly = /^[\$£€]?\s*-?\d{1,3}(?:,\d{3})*(?:\.\d{2})?(\s*[\$£€]?\s*-?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)*\s*$/;
        if (amountOnly.test(trimmed)) return false;
        
        // Filter out balance references
        const lower = trimmed.toLowerCase();
        if (lower.includes('balance') && lower.match(/[\$£€]?\s*-?\d{1,3}(?:,\d{3})*(?:\.\d{2})?/) !== null) {
          return false;
        }
        
        return true;
      })
      .map(desc => desc.trim())
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 500); // Limit length

    if (description.length < 3) {
      // Try to extract description from withdrawal/deposit line if available
      const fallbackDesc = data.withdrawalLine || data.depositLine || '';
      if (fallbackDesc.replace(/[\d\$£€,\s\.\-]/g, '').length > 2) {
        const cleaned = fallbackDesc.replace(/[\$£€]?\s*-?\d{1,3}(?:,\d{3})*(?:\.\d{2})?/g, '').trim();
        if (cleaned.length >= 3) {
          return {
            amount,
            description: cleaned.substring(0, 500),
            merchant: this.extractMerchant(cleaned),
            date: this.parseDate(data.date),
            type: this.determineTransactionType(amount, cleaned, this.extractMerchant(cleaned))
          };
        }
      }
      return null;
    }

    const merchant = this.extractMerchant(description);
    const type = this.determineTransactionType(amount, description, merchant);
    const parsedDate = this.parseDate(data.date);

    return {
      amount,
      description,
      merchant,
      date: parsedDate,
      type
    };
  }

  /**
   * Helper to check if a line contains only amounts
   */
  private static isAmountOnly(line: string, amountPattern: RegExp): boolean {
    const cleaned = line.replace(/[\$£€,\s\-]/g, '');
    const matches = line.match(amountPattern);
    if (!matches || matches.length === 0) return false;
    
    // If the line with amounts removed is very short, it's likely just amounts
    const withoutAmounts = line.replace(amountPattern, '').trim();
    return withoutAmounts.length < 5;
  }

  /**
   * Helper to check if a line is primarily an amount line
   */
  private static isAmountLine(line: string, amountPattern: RegExp): boolean {
    const matches = line.match(amountPattern);
    if (!matches || matches.length === 0) return false;
    
    // If more than 50% of the line is numbers/currency, it's likely an amount line
    const numericChars = line.replace(/[^\d\$£€,\.\s\-]/g, '').length;
    return numericChars / line.length > 0.5;
  }

  /**
   * Process a multi-line transaction object into a ParsedTransaction
   */
  private static processMultiLineTransaction(
    transaction: {
      date?: string;
      description: string[];
      withdrawal?: string;
      deposit?: string;
    },
    withdrawalKeywords: string[],
    depositKeywords: string[]
  ): ParsedTransaction | null {
    if (!transaction.date) return null;

    let amount = 0;
    let hasAmount = false;

    // Process withdrawal
    if (transaction.withdrawal) {
      const amountStr = transaction.withdrawal.replace(/[\$£€,]/g, '').trim();
      const parsedAmount = parseFloat(amountStr);
      if (!isNaN(parsedAmount) && parsedAmount > 0) {
        amount = -Math.abs(parsedAmount); // Negative for withdrawal
        hasAmount = true;
      }
    }

    // Process deposit (only if no withdrawal, or if deposit is larger)
    if (transaction.deposit) {
      const amountStr = transaction.deposit.replace(/[\$£€,]/g, '').trim();
      const parsedAmount = parseFloat(amountStr);
      if (!isNaN(parsedAmount) && parsedAmount > 0) {
        if (!hasAmount || parsedAmount > Math.abs(amount)) {
          amount = Math.abs(parsedAmount); // Positive for deposit
          hasAmount = true;
        }
      }
    }

    if (!hasAmount || amount === 0) {
      return null;
    }

    // Combine description lines
    const description = transaction.description
      .filter(desc => desc.length > 0)
      .map(desc => desc.trim())
      .filter(desc => {
        // Remove lines that are just amounts or balance info
        const lower = desc.toLowerCase();
        return !lower.includes('balance') && !this.isAmountOnly(desc, /[\$£€]?\s*-?\d{1,3}(?:,\d{3})*(?:\.\d{2})?/g);
      })
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (description.length < 3) {
      return null;
    }

    const merchant = this.extractMerchant(description);
    const type = this.determineTransactionType(amount, description, merchant);
    const parsedDate = this.parseDate(transaction.date);

    return {
      amount,
      description,
      merchant,
      date: parsedDate,
      type
    };
  }

  /**
   * Emergency fallback: Try to find any date + amount combinations
   */
  private static emergencyFallbackParsing(lines: string[]): ParsedTransaction[] {
    const transactions: ParsedTransaction[] = [];
    const flexibleDatePattern = /\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/g;
    const amountPattern = /[\$£€]?\s*\(?\s*\d{1,3}(?:,\d{3})*(?:\.\d{2})?\s*\)?/g;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const dates = line.match(flexibleDatePattern);
      const amounts = line.match(amountPattern);
      
      if (dates && dates.length > 0 && amounts && amounts.length > 0) {
        // Try to build transaction from this line and nearby lines
        const dateStr = dates[0];
        const context = [
          i > 0 ? lines[i - 1] : '',
          line,
          i < lines.length - 1 ? lines[i + 1] : ''
        ].join(' ').toLowerCase();
        
        // Extract description
        const dateIndex = line.indexOf(dateStr);
        let description = '';
        
        if (dateIndex >= 0) {
          const afterDate = line.substring(dateIndex + dateStr.length).trim();
          // Remove amounts from description
          description = afterDate.replace(amountPattern, '').trim();
        }
        
        // If description is short, try to get from surrounding lines
        if (description.length < 5 && i < lines.length - 1) {
          const nextLine = lines[i + 1];
          if (nextLine && !nextLine.match(flexibleDatePattern)) {
            description = (description + ' ' + nextLine.replace(amountPattern, '').trim()).trim();
          }
        }
        
        // Get amount
        const amountStr = amounts[amounts.length - 1].replace(/[\$£€,\(\)]/g, '').trim();
        const parsedAmount = parseFloat(amountStr);
        
        if (!isNaN(parsedAmount) && Math.abs(parsedAmount) > 0.01 && description.length >= 3) {
          // Determine if withdrawal or deposit
          let amount = parsedAmount;
          if (context.includes('withdrawal') || context.includes('withdraw') || 
              context.includes('debit') || context.includes('payment')) {
            amount = -Math.abs(amount);
          } else if (context.includes('deposit') || context.includes('credit')) {
            amount = Math.abs(amount);
          } else if (line.includes('(') || amount < 0) {
            amount = -Math.abs(parsedAmount);
          }
          
          const merchant = this.extractMerchant(description);
          const type = this.determineTransactionType(amount, description, merchant);
          
          transactions.push({
            amount,
            description: description.substring(0, 500),
            merchant,
            date: this.parseDate(dateStr),
            type
          });
        }
      }
    }
    
    return transactions;
  }

  /**
   * Fallback: try to parse single-line transactions
   */
  private static fallbackSingleLineParsing(
    lines: string[],
    datePattern: RegExp,
    amountPattern: RegExp
  ): ParsedTransaction[] {
    const transactions: ParsedTransaction[] = [];

    for (const line of lines) {
      const dates = line.match(datePattern);
      const amounts = line.match(amountPattern);
      
      if (dates && dates.length > 0 && amounts && amounts.length > 0) {
        const dateStr = dates[0];
        const amountStr = amounts[amounts.length - 1].replace(/[\$£€,]/g, '').trim();
        const parsedAmount = parseFloat(amountStr);
        
        if (!isNaN(parsedAmount) && Math.abs(parsedAmount) > 0.01) {
          // Extract description
          const dateIndex = line.indexOf(dateStr);
          const amountIndex = line.lastIndexOf(amounts[amounts.length - 1]);
          let description = '';
          
          if (amountIndex > dateIndex) {
            description = line.substring(dateIndex + dateStr.length, amountIndex).trim();
          } else {
            description = line.replace(dateStr, '').replace(amounts[amounts.length - 1], '').trim();
          }
          
          description = description.replace(/\s+/g, ' ').trim();
          
          if (description.length >= 3) {
            const lowerLine = line.toLowerCase();
            let amount = parsedAmount;
            
            // Determine if it's withdrawal or deposit based on keywords
            if (lowerLine.includes('withdrawal') || lowerLine.includes('withdraw') || 
                lowerLine.includes('debit') || lowerLine.includes('payment')) {
              amount = -Math.abs(amount);
            } else if (lowerLine.includes('deposit') || lowerLine.includes('credit') ||
                       lowerLine.includes('transfer')) {
              amount = Math.abs(amount);
            } else if (amount < 0) {
              amount = amount; // Keep negative
            }

            const merchant = this.extractMerchant(description);
            const type = this.determineTransactionType(amount, description, merchant);

            transactions.push({
              amount,
              description,
              merchant,
              date: this.parseDate(dateStr),
              type
            });
          }
        }
      }
    }

    return transactions;
  }
}
