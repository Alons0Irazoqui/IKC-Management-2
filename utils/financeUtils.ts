
import { TuitionRecord, PaymentHistoryItem } from '../types';

/**
 * Extracts the payment history for a specific record.
 * This is used by the PDF generator to show a list of partial payments
 * or the final liquidation payment.
 * 
 * @param record The tuition record/charge
 * @returns Array of PaymentHistoryItem sorted by date
 */
export const getPaymentHistoryForReceipt = (record: TuitionRecord): PaymentHistoryItem[] => {
    // 1. If explicit history exists, use it
    if (record.paymentHistory && record.paymentHistory.length > 0) {
        // Sort ascending by date
        return [...record.paymentHistory].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }

    // 2. Fallback for Legacy Data or Simple Payments without history
    // If status is 'paid', assume the full amount was paid on the paymentDate
    if (record.status === 'paid' && record.paymentDate) {
        const total = record.originalAmount !== undefined ? record.originalAmount : record.amount;
        return [{
            date: record.paymentDate,
            amount: total,
            method: record.method || 'System'
        }];
    }

    // 3. Fallback for 'Partial' without history (should theoretically not happen with new logic)
    if (record.status === 'partial' && record.paymentDate) {
        const total = record.originalAmount || record.amount;
        const paidSoFar = total - record.amount;
        return [{
            date: record.paymentDate,
            amount: paidSoFar,
            method: record.method || 'System'
        }];
    }

    return [];
};
