
/**
 * Payment Service
 * Handles Sprint-based transactions via Flutterwave.
 */

interface PaymentPayload {
  email: string;
  sprintId: string;
  name?: string;
}

export const paymentService = {
  /**
   * initializeFlutterwave(payload)
   * Calls the Vercel/Node serverless function to get a checkout link.
   */
  initializeFlutterwave: async (payload: PaymentPayload): Promise<string> => {
    console.log("[Registry] Initializing Flutterwave session for:", payload.email);
    
    try {
      const response = await fetch("/api/flutterwave/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: payload.email,
          sprintId: payload.sprintId,
          name: payload.name || 'Vectorise User'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to communicate with payment registry.");
      }

      const data = await response.json();
      
      if (data.authorization_url) {
        console.log("[Registry] Authorization URL generated successfully.");
        return data.authorization_url;
      }
      
      throw new Error("Registry returned an invalid response.");
    } catch (error: any) {
      console.error("[Registry] Payment Init Error:", error.message);
      throw error;
    }
  },

  /**
   * verifyPayment(gateway, reference)
   * Polls the backend to verify that fulfillment (enrollment) has occurred.
   */
  // Fixed: Added missing verifyPayment method used in PaymentSuccess.tsx to resolve property error
  verifyPayment: async (gateway: string, reference: string): Promise<{ status: string }> => {
    console.log(`[Registry] Verifying ${gateway} payment:`, reference);
    
    // Choose appropriate verification endpoint
    const url = gateway === 'paystack'
      ? `https://us-central1-vectorise-f19d4.cloudfunctions.net/verifyPayment?reference=${reference}`
      : `/api/flutterwave/verify?reference=${reference}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        // Handle cases where verify endpoint might not be deployed yet
        return { status: 'pending' };
      }
      return await response.json();
    } catch (error) {
      console.error("[Registry] Payment Verification Error:", error);
      return { status: 'error' };
    }
  }
};
