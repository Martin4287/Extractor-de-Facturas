import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API routes
  app.post("/api/process-invoice", async (req, res) => {
    try {
      const { base64Data, mimeType } = req.body;
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      
      const prompt = `
        Analiza la siguiente imagen o PDF de una factura/ticket y extrae la información clave.
        Devuelve ÚNICAMENTE un objeto JSON plano. Si un dato no es legible o no existe, usa "N/A".
        Campos requeridos: fecha (DD/MM/AAAA), proveedor, numero_factura, subtotal (número), iva (número), total (número), total_sin_iva (número), productos (array de objetos: { nombre, cantidad, valor_unitario, total_sin_iva }).
        
        IMPORTANTE:
        - Devuelve los campos numéricos estrictamente como números (sin comillas ni formato de moneda).
        - Si hay descuentos, trátalos como valores negativos en el campo 'total_sin_iva' del producto correspondiente o como un producto con nombre "Descuento" y valor negativo.
        - El campo 'total_sin_iva' de la factura debe ser la suma de los 'total_sin_iva' de los productos.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { inlineData: { data: base64Data, mimeType: mimeType } },
            { text: prompt },
          ],
        },
      });

      if (response.text) {
        const jsonResult = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
        res.json(JSON.parse(jsonResult));
      } else {
        res.status(500).json({ error: 'No se pudo extraer información.' });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al procesar la factura.' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
