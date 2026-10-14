import { describe, it, expect } from "vitest";
import {
  formatProductTitle,
  extractKeySpecs,
  derivePublicStatus,
} from "../../src/lib/product-display";

describe("formatProductTitle", () => {
  it("menormalkan judul ALL CAPS dan menambah satuan storage HP", () => {
    expect(formatProductTitle("IPHONE 12 128 IBOX")).toBe("iPhone 12 128GB iBox");
    expect(formatProductTitle("IPHONE 13 128 INTER")).toBe("iPhone 13 128GB Inter");
  });

  it("membuang prefix [BARU]/[BEKAS] yang mengulang badge kondisi", () => {
    expect(formatProductTitle("[BEKAS] HP OPPO A57")).toBe("HP Oppo A57");
    expect(formatProductTitle("[baru] Kompor Gas Kaca 2 Tungku")).toBe("Kompor Gas Kaca 2 Tungku");
  });

  it("memindahkan warna ke akhir: Merek Model Storage – Warna", () => {
    expect(formatProductTitle("Iphone 14 blue 128 GB")).toBe("iPhone 14 128GB – Blue");
  });

  it("mempertahankan kode model dan kapitalisasi campuran", () => {
    expect(formatProductTitle("Sepeda Listrik Uwinfly D65")).toBe("Sepeda Listrik Uwinfly D65");
    expect(formatProductTitle("HP REDMI 13 C")).toBe("HP Redmi 13 C");
    expect(formatProductTitle("HP OPPO A6X")).toBe("HP Oppo A6X");
  });

  it("tidak menambah GB pada barang non-HP", () => {
    expect(formatProductTitle("TV LED 32 SAMSUNG")).not.toContain("32GB");
    expect(formatProductTitle("MESIN GERINDA TANGAN 4 INCH")).toBe("Mesin Gerinda Tangan 4 Inch");
  });

  it("merapikan spasi ganda dan pemisah strip", () => {
    expect(formatProductTitle("  laptop   asus  -  hitam ")).toBe("Laptop ASUS – Hitam");
  });

  it("aman untuk string kosong", () => {
    expect(formatProductTitle("")).toBe("");
  });
});

describe("extractKeySpecs", () => {
  it("mengambil storage dan battery health untuk HP", () => {
    expect(
      extractKeySpecs({ title: "IPHONE 12 128 IBOX", description: "Mulus, BH 84%, fullset" })
    ).toEqual(["128GB", "BH 84%"]);
  });

  it("membaca pasangan RAM/ROM dan mengabaikan tanggal", () => {
    expect(extractKeySpecs({ title: "HP OPPO A57 4/64", description: "beli 12/2023" })).toEqual([
      "4/64GB",
    ]);
    expect(extractKeySpecs({ title: "HP REDMI 13 C", description: "nota 12/2023" })).toEqual([]);
  });

  it("melewati kapasitas RAM dan memilih storage terbesar", () => {
    expect(
      extractKeySpecs({ title: "Laptop Asus", description: "RAM 8GB SSD 512GB, Core i5-1135G7" })
    ).toEqual(["512GB", "Core i5"]);
  });

  it("mengambil voltase hanya untuk kendaraan listrik", () => {
    expect(
      extractKeySpecs({ title: "Sepeda Listrik Uwinfly D65", description: "Aki 48V 12Ah" })
    ).toEqual(["48V 12Ah"]);
    expect(extractKeySpecs({ title: "Kipas Angin", description: "adaptor 12V" })).toEqual([]);
  });

  it("mengambil ukuran layar TV", () => {
    expect(extractKeySpecs({ title: "TV LED Samsung 43 inch" })).toEqual(['43"']);
  });

  it("mengabaikan tag HTML di deskripsi dan membatasi jumlah chip", () => {
    const specs = extractKeySpecs({
      title: "iPhone 11 64GB",
      description: "<p>Battery health: 90%</p><p>iBox, fullset</p>",
    });
    expect(specs).toEqual(["64GB", "BH 90%"]);
    expect(specs.length).toBeLessThanOrEqual(2);
  });

  it("mengembalikan array kosong bila tidak ada spesifikasi yang dikenali", () => {
    expect(extractKeySpecs({ title: "Kompor Gas Kaca 2 Tungku", description: null })).toEqual([]);
  });
});

describe("derivePublicStatus", () => {
  it("memetakan status barang ke status publik O2O", () => {
    expect(derivePublicStatus("Tersedia")).toBe("tersedia");
    expect(derivePublicStatus("Dipesan")).toBe("dibooking");
    expect(derivePublicStatus("Terjual", "LUNAS")).toBe("terjual");
    expect(derivePublicStatus("Terjual", null)).toBe("terjual");
  });

  it("barang Terjual dengan transaksi DP dianggap dibooking", () => {
    expect(derivePublicStatus("Terjual", "DP")).toBe("dibooking");
  });
});
