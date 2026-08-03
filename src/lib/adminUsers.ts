// Regras de segurança da gestão de usuários administrativos.
// Puras de propósito: as rotas passam o estado e recebem o veredito.

export type AdminUserPatch = {
  role?: "ADMIN" | "MANAGER";
  active?: boolean;
};

export type PatchContext = {
  actorId: string;
  targetId: string;
  targetRole: "ADMIN" | "MANAGER";
  targetActive: boolean;
  // Quantos ADMINs ativos existem contando o alvo.
  activeAdminCount: number;
};

/**
 * Retorna mensagem de erro ou null se a alteração é permitida.
 */
export function validateAdminPatch(context: PatchContext, patch: AdminUserPatch): string | null {
  const isSelf = context.actorId === context.targetId;
  const demotes = patch.role !== undefined && patch.role !== "ADMIN" && context.targetRole === "ADMIN";
  const deactivates = patch.active === false && context.targetActive;

  if (isSelf && (demotes || deactivates)) {
    return "Você não pode remover o próprio acesso. Peça a outro administrador.";
  }

  const removesActiveAdmin = context.targetRole === "ADMIN" && context.targetActive && (demotes || deactivates);
  if (removesActiveAdmin && context.activeAdminCount <= 1) {
    return "A loja precisa de pelo menos um administrador ativo.";
  }

  return null;
}

const passwordRules = [/[A-Z]/, /[a-z]/, /[0-9]/];

export function validateAdminPassword(password: string): string | null {
  if (password.length < 10 || password.length > 72) {
    return "A senha precisa ter entre 10 e 72 caracteres.";
  }
  if (!passwordRules.every((rule) => rule.test(password))) {
    return "A senha precisa de letra maiúscula, minúscula e número.";
  }
  return null;
}
