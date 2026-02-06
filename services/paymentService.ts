
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
   * Patterns: 'paystack' | 'flutterwave'
   */
  initializePayment: async (provider: 'paystack' | 'flutterwave', payload: PaymentPayload): Promise<string> => {
    if (provider === "paystack") {
      return initializePaystack(payload);
    }

    if (provider === "flutterwave") {
      return initializeFlutterwave(payload);
    }

    throw new Error(`Unsupported payment provider: ${provider}`);
  },

  /**
   * verifyPayment(provider, reference)
   * Manually checks backend for transaction status
   */
  verifyPayment: async (provider: string, reference: string) => {
    try {
      const response = await fetch(`${FUNCTIONS_BASE_URL}/verifyPayment?provider=${provider}&reference=${reference}`);
      if (!response.ok) throw new Error("Verification check failed");
      return await response.json();
    } catch (error) {
      console.error("Manual verification error:", error);
      throw error;
    }
  }
};

/**
 * INTERNAL PROVIDER LOGIC
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
      throw new Error(errorData.message || "Backend initialization failed");
    }

    const data = await response.json();
    if (data.authorization_url) return data.authorization_url;
    
    throw new Error("No authorization URL provided by backend");
  } catch (error) {
    console.error("Paystack Init Logic Error:", error);
    throw error;
  }
}

async function initializeFlutterwave(payload: PaymentPayload): Promise<string> {
  // Placeholder for future implementation
  throw new Error("Flutterwave integration is not yet active.");
}
