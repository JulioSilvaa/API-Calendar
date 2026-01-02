import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import pool from "../../../../utils/db";

export async function POST(request) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json({ error: "Token e senha são obrigatórios" }, { status: 400 });
    }

    if (password.length < 6) {
        return NextResponse.json({ error: "A senha deve ter pelo menos 6 caracteres" }, { status: 400 });
    }

    const client = await pool.connect();
    
    try {
        // 1. Verify token
        const tokenRes = await client.query(
            'SELECT email, expires_at FROM password_reset_tokens WHERE token = $1', 
            [token]
        );

        if (tokenRes.rows.length === 0) {
            return NextResponse.json({ error: "Token inválido ou expirado" }, { status: 400 });
        }

        const { email, expires_at } = tokenRes.rows[0];

        if (new Date() > new Date(expires_at)) {
             // Clean up expired token
             await client.query('DELETE FROM password_reset_tokens WHERE token = $1', [token]);
             return NextResponse.json({ error: "Token expirado" }, { status: 400 });
        }

        // 2. Hash new password
        const saltRounds = 10;
        const hash = await bcrypt.hash(password, saltRounds);

        // 3. Update user password
        await client.query(
            'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2',
            [hash, email]
        );

        // 4. Delete tokens for this user (security: verify email)
        await client.query('DELETE FROM password_reset_tokens WHERE email = $1', [email]);

        return NextResponse.json({ message: "Senha atualizada com sucesso" });

    } finally {
        client.release();
    }

  } catch (error) {
    console.error("Reset Password Error:", error);
    return NextResponse.json({ error: "Erro ao redefinir senha" }, { status: 500 });
  }
}
