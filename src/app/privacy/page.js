import Link from "next/link";
import "../globals.css";

export const metadata = {
  title: "Política de Privacidade • API Calendar",
  robots: {
    index: false,
    follow: false,
  },
};

export default function PrivacyPage() {
  return (
    <div className="container legal-container">
      <div className="legal-header">
        <h1>Política de Privacidade</h1>
        <p className="subtitle">
          Esta política descreve como o aplicativo API Calendar coleta, usa e protege informações quando você utiliza a integração com o Google Calendar.
        </p>
        <nav className="legal-nav">
          <Link href="/">← Voltar ao início</Link>
          <Link href="/terms">Termos de Uso</Link>
        </nav>
      </div>

      <div className="legal-content">
        <h2>Dados coletados</h2>
        <ul>
          <li>Seu endereço de e-mail do Google (para autenticação e identificação da conta);</li>
          <li>Calendários criados via aplicativo e respectivos metadados (id, summary, timeZone);</li>
          <li>Eventos que você cria/atualiza via aplicativo (título, data/horário, participantes) quando necessário para executar a funcionalidade solicitada.</li>
        </ul>

        <h2>Escopos do Google</h2>
        <p>Solicitamos apenas os escopos necessários para criar e gerenciar calendários/eventos em seu nome. Exemplos:</p>
        <ul>
          <li><code>https://www.googleapis.com/auth/calendar</code> (criação e gerenciamento de calendários/eventos)</li>
        </ul>

        <h2>Como usamos seus dados</h2>
        <ul>
          <li>Para criar calendários e eventos conforme suas ações na interface;</li>
          <li>Para exibir QR Codes e status de conexão quando aplicável;</li>
          <li>Para registrar logs técnicos mínimos, com o objetivo de suporte e auditoria.</li>
        </ul>

        <h2>Compartilhamento</h2>
        <p>Não vendemos nem compartilhamos seus dados com terceiros para fins de marketing. O aplicativo pode compartilhar o calendário com uma conta operacional (por exemplo, <code>comercial.hitemp@gmail.com</code>) exclusivamente para permitir monitoramento e automações, conforme informado na interface. Você pode revogar esse compartilhamento no Google Calendar a qualquer momento.</p>

        <h2>Armazenamento e segurança</h2>
        <p>Tokens de acesso/atualização são armazenados com segurança e criptografados. Usamos HTTPS, controle de acesso e boas práticas de segurança para proteger seus dados.</p>

        <h2>Retenção e exclusão</h2>
        <p>Você pode solicitar a exclusão de seus dados e revogar o acesso do aplicativo em <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer">Google Account Permissions</a>.</p>

        <h2>Contato</h2>
        <p>Para dúvidas sobre privacidade, entre em contato: <a href="mailto:comercial.hitemp@gmail.com">comercial.hitemp@gmail.com</a>.</p>

        <div className="legal-footer">
          <p>Última atualização: 19 de dezembro de 2025</p>
        </div>
      </div>
    </div>
  );
}
