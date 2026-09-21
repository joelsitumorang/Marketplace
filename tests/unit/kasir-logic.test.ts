import { describe, it, expect } from 'vitest';

// Simulasi logika bisnis Kasir
const calculateCheckout = ({
  subtotal,
  discount,
  paymentMethod,
  isDP,
  dpAmount,
  splitCash,
  splitTransfer
}: {
  subtotal: number;
  discount: number;
  paymentMethod: 'TUNAI' | 'TRANSFER' | 'SPLIT';
  isDP: boolean;
  dpAmount: number;
  splitCash: number;
  splitTransfer: number;
}) => {
  const grandTotal = subtotal - discount;
  const targetAmount = isDP ? dpAmount : grandTotal;

  // Validasi DP
  if (isDP && dpAmount <= 0) {
    return { success: false, error: "Nominal DP harus lebih dari 0" };
  }
  if (isDP && dpAmount >= grandTotal) {
    return { success: false, error: "Nominal DP tidak boleh lebih besar atau sama dengan Grand Total" };
  }

  // Validasi Split
  if (paymentMethod === "SPLIT") {
    const splitTotal = splitCash + splitTransfer;
    if (splitTotal !== targetAmount) {
      return { success: false, error: `Total pembayaran split (Rp ${splitTotal}) tidak sesuai dengan tagihan (Rp ${targetAmount})` };
    }
  }

  return { success: true, grandTotal, targetAmount, sisaTagihan: grandTotal - targetAmount };
};

describe('Unit Test: Logika Checkout Kasir & DP', () => {
  it('Harus sukses menghitung DP yang valid (Test Case 1.1)', () => {
    const result = calculateCheckout({
      subtotal: 100000,
      discount: 0,
      paymentMethod: 'TUNAI',
      isDP: true,
      dpAmount: 30000,
      splitCash: 0,
      splitTransfer: 0
    });
    
    expect(result.success).toBe(true);
    expect(result.grandTotal).toBe(100000);
    expect(result.targetAmount).toBe(30000);
    expect(result.sisaTagihan).toBe(70000);
  });

  it('Harus gagal jika nominal DP 0 atau >= Grand Total (Test Case 1.2)', () => {
    // DP 0
    const resultZero = calculateCheckout({
      subtotal: 100000, discount: 0, paymentMethod: 'TUNAI',
      isDP: true, dpAmount: 0, splitCash: 0, splitTransfer: 0
    });
    expect(resultZero.success).toBe(false);

    // DP >= Grand Total
    const resultOver = calculateCheckout({
      subtotal: 100000, discount: 0, paymentMethod: 'TUNAI',
      isDP: true, dpAmount: 150000, splitCash: 0, splitTransfer: 0
    });
    expect(resultOver.success).toBe(false);
  });

  it('Harus sukses memproses Split Payment dengan DP (Test Case 1.3)', () => {
    const result = calculateCheckout({
      subtotal: 200000,
      discount: 0,
      paymentMethod: 'SPLIT',
      isDP: true,
      dpAmount: 100000, // Tagihan saat ini jadi 100rb
      splitCash: 40000,
      splitTransfer: 60000 // 40k + 60k = 100k
    });
    
    expect(result.success).toBe(true);
    expect(result.sisaTagihan).toBe(100000);
  });
});
