import { db } from './firebase';
import { collection, addDoc, getDocs, query, orderBy, where, onSnapshot } from 'firebase/firestore';
import { PaymentAttempt, PaymentRecord, FinancialStats } from '../types';
import { sanitizeData } from './userService';

interface PaymentPayload {
  userId: string; 
  email: string;
  sprintId: string;
  amount: number;
  name?: string;
}

const PAYMENT_ATTEMPTS = 'payment_attempts';
const PAYMENTS_LEDGER = 'payments';

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
    
    await paymentService.logPaymentAttempt({
        user_id: payload.userId,
        sprint_id: payload.sprintId,
        amount: payload.amount,
        status: 'pending'
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
        throw new Error(errorText);
      }

      const data = await response.json();
      const checkoutUrl = data.data?.link || data.link;
      
      if (checkoutUrl) return checkoutUrl;
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
  },

  /**
   * Admin: Get full payments ledger
   */
  getPaymentsLedger: async (): Promise<PaymentRecord[]> => {
    const q = query(collection(db, PAYMENTS_LEDGER), orderBy('initiatedAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...sanitizeData(d.data()) } as PaymentRecord));
  },

  /**
   * Admin: Subscribe to real-time payments
   */
  subscribeToPayments: (callback: (payments: PaymentRecord[]) => void) => {
    const q = query(collection(db, PAYMENTS_LEDGER), orderBy('initiatedAt', 'desc'));
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map(d => ({ id: d.id, ...sanitizeData(d.data()) } as PaymentRecord)));
    });
  },

  /**
   * Admin: Derive financial stats from ledger
   */
  calculateFinancialStats: (ledger: PaymentRecord[]): FinancialStats => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    const success = ledger.filter(p => p.status === 'success');
    const failed = ledger.filter(p => p.status === 'failed');
    const pending = ledger.filter(p => p.status === 'pending');
    const refunded = ledger.filter(p => p.status === 'refunded');

    const totalRevenue = success.reduce((acc, p) => acc + (p.amount || 0), 0);
    const revenueToday = success
        .filter(p => new Date(p.completedAt || p.initiatedAt).getTime() >= today)
        .reduce((acc, p) => acc + (p.amount || 0), 0);
    const revenueThisMonth = success
        .filter(p => new Date(p.completedAt || p.initiatedAt).getTime() >= thisMonth)
        .reduce((acc, p) => acc + (p.amount || 0), 0);

    const totalRefunds = refunded.reduce((acc, p) => acc + (p.amount || 0), 0);
    
    const attempts = ledger.length;
    const successRate = attempts > 0 ? (success.length / attempts) * 100 : 0;
    const failureRate = attempts > 0 ? (failed.length / attempts) * 100 : 0;
    const dropOffRate = attempts > 0 ? (pending.length / attempts) * 100 : 0;

    const uniqueUsers = new Set(success.map(p => p.userId)).size;
    const arpu = uniqueUsers > 0 ? totalRevenue / uniqueUsers : 0;

    return {
      totalRevenue,
      revenueToday,
      revenueThisMonth,
      successCount: success.length,
      failedCount: failed.length,
      pendingCount: pending.length,
      totalRefunds,
      successRate,
      failureRate,
      dropOffRate,
      arpu
    };
  }
};