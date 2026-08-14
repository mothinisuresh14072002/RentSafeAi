export interface KycProvider {
  initiateVerification(userId: string, inputData: any): Promise<string>;
  verifyCallbackSignature(signature: string, payload: any): boolean;
}
