import { describe, it, expect } from "vitest";
import {
  getWibDateString,
  calcDpDueDate,
  calcDaysDiffWIB,
  calcDpStage,
  needsContact,
} from "../../src/lib/dp/stage";

describe("DP Stage & Timezone Pure Functions", () => {
  describe("getWibDateString", () => {
    it("harus menghasilkan tanggal kalender WIB (UTC+7) dengan benar", () => {
      // 2026-10-14 17:30 UTC = 2026-10-15 00:30 WIB
      const utcEvening = new Date("2026-10-14T17:30:00.000Z");
      expect(getWibDateString(utcEvening)).toBe("2026-10-15");

      // 2026-10-14 16:59 UTC = 2026-10-14 23:59 WIB
      const utcJustBeforeMidnight = new Date("2026-10-14T16:59:00.000Z");
      expect(getWibDateString(utcJustBeforeMidnight)).toBe("2026-10-14");
    });
  });

  describe("Kalkulasi Siklus DP (Senin D0 -> Jatuh Tempo Kamis)", () => {
    // Transaksi dibuat pada Senin, 12 Oktober 2026 pukul 10:00 WIB (03:00 UTC)
    const txSenin = new Date("2026-10-12T03:00:00.000Z");
    const dueDate = calcDpDueDate(txSenin);

    it("menghitung jatuh tempo 3 hari kalender ke depan (Kamis 15 Oktober 2026)", () => {
      expect(getWibDateString(dueDate)).toBe("2026-10-15");
    });

    it("pada Senin (D0) dan Selasa (D1), belum muncul di daftar (stage = null)", () => {
      const nowSenin = new Date("2026-10-12T05:00:00.000Z");
      const stageSenin = calcDpStage(dueDate, nowSenin);
      expect(stageSenin.stage).toBeNull();
      expect(stageSenin.daysDiff).toBe(3);

      const nowSelasa = new Date("2026-10-13T07:00:00.000Z");
      const stageSelasa = calcDpStage(dueDate, nowSelasa);
      expect(stageSelasa.stage).toBeNull();
      expect(stageSelasa.daysDiff).toBe(2);
    });

    it("pada Rabu (D2), muncul sebagai H-1 (Besok jatuh tempo)", () => {
      const nowRabu = new Date("2026-10-14T08:00:00.000Z");
      const stageRabu = calcDpStage(dueDate, nowRabu);
      expect(stageRabu.stage).toBe("H_MINUS_1");
      expect(stageRabu.daysDiff).toBe(1);
      expect(stageRabu.label).toBe("Besok jatuh tempo");
      expect(stageRabu.badgeColor).toBe("yellow");
    });

    it("pada Kamis (D3), muncul sebagai H0 (Jatuh tempo hari ini)", () => {
      const nowKamis = new Date("2026-10-15T09:00:00.000Z");
      const stageKamis = calcDpStage(dueDate, nowKamis);
      expect(stageKamis.stage).toBe("H0");
      expect(stageKamis.daysDiff).toBe(0);
      expect(stageKamis.label).toBe("Jatuh tempo hari ini");
      expect(stageKamis.badgeColor).toBe("orange");
    });

    it("pada Jumat (D4), muncul sebagai OVERDUE (Lewat 1 hari)", () => {
      const nowJumat = new Date("2026-10-16T10:00:00.000Z");
      const stageJumat = calcDpStage(dueDate, nowJumat);
      expect(stageJumat.stage).toBe("OVERDUE");
      expect(stageJumat.daysDiff).toBe(-1);
      expect(stageJumat.overdueDays).toBe(1);
      expect(stageJumat.label).toBe("Lewat 1 hari");
      expect(stageJumat.badgeColor).toBe("red");
    });

    it("pada Sabtu (D5), muncul sebagai OVERDUE (Lewat 2 hari)", () => {
      const nowSabtu = new Date("2026-10-17T11:00:00.000Z");
      const stageSabtu = calcDpStage(dueDate, nowSabtu);
      expect(stageSabtu.stage).toBe("OVERDUE");
      expect(stageSabtu.overdueDays).toBe(2);
      expect(stageSabtu.label).toBe("Lewat 2 hari");
    });
  });

  describe("Uji Batas Tengah Malam (Midnight Boundary WIB)", () => {
    // Due date Kamis 15 Oktober 2026
    const dueDate = new Date("2026-10-15T16:59:59.000Z");

    it("17:30 UTC Rabu (= 00:30 WIB Kamis): harus evaluasi sebagai H0 (Kamis)", () => {
      const utcEvening = new Date("2026-10-14T17:30:00.000Z");
      const result = calcDpStage(dueDate, utcEvening);
      expect(result.stage).toBe("H0");
      expect(result.daysDiff).toBe(0);
    });

    it("16:59 UTC Rabu (= 23:59 WIB Rabu): harus evaluasi sebagai H-1 (Rabu)", () => {
      const utcBeforeMidnight = new Date("2026-10-14T16:59:00.000Z");
      const result = calcDpStage(dueDate, utcBeforeMidnight);
      expect(result.stage).toBe("H_MINUS_1");
      expect(result.daysDiff).toBe(1);
    });
  });

  describe("needsContact (Logika Kemunculan Ulang)", () => {
    const nowRabu = new Date("2026-10-14T08:00:00.000Z"); // WIB Rabu
    const nowKamis = new Date("2026-10-15T08:00:00.000Z"); // WIB Kamis
    const nowJumat = new Date("2026-10-16T08:00:00.000Z"); // WIB Jumat
    const nowSabtu = new Date("2026-10-17T08:00:00.000Z"); // WIB Sabtu

    it("belum pernah dihubungi saat H-1 -> perlu dihubungi (true)", () => {
      expect(
        needsContact({
          stage: "H_MINUS_1",
          lastContactStage: null,
          lastContactedAt: null,
          now: nowRabu,
        })
      ).toBe(true);
    });

    it("sudah dihubungi saat H-1, sekarang masih H-1 -> masuk 'Menunggu pembeli' (false)", () => {
      expect(
        needsContact({
          stage: "H_MINUS_1",
          lastContactStage: "H_MINUS_1",
          lastContactedAt: nowRabu,
          now: nowRabu,
        })
      ).toBe(false);
    });

    it("sudah dihubungi saat H-1, sekarang H0 -> muncul lagi (true)", () => {
      expect(
        needsContact({
          stage: "H0",
          lastContactStage: "H_MINUS_1",
          lastContactedAt: nowRabu,
          now: nowKamis,
        })
      ).toBe(true);
    });

    it("sudah dihubungi saat H0, sekarang masih H0 -> masuk 'Menunggu pembeli' (false)", () => {
      expect(
        needsContact({
          stage: "H0",
          lastContactStage: "H0",
          lastContactedAt: nowKamis,
          now: nowKamis,
        })
      ).toBe(false);
    });

    it("sudah dihubungi saat H0, sekarang OVERDUE -> muncul lagi (true)", () => {
      expect(
        needsContact({
          stage: "OVERDUE",
          lastContactStage: "H0",
          lastContactedAt: nowKamis,
          now: nowJumat,
        })
      ).toBe(true);
    });

    it("OVERDUE: sudah dihubungi hari Jumat, di hari Jumat yang sama -> tidak muncul (false)", () => {
      expect(
        needsContact({
          stage: "OVERDUE",
          lastContactStage: "OVERDUE",
          lastContactedAt: nowJumat,
          now: nowJumat,
        })
      ).toBe(false);
    });

    it("OVERDUE: sudah dihubungi hari Jumat, sekarang hari Sabtu -> muncul lagi besoknya (true)", () => {
      expect(
        needsContact({
          stage: "OVERDUE",
          lastContactStage: "OVERDUE",
          lastContactedAt: nowJumat,
          now: nowSabtu,
        })
      ).toBe(true);
    });
  });
});
