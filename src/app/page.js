import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import RegistrationForm from "./components/RegistrationForm";

export const metadata = {
  title: "Cadastro - Agenda de Clientes",
  description: "Sistema de cadastro para agenda de clientes",
};

export default async function Page() {
  const cookieStore = await cookies();
  const userEmail = cookieStore.get("user_email")?.value || null;

  if (!userEmail) {
    redirect("/login");
  }

  return (
    <RegistrationForm initialUserEmail={userEmail} />
  );
}
