import { describe, it, expect } from "vitest";
import {
  parseCatalogParams,
  serializeCatalogParams,
  buildCatalogQueryString,
  countActiveFilters,
} from "../../src/app/(public)/_lib/params";

describe("parseCatalogParams", () => {
  it("parses empty params to default values", () => {
    const res = parseCatalogParams({});
    expect(res).toEqual({
      q: "",
      sort: "terbaru",
      category: "",
      kondisi: undefined,
      harga: undefined,
      cabang: undefined,
      cursor: undefined,
    });
  });

  it("cleans and truncates query string q to 60 characters with collapsed spaces", () => {
    const raw = "   iphone    13   pro    max   " + "x".repeat(100);
    const res = parseCatalogParams({ q: raw });
    expect(res.q.startsWith("iphone 13 pro max")).toBe(true);
    expect(res.q.length).toBeLessThanOrEqual(60);
    expect(res.q.includes("  ")).toBe(false);
  });

  it("validates and whitelists sort param, fallback to terbaru on unknown value", () => {
    expect(parseCatalogParams({ sort: "harga_asc" }).sort).toBe("harga_asc");
    expect(parseCatalogParams({ sort: "harga_desc" }).sort).toBe("harga_desc");
    expect(parseCatalogParams({ sort: "hacked_sort" }).sort).toBe("terbaru");
  });

  it("validates and whitelists kondisi param", () => {
    expect(parseCatalogParams({ kondisi: "baru" }).kondisi).toBe("baru");
    expect(parseCatalogParams({ kondisi: "BEKAS" }).kondisi).toBe("bekas");
    expect(parseCatalogParams({ kondisi: "rusak" }).kondisi).toBeUndefined();
  });

  it("validates and whitelists harga preset", () => {
    expect(parseCatalogParams({ harga: "lt500k" }).harga).toBe("lt500k");
    expect(parseCatalogParams({ harga: "2m-5m" }).harga).toBe("2m-5m");
    expect(parseCatalogParams({ harga: "1m-3m" }).harga).toBeUndefined();
  });

  it("parses from URLSearchParams instance as well", () => {
    const sp = new URLSearchParams("q=laptop&sort=harga_desc&kondisi=bekas");
    const res = parseCatalogParams(sp);
    expect(res.q).toBe("laptop");
    expect(res.sort).toBe("harga_desc");
    expect(res.kondisi).toBe("bekas");
  });
});

describe("serializeCatalogParams & countActiveFilters", () => {
  it("keeps URL clean by omitting default params", () => {
    const qs = buildCatalogQueryString({
      q: "samsung",
      sort: "terbaru", // default, should not be in query string
      category: "",
    });
    expect(qs).toBe("?q=samsung");
  });

  it("serializes all non-default filter params", () => {
    const qs = buildCatalogQueryString({
      q: "ipad",
      sort: "harga_asc",
      category: "Elektronik",
      kondisi: "bekas",
      harga: "2m-5m",
    });
    expect(qs).toContain("q=ipad");
    expect(qs).toContain("sort=harga_asc");
    expect(qs).toContain("category=Elektronik");
    expect(qs).toContain("kondisi=bekas");
    expect(qs).toContain("harga=2m-5m");
  });

  it("counts active filter groups accurately without including sort, category, or q", () => {
    const parsed = parseCatalogParams({
      q: "iphone",
      sort: "harga_desc",
      category: "Elektronik",
      kondisi: "baru",
      harga: "gt10m",
    });
    // Active filters: kondisi (1) + harga (1) = 2
    expect(countActiveFilters(parsed)).toBe(2);
  });
});
