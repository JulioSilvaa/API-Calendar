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

    if (password.length < 6) {
      return NextResponse.json(
        { error: "A senha deve ter pelo menos 6 caracteres" },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    
    try {
        // Check availability
        const checkRes = await client.query('SELECT id FROM users WHERE email = $1', [email]);
        if (checkRes.rows.length > 0) {
            return NextResponse.json(
                { error: "Este email já está cadastrado" },
                { status: 409 }
            );
        }

        // Hash password
        const saltRounds = 10;
        const hash = await bcrypt.hash(password, saltRounds);

        // Insert user
        const insertRes = await client.query(
            'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
            [email, hash]
        );
        const newUser = insertRes.rows[0];

        // Set session
        const cookieStore = await cookies();
        cookieStore.set("user_email", newUser.email, {
            httpOnly: true,
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * 7, // 1 week
            secure: process.env.NODE_ENV === "production",
        });

        return NextResponse.json({ 
            message: "Usuário registrado com sucesso",
            user: { email: newUser.email } 
        }, { status: 201 });

    } finally {
        client.release();
    }
  } catch (error) {
    console.error("Erro no registro:", error);
    return NextResponse.json(
      { error: "Erro interno ao registrar usuário" },
      { status: 500 }
    );
  }
}
