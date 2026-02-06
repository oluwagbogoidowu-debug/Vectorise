
/**
 * Payment Service
 * Centralized interface for handling Sprint-based transactions.
 * All logic is fulfilled via backend Firebase Functions.
 */

interface PaymentPayload {
  email: string;
  sprintId: string;
  coachId?: string;
  userStage?: string;
  entrySprint?: boolean;
}

// Dynamically determine the function base URL
const FUNCTIONS_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:5001/vectorise-f19d4/us-central1'
    : 'https://us-central1-vectorise-f19d4.cloudfunctions.net';

export const paymentService = {
  /**
   * initializePayment(provider, payload)
   * Dispatches to the correct backend endpoint
   */
  initializePayment: async (provider: 'paystack' | 'flutterwave', payload: PaymentPayload): Promise<string> => {
    console.log(`[Payment] Initializing ${provider} for ${payload.email}...`);
    
    if (provider === "paystack") {
      return initializePaystack(payload);
    }

    throw new Error(`Provider ${provider} is not supported in the registry yet.`);
  },

  /**
   * verifyPayment(provider, reference)
   * Backend check to see if transaction is marked successful in DB
   */
  verifyPayment: async (provider: string, reference: string) => {
    try {
      const response = await fetch(`${FUNCTIONS_BASE_URL}/verifyPayment?provider=${provider}&reference=${reference}`);
      if (!response.ok) throw new Error("Verification check failed at server");
      return await response.json();
    } catch (error) {
      console.error("[Payment] Verification Error:", error);
      throw error;
    }
  }
};

/**
 * INTERNAL LOGIC
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
      throw new Error(errorData.message || "Registry was unable to initialize transaction.");
    }

    const data = await response.json();
    if (data.authorization_url) {
        console.log(`[Payment] Authorization URL received: ${data.authorization_url}`);
        return data.authorization_url;
    }
    
    throw new Error("Invalid response from payment gateway server.");
  } catch (error: any) {
    console.error("[Payment] Paystack Init Failed:", error);
    throw error;
  }
}
