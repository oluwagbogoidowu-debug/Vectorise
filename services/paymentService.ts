
/**
 * Payment Service Wrapper
 * Handles initialization and verification via backend Firebase Functions
 */

interface PaymentPayload {
  email: string;
  sprintId: string;
  coachId?: string;
  userStage?: string;
  entrySprint?: boolean;
}

// In a real environment, this base URL would be your Firebase Project region URL
// e.g. https://us-central1-vectorise-f19d4.cloudfunctions.net
const FUNCTIONS_BASE_URL = 'https://us-central1-vectorise-f19d4.cloudfunctions.net';

export const paymentService = {
  /**
   * initializePayment(provider, payload)
   * Dispatches to the correct initialization logic based on provider
   */
  initializePayment: async (provider: 'paystack' | 'flutterwave', payload: PaymentPayload): Promise<string> => {
    if (provider === "paystack") {
      return initializePaystack(payload);
    }

    if (provider === "flutterwave") {
      throw new Error("Flutterwave integration not yet implemented");
    }

    throw new Error(`Unsupported payment provider: ${provider}`);
  },

  /**
   * verifyPayment(provider, data)
   * Used for polling or manual verification (though webhook is preferred for fulfillment)
   */
  verifyPayment: async (provider: 'paystack' | 'flutterwave', reference: string) => {
    try {
      const response = await fetch(`${FUNCTIONS_BASE_URL}/verifyPayment?provider=${provider}&reference=${reference}`);
      return await response.json();
    } catch (error) {
      console.error("Verification error:", error);
      throw error;
    }
  }
};

/**
 * Internal Paystack Logic
 * Communicates with /initiatePayment Firebase Function
 */
async function initializePaystack(payload: PaymentPayload): Promise<string> {
  try {
    const response = await fetch(`${FUNCTIONS_BASE_URL}/initiatePayment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: payload.email,
        sprint_id: payload.sprintId,
        coach_id: payload.coachId,
        user_stage: payload.userStage,
        entry_sprint: payload.entrySprint ?? true
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to initiate payment");
    }

    const data = await response.json();
    
    // The backend returns authorization_url from Paystack Transaction Init
    if (data.authorization_url) {
      return data.authorization_url;
    }
    
    throw new Error("No authorization URL returned from payment server");
  } catch (error) {
    console.error("Paystack Init Error:", error);
    throw error;
  }
}
