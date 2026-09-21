import { describe, it, expect } from 'vitest';

const formatIDR = (num: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

describe('Unit Test: Fungsionalitas Kasir Dasar', () => {
  it('Harus memformat angka ke dalam format Rupiah (IDR) dengan benar', () => {
    // String comparison using regular space to avoid nbsp issues
    expect(formatIDR(150000).replace(/\s/g, ' ')).toBe('Rp 150.000');
    expect(formatIDR(0).replace(/\s/g, ' ')).toBe('Rp 0');
  });
});
