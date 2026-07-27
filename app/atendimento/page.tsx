import { Instagram, Mail, MessageCircle } from "lucide-react";
import { createMailtoUrl, createWhatsAppUrl, normalizeInstagramUrl } from "../../src/lib/contact";
import { getSiteContent } from "../../src/lib/storefront";

export default async function AtendimentoPage() {
  const { content } = await getSiteContent();
  const storeName = content?.storeName ?? "Brasil Store";
  const email = content?.contactEmail ?? "";
  const whatsapp = content?.whatsapp ?? "";
  const whatsappUrl = createWhatsAppUrl(whatsapp, `Olá! Gostaria de falar com o atendimento da ${storeName}.`);
  const emailUrl = createMailtoUrl(email, `Atendimento ${storeName}`);
  const instagramUrl = normalizeInstagramUrl(content?.instagramUrl);

  return <main className="support-page">
    <section className="support-hero">
      <span>Atendimento</span>
      <h1>Como podemos ajudar?</h1>
      <p>Escolha um canal para falar com a equipe da {storeName}. Você será direcionado diretamente para o contato cadastrado no painel administrativo.</p>
    </section>

    <section className="support-grid" aria-label="Canais de atendimento">
      {whatsappUrl && <a className="support-card whatsapp" href={whatsappUrl} target="_blank" rel="noreferrer">
        <span><MessageCircle /></span>
        <div><strong>WhatsApp</strong><small>Converse com a equipe de atendimento</small><em>{whatsapp}</em></div>
      </a>}

      {emailUrl && <a className="support-card email" href={emailUrl}>
        <span><Mail /></span>
        <div><strong>E-mail</strong><small>Envie sua dúvida ou solicitação</small><em>{email}</em></div>
      </a>}

      {instagramUrl && <a className="support-card instagram" href={instagramUrl} target="_blank" rel="noreferrer">
        <span><Instagram /></span>
        <div><strong>Instagram</strong><small>Acompanhe a loja e envie uma mensagem</small><em>Abrir perfil</em></div>
      </a>}

      {!whatsappUrl && !emailUrl && !instagramUrl && <div className="support-empty">
        <strong>Canais ainda não cadastrados</strong>
        <p>O administrador deve preencher o WhatsApp, o e-mail e o Instagram em Configurações.</p>
      </div>}
    </section>
  </main>;
}
