import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json({ limit: '10mb' }));

// API routes
app.post("/api/process-invoice", async (req, res) => {
  try {
    const { base64Data, mimeType } = req.body;
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY no está configurada en el servidor.');
    }
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const prompt = `
        Analiza la siguiente imagen o PDF de una factura/ticket y extrae la información clave.
        Devuelve ÚNICAMENTE un objeto JSON plano. NO incluyas explicaciones, ni texto adicional fuera del JSON.
        Si un dato no es legible o no existe, usa "N/A" para strings o 0 para números.
        
        Estructura JSON requerida:
        {
          "fecha": "DD/MM/AAAA",
          "proveedor": "string",
          "numero_factura": "string",
          "subtotal": number,
          "iva": number,
          "total": number,
          "total_sin_iva": number,
          "productos": [
            {
              "nombre": "string",
              "cantidad": number,
              "valor_unitario": number,
              "total_sin_iva": number
            }
          ]
        }
        
        IMPORTANTE:
        - Asegúrate de que los valores numéricos sean números reales (sin comillas).
        - Si no puedes calcular un valor, usa 0.
      `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-preview',
      contents: {
        parts: [
          { inlineData: { data: base64Data, mimeType: mimeType } },
          { text: prompt },
        ],
      },
    });

    if (!response.text) throw new Error('No se pudo extraer información.');

    const jsonResult = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
    res.json(JSON.parse(jsonResult));
  } catch (error) {
    console.error('Error processing invoice:', error);
    res.status(500).json({ error: 'Error al procesar la factura.' });
  }
});

// Production static file serving
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
} else {
  // Development Vite middleware
  import('vite').then(({ createServer }) => {
    createServer({
      server: { middlewareMode: true },
      appType: "spa",
    }).then(vite => {
      app.use(vite.middlewares);
    });
  });
}

// Start server
const PORT = 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
