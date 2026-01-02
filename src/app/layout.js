import "./globals.css";

export const metadata = {
  title: "Cadastro - Agenda de Clientes",
  description: "Sistema de cadastro para agenda de clientes",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-br">
      <body>{children}</body>
    </html>
  );
}
