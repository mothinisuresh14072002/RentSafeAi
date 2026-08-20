import { Injectable, Logger } from '@nestjs/common';
import {
  DocumentIntelligenceProvider,
  DocumentExtractedFields,
} from './document-intelligence.provider';

@Injectable()
export class SandboxDocumentIntelligenceProvider
  implements DocumentIntelligenceProvider
{
  private readonly logger = new Logger(SandboxDocumentIntelligenceProvider.name);

  async analyzeDocument(
    documentUrl: string,
    mimeType: string,
  ): Promise<DocumentExtractedFields> {
    this.logger.log(`[Sandbox] Analyzing document: ${documentUrl}`);

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Return dummy data that will match our test owner (Demo Owner)
    // We could make this dynamic based on the documentUrl if needed
    return {
      ownerName: 'Demo Owner',
      propertyAddress: '12 Example Street, Adyar, Chennai, Tamil Nadu 600020',
      identifiers: {
        SURVEY_NUMBER: '123/4A',
        PROPERTY_TAX_ID: 'TEST-001',
      },
      issueDate: new Date('2022-01-15'),
      tamperRiskScore: 0.05, // low risk
      tamperIndicators: [],
    };
  }
}
