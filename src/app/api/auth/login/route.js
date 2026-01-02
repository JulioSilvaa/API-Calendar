import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcrypt";
import pool from "../../../../utils/db";

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email e senha são obrigatórios" },
        { status: 400 }
      );
    }

    const client = await pool.connect();

    try {
        const res = await client.query('SELECT * FROM users WHERE email = $1', [email]);
        
        if (res.rows.length === 0) {
             return NextResponse.json(
                { error: "Credenciais inválidas" },
                { status: 401 }
            );
        }

        const user = res.rows[0];
        const match = await bcrypt.compare(password, user.password_hash);

        if (!match) {
             return NextResponse.json(
                { error: "Credenciais inválidas" },
                { status: 401 }
            );
        }

        // Set session
        const cookieStore = await cookies();
        cookieStore.set("user_email", user.email, {
            httpOnly: true,
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * 7, // 1 week
            secure: process.env.NODE_ENV === "production",
        });

        return NextResponse.json({ 
            message: "Login realizado com sucesso",
            user: { email: user.email }
        });

    } finally {
        client.release();
    }

  } catch (error) {
    console.error("Erro no login:", error);
    return NextResponse.json(
      { error: "Erro interno no login" },
      { status: 500 }
    );
  }
}
