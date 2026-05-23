import apiClient from './client';

export interface IdnormSessionResponse {
  sessionUrl: string;
  reference: string;
}

export class IdnormService {
  /**
   * Initializes a KYC session by calling our secure backend.
   * Our backend securely holds the IDNORM_API_KEY and returns a session URL.
   */
  static async createVerificationSession(): Promise<IdnormSessionResponse> {
    const response = await apiClient.get('/kyc/idnorm-session');
    return response.data;
  }

  /**
   * Simulates the idnorm webhook callback from the frontend for testing purposes.
   * In production, idnorm's servers would hit this endpoint directly.
   */
  static async simulateCallback(vendorId: string, status: 'approved' | 'rejected'): Promise<any> {
    const response = await apiClient.post('/kyc/idnorm-callback', {
      vendor_id: vendorId,
      status: status
    });
    return response.data;
  }

  /**
   * Polls the backend to check the current KYC status of the vendor.
   */
  static async checkStatus(): Promise<{ status: string }> {
    const response = await apiClient.get('/kyc/status');
    return response.data;
  }
}
