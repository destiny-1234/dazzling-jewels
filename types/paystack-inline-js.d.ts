declare module '@paystack/inline-js' {
  interface PaystackTransactionResponse {
    reference: string;
    status?: string;
    trans?: string;
    transaction?: string;
    trxref?: string;
    message?: string;
    [key: string]: unknown;
  }

  interface PaystackTransactionOptions {
    key: string;
    email: string;
    amount: number; // in kobo
    currency?: string;
    reference?: string;
    channels?: string[];
    metadata?: Record<string, unknown>;
    onSuccess?: (transaction: PaystackTransactionResponse) => void;
    onCancel?: (response?: unknown) => void;
    onError?: (error: { message: string; [key: string]: unknown }) => void;
    onLoad?: (response?: unknown) => void;
    onClose?: () => void;
  }

  export default class PaystackPop {
    constructor();
    newTransaction(options: PaystackTransactionOptions): unknown;
    resumeTransaction(accessCode: string, options?: Partial<PaystackTransactionOptions>): unknown;
    checkout(options: PaystackTransactionOptions): Promise<unknown>;
  }
}
