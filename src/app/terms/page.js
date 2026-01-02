import Link from "next/link";
import "../globals.css";

export const metadata = {
  title: "Termos de Uso • API Calendar",
  robots: {
    index: false,
    follow: false,
  },
};

export default function TermsPage() {
  return (
    <div className="container legal-container">
      <div className="legal-header">
        <h1>Termos de Uso</h1>
        <p className="subtitle">Ao utilizar o aplicativo API Calendar, você concorda com os termos abaixo.</p>
        <nav className="legal-nav">
          <Link href="/">← Voltar ao início</Link>
          <Link href="/privacy">Política de Privacidade</Link>
        </nav>
      </div>

      <div className="legal-content">
        <h2>Uso permitido</h2>
        <p>Você se compromete a utilizar o aplicativo conforme a legislação vigente e as políticas do Google, apenas para criar e gerenciar calendários e eventos relacionados às suas atividades.</p>

        <h2>Conta e permissões</h2>
        <p>Ao autenticar com sua conta Google, você nos autoriza a executar as ações estritamente necessárias nos calendários e eventos de acordo com os escopos consentidos.</p>

        <h2>Responsabilidades</h2>
        <p>Você é responsável pelos dados inseridos e pelo compartilhamento de acesso a calendários. Não nos responsabilizamos por danos decorrentes de uso indevido.</p>

        <h2>Rescisão</h2>
        <p>Você pode revogar o acesso do aplicativo a qualquer momento em <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer">Google Account Permissions</a>.</p>

        <h2>Alterações nos termos</h2>
        <p>Reservamo-nos o direito de modificar estes termos a qualquer momento. Alterações significativas serão comunicadas através da interface do aplicativo.</p>

        <h2>Contato</h2>
        <p>Para dúvidas sobre os termos de uso, entre em contato: <a href="mailto:comercial.hitemp@gmail.com">comercial.hitemp@gmail.com</a>.</p>

        <div className="legal-footer">
          <p>Última atualização: 19 de dezembro de 2025</p>
        </div>
      </div>
    </div>
  );
}
