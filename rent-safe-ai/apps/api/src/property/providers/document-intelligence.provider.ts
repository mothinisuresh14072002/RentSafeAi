export interface DocumentExtractedFields {
  ownerName: string | null;
  propertyAddress: string | null;
  identifiers: Record<string, string>;
  issueDate: Date | null;
  tamperRiskScore: number; // 0.0 to 1.0
  tamperIndicators: string[];
}

export abstract class DocumentIntelligenceProvider {
  /**
   * Extracts text, structured fields, and tamper risk from a property document.
   */
  abstract analyzeDocument(
    documentUrl: string,
    mimeType: string,
  ): Promise<DocumentExtractedFields>;
}
