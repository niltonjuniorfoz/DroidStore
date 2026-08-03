import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateAdminPassword, validateAdminPatch } from "../src/lib/adminUsers";

const base = {
  actorId: "owner",
  targetId: "target",
  targetRole: "MANAGER" as const,
  targetActive: true,
  activeAdminCount: 2,
};

describe("validateAdminPatch", () => {
  it("permite alterações comuns em terceiros", () => {
    assert.equal(validateAdminPatch(base, { active: false }), null);
    assert.equal(validateAdminPatch(base, { role: "ADMIN" }), null);
    assert.equal(validateAdminPatch({ ...base, targetRole: "ADMIN" }, { role: "MANAGER" }), null);
  });

  it("bloqueia remover o próprio acesso", () => {
    const self = { ...base, targetId: "owner", targetRole: "ADMIN" as const };
    assert.match(validateAdminPatch(self, { active: false }) ?? "", /próprio acesso/);
    assert.match(validateAdminPatch(self, { role: "MANAGER" }) ?? "", /próprio acesso/);
  });

  it("permite trocar a própria senha (sem rebaixar nem desativar)", () => {
    const self = { ...base, targetId: "owner", targetRole: "ADMIN" as const };
    assert.equal(validateAdminPatch(self, {}), null);
  });

  it("bloqueia remover o último administrador ativo", () => {
    const lastAdmin = { ...base, targetRole: "ADMIN" as const, activeAdminCount: 1 };
    assert.match(validateAdminPatch(lastAdmin, { active: false }) ?? "", /pelo menos um administrador/);
    assert.match(validateAdminPatch(lastAdmin, { role: "MANAGER" }) ?? "", /pelo menos um administrador/);
  });

  it("permite desativar admin quando existe outro ativo", () => {
    const admin = { ...base, targetRole: "ADMIN" as const, activeAdminCount: 2 };
    assert.equal(validateAdminPatch(admin, { active: false }), null);
  });

  it("reativar conta nunca é bloqueado pelas regras de lockout", () => {
    const inactive = { ...base, targetActive: false, activeAdminCount: 1 };
    assert.equal(validateAdminPatch(inactive, { active: true }), null);
  });
});

describe("validateAdminPassword", () => {
  it("aceita senha forte", () => {
    assert.equal(validateAdminPassword("SenhaForte123"), null);
  });

  it("rejeita senha curta ou sem variedade", () => {
    assert.notEqual(validateAdminPassword("Curta1"), null);
    assert.notEqual(validateAdminPassword("somenteminusculas1"), null);
    assert.notEqual(validateAdminPassword("SEMMINUSCULA1"), null);
    assert.notEqual(validateAdminPassword("SemNumeroAqui"), null);
  });
});
