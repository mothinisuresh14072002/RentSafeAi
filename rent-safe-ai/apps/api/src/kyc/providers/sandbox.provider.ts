import { Injectable } from '@nestjs/common';
import { KycProvider } from './kyc.provider';
import * as crypto from 'crypto';

@Injectable()
export class SandboxKycProvider implements KycProvider {
  private readonly SECRET = 'sandbox-secret-key';

  async initiateVerification(userId: string, inputData: any): Promise<string> {
    const providerReference = `sbx_${crypto.randomBytes(8).toString('hex')}`;
    
    // Determine deterministic outcome based on aadhaar prefix
    const aadhaar = inputData.aadhaar || '';
    let scenario = 'PASS';
    let expectedName = inputData.expectedName || 'John Doe';
    let dob = '1990-01-01';

    if (aadhaar.startsWith('FAIL')) {
      scenario = 'FAIL';
    } else if (aadhaar.startsWith('MANUAL')) {
      scenario = 'MANUAL';
    } else if (aadhaar.startsWith('EXPIRED')) {
      scenario = 'EXPIRED';
    } else if (aadhaar.startsWith('MISMATCH')) {
      scenario = 'PASS';
      expectedName = 'Jane Doe (Mismatch)'; // Force name mismatch downstream
    }

    // Simulate async webhook trigger in sandbox mode
    setTimeout(() => {
      this.simulateWebhook(providerReference, scenario, expectedName, dob);
    }, 1000);

    return providerReference;
  }

  verifyCallbackSignature(signature: string, payload: any): boolean {
    const expectedSig = crypto
      .createHmac('sha256', this.SECRET)
      .update(JSON.stringify(payload))
      .digest('hex');
    return signature === expectedSig;
  }

  private simulateWebhook(reference: string, scenario: string, name: string, dob: string) {
    const payload = {
      reference,
      status: scenario === 'FAIL' ? 'FAILED' : 'SUCCESS',
      data: {
        name,
        dob,
        rawAadhaar: '123412341234', // This should be masked before storing
      },
    };
    
    const signature = crypto
      .createHmac('sha256', this.SECRET)
      .update(JSON.stringify(payload))
      .digest('hex');

    // Make an HTTP POST to the local API
    // In test environment, we might want to just call the service method directly,
    // but for sandbox simulation, fetch is appropriate if the server is running.
    // For safety, we will assume tests might inject it or we can just log it.
    fetch('http://localhost:3000/api/v1/kyc/webhook/sandbox', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-sandbox-signature': signature,
      },
      body: JSON.stringify(payload),
    }).catch(err => console.error('Sandbox webhook failed:', err.message));
  }
}
