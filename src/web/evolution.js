import express from "express";
import axios from "axios";

const router = express.Router();

// POST /evolution/create-instance
// Cria instância no Evolution API e retorna QR Code
router.post("/create-instance", async (req, res) => {
  try {
    const { companyName } = req.body || {};
    
    if (!companyName) {
      return res.status(400).json({ 
        error: "companyName é obrigatório" 
      });
    }

    const evolutionApiUrl = process.env.EVOLUTION_API_URL;
    const evolutionApiKey = process.env.EVOLUTION_API_KEY;
    
    if (!evolutionApiUrl || !evolutionApiKey) {
      return res.status(500).json({ 
        error: "Evolution API não configurada. Configure EVOLUTION_API_URL e EVOLUTION_API_KEY no .env" 
      });
    }

    // Normalizar URL: remover /manager do final se existir
    const baseUrl = evolutionApiUrl.replace(/\/manager\/?$/, '');
    const instanceName = companyName;
    
    console.log(`[Evolution] Criando/conectando instância: ${instanceName}`);
    console.log(`[Evolution] URL original: ${evolutionApiUrl}`);
    console.log(`[Evolution] URL normalizada: ${baseUrl}`);

    let qrCodeData;
    
    // Criar ou reconectar instância
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

      console.log(`[Evolution] Resposta create:`, createResponse.data);
      
      // Se a resposta já contém o QR Code
      if (createResponse.data.qrcode?.base64 || createResponse.data.base64) {
        qrCodeData = createResponse.data;
        console.log(`[Evolution] QR Code obtido na criação`);
      } else {
        // Aguarda um pouco e busca via /instance/connect
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
        console.log(`[Evolution] QR Code obtido via connect`);
      }
      
    } catch (error) {
      // Se instância já existe (409), tenta apenas conectar
      if (error.response?.status === 409) {
        console.log(`[Evolution] Instância já existe, obtendo QR Code...`);
        
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
        console.log(`[Evolution] QR Code obtido de instância existente`);
      } else {
        console.error(`[Evolution] Erro:`, error.response?.data || error.message);
        throw new Error(`Falha ao criar/conectar instância: ${error.response?.data?.message || error.message}`);
      }
    }

    // Extrair QR Code da resposta
    const qrCodeUrl = qrCodeData.base64 || 
                      qrCodeData.qrcode?.base64 || 
                      qrCodeData.code || 
                      qrCodeData.qr ||
                      qrCodeData.pairingCode;

    if (!qrCodeUrl) {
      console.error('[Evolution] QR Code não encontrado na resposta:', qrCodeData);
      return res.status(500).json({ 
        error: "QR Code não foi gerado pela Evolution API",
        data: qrCodeData
      });
    }

    console.log(`[Evolution] QR Code gerado com sucesso para: ${instanceName}`);

    res.status(201).json({
      message: "Instância criada com sucesso",
      instanceName,
      qrCodeUrl: qrCodeUrl.startsWith('data:') ? qrCodeUrl : `data:image/png;base64,${qrCodeUrl}`,
      status: "connecting",
      evolution: qrCodeData
    });

  } catch (err) {
    console.error("[Evolution] Erro:", err.response?.data || err.message);
    const status = err.response?.status || 500;
    res.status(status).json({
      error: "Falha ao criar instância no Evolution API",
      details: err.response?.data || err.message
    });
  }
});

export default router;
