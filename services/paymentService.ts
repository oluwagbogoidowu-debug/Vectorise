
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
        const errorText = await response.text();
        console.error("Registry error:", errorText);
        throw new Error(errorText);
      }

      const contentType = response.headers.get("content-type");
      let data;

      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        console.error("Non-JSON response:", text);
        throw new Error("Server returned non-JSON response");
      }
      
      if (data.authorization_url) {
        console.log("[Registry] Authorization URL generated successfully.");
        return data.authorization_url;
      }
      
      throw new Error("Registry returned an incomplete response.");
    } catch (error: any) {
      console.error("[Registry] Payment Init Error:", error.message);
      throw error;
    }
  },

  /**
   * verifyPayment(gateway, reference)
   * Polls the backend to verify that fulfillment (enrollment) has occurred.
   */
  verifyPayment: async (gateway: string, reference: string): Promise<{ status: string }> => {
    console.log(`[Registry] Verifying ${gateway} payment:`, reference);
    
    const url = gateway === 'paystack'
      ? `https://us-central1-vectorise-f19d4.cloudfunctions.net/verifyPayment?reference=${reference}`
      : `/api/flutterwave/verify?reference=${reference}`;

    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Verification error:", errorText);
        return { status: 'error' };
      }

      const contentType = response.headers.get("content-type");
      let data;

      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
        return data;
      } else {
        const text = await response.text();
        console.error("Non-JSON response:", text);
        return { status: 'pending' };
      }
    } catch (error) {
      console.error("[Registry] Payment Verification Error:", error);
      return { status: 'error' };
    }
  }
};
