import { describe, it, expect } from "vitest";
import { buildShareText, formatRupiah } from "../../src/lib/share";

describe("formatRupiah", () => {
  it("formats integer price correctly to Indonesian Rupiah", () => {
    expect(formatRupiah(7500000)).toBe("Rp 7.500.000");
    expect(formatRupiah(150000)).toBe("Rp 150.000");
    expect(formatRupiah(0)).toBe("Rp 0");
  });
});

describe("buildShareText", () => {
  const dummyUrl = "https://www.mbgpasuruan.co.id/lelang/katalog/1359";

  it("builds correct share message when price is valid", () => {
    const text = buildShareText(
      { name: "IPHONE 13 128 INTER", price: 7500000 },
      dummyUrl
    );

    const expected = [
      "Cek barang ini di MBG: IPHONE 13 128 INTER",
      "Harga: *Rp 7.500.000*",
      dummyUrl,
    ].join("\n");

    expect(text).toBe(expected);
  });

  it("omits price line when price is null, undefined, or 0", () => {
    const textNull = buildShareText({ name: "Barang Test", price: null }, dummyUrl);
    expect(textNull).toBe(`Cek barang ini di MBG: Barang Test\n${dummyUrl}`);

    const textUndefined = buildShareText({ name: "Barang Test" }, dummyUrl);
    expect(textUndefined).toBe(`Cek barang ini di MBG: Barang Test\n${dummyUrl}`);

    const textZero = buildShareText({ name: "Barang Test", price: 0 }, dummyUrl);
    expect(textZero).toBe(`Cek barang ini di MBG: Barang Test\n${dummyUrl}`);
  });

  it("removes asterisks (*) from product title to protect WhatsApp bold formatting", () => {
    const text = buildShareText(
      { name: "IPHONE *13* 128GB", price: 5000000 },
      dummyUrl
    );

    expect(text).toContain("Cek barang ini di MBG: IPHONE 13 128GB");
    expect(text).toContain("Harga: *Rp 5.000.000*");
  });

  it("always puts the URL on the final line", () => {
    const text = buildShareText(
      { name: "SAMSUNG S23 ULTRA & ACCESORIES", price: 12000000 },
      dummyUrl
    );

    const lines = text.split("\n");
    expect(lines[lines.length - 1]).toBe(dummyUrl);
  });
});
