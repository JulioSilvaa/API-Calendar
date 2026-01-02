import { NextResponse } from "next/server";
import axios from "axios";

export async function POST(request) {
  try {
    const body = await request.json();
    const { companyName } = body || {};
    
    if (!companyName) {
      return NextResponse.json({ error: "companyName é obrigatório" }, { status: 400 });
    }

    const evolutionApiUrl = process.env.EVOLUTION_API_URL;
    const evolutionApiKey = process.env.EVOLUTION_API_KEY;
    
    if (!evolutionApiUrl || !evolutionApiKey) {
      return NextResponse.json({ error: "Evolution API não configurada. Configure EVOLUTION_API_URL e EVOLUTION_API_KEY no .env" }, { status: 500 });
    }

    const instanceName = companyName;
    let qrCodeData;
    
    try {
      const createResponse = await axios.post(
        `${evolutionApiUrl}/instance/create`,
        {
          instanceName: instanceName,
          qrcode: true,
          integration: "WHATSAPP-BAILEYS"
        },
        {
          headers: {
            "apikey": evolutionApiKey,
            "Content-Type": "application/json"
          },
          timeout: 15000
        }
      );
      
      if (createResponse.data.qrcode?.base64 || createResponse.data.base64) {
        qrCodeData = createResponse.data;
      } else {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const connectResponse = await axios.get(
          `${evolutionApiUrl}/instance/connect/${instanceName}`,
          {
            headers: {
              "apikey": evolutionApiKey
            },
            timeout: 10000
          }
        );
        
        qrCodeData = connectResponse.data;
      }
      
    } catch (error) {
      // Se instância já existe (409), tenta apenas conectar
      const isAlreadyExists = error.response?.status === 409 || 
                             (error.response?.status === 403 && 
                              JSON.stringify(error.response?.data).includes('already in use'));
                              
      if (isAlreadyExists) {
        const connectResponse = await axios.get(
          `${evolutionApiUrl}/instance/connect/${instanceName}`,
          {
            headers: {
              "apikey": evolutionApiKey
            },
            timeout: 10000
          }
        );
        
        qrCodeData = connectResponse.data;
      } else {
        console.error(`[Evolution] Erro:`, error.response?.data || error.message);
        throw new Error(`Falha ao criar/conectar instância: ${error.response?.data?.message || error.message}`);
      }
    }

    const qrCodeUrl = qrCodeData.base64 || 
                      qrCodeData.qrcode?.base64 || 
                      qrCodeData.code || 
                      qrCodeData.qr || 
                      qrCodeData.pairingCode;

    if (!qrCodeUrl) {
      console.error('[Evolution] QR Code não encontrado na resposta:', qrCodeData);
      return NextResponse.json({ 
        error: "QR Code não foi gerado pela Evolution API",
        data: qrCodeData
      }, { status: 500 });
    }

    return NextResponse.json({
      message: "Instância criada com sucesso",
      instanceName,
      qrCodeUrl: qrCodeUrl.startsWith('data:') ? qrCodeUrl : `data:image/png;base64,${qrCodeUrl}`,
      status: "connecting",
      evolution: qrCodeData
    }, { status: 201 });

  } catch (err) {
    console.error("[Evolution] Erro:", err.response?.data || err.message);
    const status = err.response?.status || 500;
    return NextResponse.json({
      error: "Falha ao criar instância no Evolution API",
      details: err.response?.data || err.message
    }, { status });
  }
}
