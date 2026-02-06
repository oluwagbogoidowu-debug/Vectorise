
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

      const contentType = response.headers.get("content-type");
      
      // Check if response is actually JSON before parsing
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.message || "Registry error occurred.");
        }

        if (data.authorization_url) {
          console.log("[Registry] Authorization URL generated successfully.");
          return data.authorization_url;
        }
        
        throw new Error("Registry returned an incomplete response.");
      } else {
        // Handle non-JSON errors (like Vercel 500 text pages)
        const textError = await response.text();
        console.error("[Registry] Received non-JSON error from backend:", textError);
        throw new Error("The payment registry is currently unreachable (Server 500). Please check your environment variables.");
      }
    } catch (error: any) {
      console.error("[Registry] Payment Init Error:", error.message);
      throw error;
    }
  },

  /**
   * verifyPayment(gateway, reference)
   * Polls the backend to verify that fulfillment has occurred.
   */
  verifyPayment: async (gateway: string, reference: string): Promise<{ status: string }> => {
    console.log(`[Registry] Verifying ${gateway} payment:`, reference);
    
    const url = gateway === 'paystack'
      ? `https://us-central1-vectorise-f19d4.cloudfunctions.net/verifyPayment?reference=${reference}`
      : `/api/flutterwave/verify?reference=${reference}`;

    try {
      const response = await fetch(url);
      const contentType = response.headers.get("content-type");

      if (contentType && contentType.indexOf("application/json") !== -1) {
        return await response.json();
      } else {
        const text = await response.text();
        console.warn("[Registry] Verification returned non-JSON:", text);
        return { status: 'pending' };
      }
    } catch (error) {
      console.error("[Registry] Payment Verification Error:", error);
      return { status: 'error' };
    }
  }
};
