import { db } from './firebase';
import { collection, addDoc, getDocs, query, orderBy, where, onSnapshot } from 'firebase/firestore';
import { PaymentAttempt, PaymentRecord, FinancialStats } from '../types';
import { sanitizeData } from './userService';

interface PaymentPayload {
  userId: string; 
  email: string;
  sprintId: string;
  amount: number;
  currency?: string; 
  name?: string;
}

const PAYMENT_ATTEMPTS = 'payment_attempts';
const PAYMENTS_LEDGER = 'payments';

export const paymentService = {
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

  initializeFlutterwave: async (payload: PaymentPayload): Promise<string> => {
    try {
      const response = await fetch("/api/flutterwave/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: payload.email,
          userId: payload.userId,
          sprintId: payload.sprintId,
          amount: payload.amount.toString(),
          currency: payload.currency || 'NGN',
          name: payload.name || 'Vectorise User'
        })
      });

      if (!response.ok) {
        const errorJson = await response.json();
        throw new Error(errorJson.error || "Gateway initialization failed.");
      }

      const data = await response.json();
      const checkoutUrl = data.data?.link || data.link;
      if (checkoutUrl) return checkoutUrl;
      throw new Error("Registry returned an incomplete response (Missing Link).");
    } catch (error: any) {
      throw error;
    }
  },

  checkPaymentStatus: async (txRef: string): Promise<{ status: string, sprintId?: string }> => {
    try {
      const response = await fetch(`/api/flutterwave/check-status?tx_ref=${txRef}`);
      if (!response.ok) return { status: 'pending' };
      return await response.json();
    } catch (e) {
      return { status: 'pending' };
    }
  },

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

  getPaymentsLedger: async (): Promise<PaymentRecord[]> => {
    const q = query(collection(db, PAYMENTS_LEDGER), orderBy('initiatedAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...sanitizeData(d.data()) } as PaymentRecord));
  },

  subscribeToPayments: (callback: (payments: PaymentRecord[]) => void) => {
    const q = query(collection(db, PAYMENTS_LEDGER), orderBy('initiatedAt', 'desc'));
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map(d => ({ id: d.id, ...sanitizeData(d.data()) } as PaymentRecord)));
    });
  },

  calculateFinancialStats: (ledger: PaymentRecord[]): FinancialStats => {
    const success = ledger.filter(p => p.status === 'success');
    const totalRevenue = success.reduce((acc, p) => acc + (p.amount || 0), 0);
    return {
      totalRevenue,
      revenueToday: 0,
      revenueThisMonth: 0,
      successCount: success.length,
      failedCount: 0,
      pendingCount: 0,
      totalRefunds: 0,
      successRate: 0,
      failureRate: 0,
      dropOffRate: 0,
      arpu: 0
    };
  }
};