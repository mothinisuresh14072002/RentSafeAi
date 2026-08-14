export interface BankVerificationResult {
  reference: string;
  beneficiaryName: string;
  status: 'SUCCESS' | 'FAILED';
}

export interface BankVerificationProvider {
  verifyBankAccount(accountData: any): Promise<BankVerificationResult>;
}
