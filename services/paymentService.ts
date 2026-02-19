import { db } from './firebase';
import { collection, addDoc, getDocs, query, orderBy, onSnapshot } from 'firebase/firestore';
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
        let errorMsg = "Gateway initialization failed.";
        try {
          const errorJson = await response.json();
          errorMsg = errorJson.error || errorMsg;
        } catch (parseError) {
          const text = await response.text();
          console.error("[Registry] Server returned non-JSON response:", text);
          errorMsg = `Registry Server Error (${response.status})`;
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      const checkoutUrl = data.data?.link || data.link;
      if (checkoutUrl) return checkoutUrl;
      throw new Error("Registry returned an incomplete response (Missing Link).");
    } catch (error: any) {
      console.error("[Payment] Init failure:", error);
      throw error;
    }
  },

  checkPaymentStatus: async (txRef: string): Promise<{ status: string, sprintId?: string, userId?: string }> => {
    try {
      const response = await fetch(`/api/flutterwave/check-status?tx_ref=${txRef}`);
      if (!response.ok) return { status: 'pending' };
      return await response.json();
    } catch (e) {
      console.warn("[Payment] Status check warning:", e);
      return { status: 'pending' };
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
    const success = ledger.filter(p => p.status === 'success' || p.status === 'successful');
    const totalRevenue = success.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    return {
      totalRevenue,
      revenueToday: 0,
      revenueThisMonth: 0,
      successCount: success.length,
      failedCount: ledger.filter(p => p.status === 'failed').length,
      pendingCount: ledger.filter(p => p.status === 'pending').length,
      totalRefunds: 0,
      successRate: ledger.length > 0 ? (success.length / ledger.length) * 100 : 0,
      failureRate: ledger.length > 0 ? (ledger.filter(p => p.status === 'failed').length / ledger.length) * 100 : 0,
      dropOffRate: 0,
      arpu: ledger.length > 0 ? totalRevenue / ledger.length : 0
    };
  }
};