import { Injectable } from '@nestjs/common';
import { BankVerificationProvider, BankVerificationResult } from './bank.provider';
import * as crypto from 'crypto';

@Injectable()
export class SandboxBankProvider implements BankVerificationProvider {
  async verifyBankAccount(accountData: any): Promise<BankVerificationResult> {
    const reference = `bank_sbx_${crypto.randomBytes(8).toString('hex')}`;
    const accountNo = accountData.accountNumber || '';
    
    let status: 'SUCCESS' | 'FAILED' = 'SUCCESS';
    let beneficiaryName = accountData.expectedName || 'John Doe';

    if (accountNo.startsWith('FAIL')) {
      status = 'FAILED';
    } else if (accountNo.startsWith('MISMATCH')) {
      status = 'SUCCESS';
      beneficiaryName = 'Jane Doe'; // Different name
    }

    // Simulate async network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      reference,
      status,
      beneficiaryName,
    };
  }
}
