import { NextResponse } from "next/server";
import axios from "axios";

export async function POST(request) {
  try {
    const { companyName } = await request.json();
    
    if (!companyName) {
      return NextResponse.json({ 
        error: "companyName é obrigatório",
        connected: false 
      }, { status: 400 });
    }

    // Configurações da Evolution API
    const evolutionApiUrl = process.env.EVOLUTION_API_URL;
    const evolutionApiKey = process.env.EVOLUTION_API_KEY;
    
    if (!evolutionApiUrl || !evolutionApiKey) {
      console.log('⚠️ EVOLUTION_API_URL ou EVOLUTION_API_KEY não configurados');
      return NextResponse.json({ connected: false });
    }

    // Consultar status da instância na Evolution API
    const instanceName = companyName; // ou use alguma transformação se necessário
    
    const response = await axios.get(
      `${evolutionApiUrl}/instance/connectionState/${instanceName}`,
      { 
        headers: { 
          "apikey": evolutionApiKey,
          "Content-Type": "application/json"
        },
        timeout: 5000 
      }
    );

    // Evolution API retorna: { state: "open" | "close" | "connecting" }
    const state = response.data?.state || response.data?.instance?.state;
    const connected = state === "open";
    
    return NextResponse.json({ 
      connected,
      status: state,
      instanceName,
      data: response.data 
    });
  } catch (err) {
    // Em caso de erro, assume que não está conectado
    console.error("❌ Erro ao verificar conexão:", err.message);
    return NextResponse.json({ connected: false, error: err.message });
  }
}
