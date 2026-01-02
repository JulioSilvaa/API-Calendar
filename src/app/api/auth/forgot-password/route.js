import { NextResponse } from "next/server";
import crypto from "crypto";
import pool from "../../../../utils/db";
import { sendEmail } from "../../../../utils/mailer";

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email é obrigatório" }, { status: 400 });
    }

    const client = await pool.connect();
    
    try {
        // 1. Check if user exists
        const userRes = await client.query('SELECT id FROM users WHERE email = $1', [email]);
        if (userRes.rows.length === 0) {
            // Security: Don't reveal if user exists. Just return success.
            return NextResponse.json({ message: "Se o email estiver cadastrado, você receberá um link." });
        }

        // 2. Generate token
        const token = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 3600000); // 1 hour

        // 3. Save token
        await client.query(
            'INSERT INTO password_reset_tokens (email, token, expires_at) VALUES ($1, $2, $3)',
            [email, token, expiresAt]
        );

        // 4. Send Email
        const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
        const resetLink = `${baseUrl}/reset-password?token=${token}`;

        const html = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Recuperação de Senha</h2>
                <p>Você solicitou a redefinição de senha para sua conta.</p>
                <p>Clique no botão abaixo para criar uma nova senha:</p>
                <a href="${resetLink}" style="display: inline-block; background-color: #1a73e8; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin: 20px 0;">Redefinir Senha</a>
                <p>Ou copie e cole este link no seu navegador:</p>
                <p>${resetLink}</p>
                <p>Este link é válido por 1 hora.</p>
                <hr />
                <p style="font-size: 12px; color: #666;">Se você não solicitou isso, ignore este email.</p>
            </div>
        `;

        await sendEmail(email, "Redefinição de Senha - API Calendar", html);

        return NextResponse.json({ message: "Se o email estiver cadastrado, você receberá um link." });

    } finally {
        client.release();
    }

  } catch (error) {
    console.error("Forgot Password Error:", error);
    return NextResponse.json({ error: "Erro ao processar solicitação" }, { status: 500 });
  }
}
