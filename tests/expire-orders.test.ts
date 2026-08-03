import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { DEFAULT_RESERVATION_HOURS, pendingCutoff, reservationHours } from "../src/lib/expireOrders";

const originalEnv = process.env.ORDER_RESERVATION_HOURS;

afterEach(() => {
  if (originalEnv === undefined) delete process.env.ORDER_RESERVATION_HOURS;
  else process.env.ORDER_RESERVATION_HOURS = originalEnv;
});

describe("pendingCutoff", () => {
  it("recua exatamente as horas configuradas", () => {
    const now = new Date("2026-08-03T12:00:00Z");
    assert.equal(pendingCutoff(now, 24).toISOString(), "2026-08-02T12:00:00.000Z");
    assert.equal(pendingCutoff(now, 1).toISOString(), "2026-08-03T11:00:00.000Z");
  });
});

describe("reservationHours", () => {
  it("usa 24h por padrão", () => {
    delete process.env.ORDER_RESERVATION_HOURS;
    assert.equal(reservationHours(), DEFAULT_RESERVATION_HOURS);
  });

  it("aceita valor da env dentro do intervalo", () => {
    process.env.ORDER_RESERVATION_HOURS = "48";
    assert.equal(reservationHours(), 48);
  });

  it("ignora valores inválidos ou fora do intervalo", () => {
    for (const bad of ["0", "-5", "abc", "9999"]) {
      process.env.ORDER_RESERVATION_HOURS = bad;
      assert.equal(reservationHours(), DEFAULT_RESERVATION_HOURS);
    }
  });
});
