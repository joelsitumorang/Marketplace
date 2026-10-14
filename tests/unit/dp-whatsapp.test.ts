import { describe, it, expect } from "vitest";
import {
  normalizePhone,
  buildDpMessage,
  buildWaLink,
} from "../../src/lib/dp/whatsapp";

describe("DP WhatsApp Normalization & Templates", () => {
  describe("normalizePhone", () => {
    it("menormalisasi format 0812-3456-789", () => {
      const res = normalizePhone("0812-3456-789");
      expect(res.isValid).toBe(true);
      expect(res.normalized).toBe("628123456789");
    });

    it("menormalisasi format +62 812 3456 789", () => {
      const res = normalizePhone("+62 812 3456 789");
      expect(res.isValid).toBe(true);
      expect(res.normalized).toBe("628123456789");
    });

    it("menormalisasi format 62812345678", () => {
      const res = normalizePhone("62812345678");
      expect(res.isValid).toBe(true);
      expect(res.normalized).toBe("62812345678");
    });

    it("menormalisasi format 812345678", () => {
      const res = normalizePhone("812345678");
      expect(res.isValid).toBe(true);
      expect(res.normalized).toBe("62812345678");
    });

    it("menormalisasi format (0812) 3456 789", () => {
      const res = normalizePhone("(0812) 3456 789");
      expect(res.isValid).toBe(true);
      expect(res.normalized).toBe("628123456789");
    });

    it("menolak nomor kosong atau null/undefined", () => {
      expect(normalizePhone("").isValid).toBe(false);
      expect(normalizePhone(null).isValid).toBe(false);
      expect(normalizePhone(undefined).isValid).toBe(false);
    });

    it("menolak teks tanpa angka atau huruf campuran murni", () => {
      expect(normalizePhone("abc-xyz").isValid).toBe(false);
    });

    it("menolak nomor terlalu pendek (< 10 digit)", () => {
      const res = normalizePhone("08123");
      expect(res.isValid).toBe(false);
      expect(res.error).toContain("harus 10-15 digit");
    });

    it("menolak nomor terlalu panjang (> 15 digit)", () => {
      const res = normalizePhone("081234567890123456");
      expect(res.isValid).toBe(false);
      expect(res.error).toContain("harus 10-15 digit");
    });
  });

  describe("buildDpMessage & buildWaLink", () => {
    const dummyDueDate = new Date("2026-10-15T16:59:59.000Z"); // 15 Okt 2026
    const sampleData = {
      buyerName: "Budi Santoso",
      branchName: "MBG Cabang Pasuruan",
      itemName: "iPhone 13 128GB Midnight",
      dpAmount: 500000,
      remainingAmount: 4500000,
      dueDate: dummyDueDate,
    };

    it("menghasilkan template pesan H-1 dengan benar tanpa kata lelang", () => {
      const msg = buildDpMessage("H_MINUS_1", sampleData);
      expect(msg).toContain("Halo kak Budi Santoso, kami dari MBG Pasuruan.");
      expect(msg).toContain("Mengingatkan DP untuk iPhone 13 128GB Midnight (Rp 500.000)");
      expect(msg).toContain("sisa pembayaran Rp 4.500.000");
      expect(msg).toContain("jatuh tempo besok (15 Okt 2026)");
      expect(msg.toLowerCase()).not.toContain("lelang");
    });

    it("menghasilkan template pesan H0 dengan benar", () => {
      const msg = buildDpMessage("H0", sampleData);
      expect(msg).toContain("jatuh tempo hari ini (15 Okt 2026)");
      expect(msg.toLowerCase()).not.toContain("lelang");
    });

    it("menghasilkan template pesan OVERDUE dengan benar", () => {
      const msg = buildDpMessage("OVERDUE", sampleData);
      expect(msg).toContain("sudah melewati batas pelunasan (15 Okt 2026)");
      expect(msg).toContain("Mohon konfirmasi apakah akan dilunasi ya kak");
      expect(msg.toLowerCase()).not.toContain("lelang");
    });

    it("menghasilkan tautan wa.me yang di-encode dengan benar", () => {
      const msg = buildDpMessage("H0", sampleData);
      const link = buildWaLink("628123456789", msg);

      expect(link.startsWith("https://wa.me/628123456789?text=")).toBe(true);
      expect(link).not.toContain(" "); // spasi harus di-encode
      expect(link).toContain(encodeURIComponent("iPhone 13 128GB Midnight"));
    });
  });
});
