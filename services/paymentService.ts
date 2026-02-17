/**
 * Payment Service
 * Handles Sprint-based transactions via Flutterwave.
 */
import { db } from './firebase';
import { collection, addDoc } from 'firebase/firestore';
import { PaymentAttempt, PaymentAttemptStatus } from '../types';
import { sanitizeData } from './userService';

interface PaymentPayload {
  userId: string; 
  email: string;
  sprintId: string;
  amount: number;
  name?: string;
}

const PAYMENT_ATTEMPTS = 'payment_attempts';

export const paymentService = {
  /**
   * Internal telemetry for payment lifecycles.
   */
  logPaymentAttempt: async (log: Omit<PaymentAttempt, 'timestamp'>) => {
    try {
      const entry = sanitizeData({
        ...log,
        timestamp: new Date().toISOString()
      });
      await addDoc(collection(db, PAYMENT_ATTEMPTS), entry);
    } catch (e) {
      console.error("[Telemetry] Logging payment failed:", e);
    }
  },

  /**
   * initializeFlutterwave(payload)
   * Calls the Vercel/Node serverless function to get a checkout link.
   */
  initializeFlutterwave: async (payload: PaymentPayload): Promise<string> => {
    console.log("[Registry] Initializing Flutterwave session for:", payload.email);
    
    // 1. Log Initiation
    await paymentService.logPaymentAttempt({
        user_id: payload.userId,
        sprint_id: payload.sprintId,
        amount: payload.amount,
        status: 'initiated'
    });

    try {
      const response = await fetch("/api/flutterwave/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: payload.email,
          sprintId: payload.sprintId,
          amount: payload.amount.toString(),
          name: payload.name || 'Vectorise User'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        await paymentService.logPaymentAttempt({
            user_id: payload.userId,
            sprint_id: payload.sprintId,
            amount: payload.amount,
            status: 'failed',
            failure_reason: errorText
        });
        throw new Error(errorText);
      }

      const data = await response.json();
      const checkoutUrl = data.data?.link || data.link;
      
      if (checkoutUrl) {
        await paymentService.logPaymentAttempt({
            user_id: payload.userId,
            sprint_id: payload.sprintId,
            amount: payload.amount,
            status: 'processing'
        });
        return checkoutUrl;
      }
      
      throw new Error("Registry returned an incomplete response (Missing Link).");
    } catch (error: any) {
      await paymentService.logPaymentAttempt({
          user_id: payload.userId,
          sprint_id: payload.sprintId,
          amount: payload.amount,
          status: 'failed',
          failure_reason: error.message
      });
      throw error;
    }
  },

  /**
   * verifyPayment(gateway, reference, sprintId)
   */
  verifyPayment: async (gateway: string, reference: string, sprintId?: string): Promise<{ status: string; email?: string; message?: string }> => {
    // For Flutterwave, 'reference' here is the transaction_id returned in the redirect URL
    const url = gateway === 'paystack'
      ? `https://us-central1-vectorise-f19d4.cloudfunctions.net/verifyPayment?reference=${reference}`
      : `/api/flutterwave/verify?transaction_id=${reference}${sprintId ? `&sprintId=${sprintId}` : ''}`;

    try {
      const response = await fetch(url);
      if (!response.ok) return { status: 'error', message: 'Network validation failed' };
      return await response.json();
    } catch (error) {
      return { status: 'error', message: 'Verification service unavailable' };
    }
  }
};
