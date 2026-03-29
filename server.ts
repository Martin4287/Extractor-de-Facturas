import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import path from "path";
import crypto from "crypto";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API route to save invoice data
  app.post("/api/save-invoice", (req, res) => {
    console.log("Received POST request to /api/save-invoice");
    const data = req.body;
    data.id = crypto.randomUUID(); // Generate unique ID
    const filePath = path.join(process.cwd(), "data.json");
    console.log("Saving data to:", filePath);
    
    let existingData = [];
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, "utf-8");
      try {
        existingData = JSON.parse(fileContent);
      } catch (e) {
        console.error("Error parsing existing data:", e);
        existingData = [];
      }
    }
    
    existingData.push(data);
    fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2));
    console.log("Data saved successfully");
    
    res.json({ success: true, id: data.id });
  });

  // API route to get all invoices
  app.get("/api/invoices", (req, res) => {
    const filePath = path.join(process.cwd(), "data.json");
    if (!fs.existsSync(filePath)) {
      return res.json([]);
    }
    const fileContent = fs.readFileSync(filePath, "utf-8");
    try {
      res.json(JSON.parse(fileContent));
    } catch (e) {
      res.json([]);
    }
  });

  // API route to delete an invoice
  app.delete("/api/invoices/:id", (req, res) => {
    const { id } = req.params;
    const filePath = path.join(process.cwd(), "data.json");
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }
    let existingData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    existingData = existingData.filter((inv: any) => inv.id !== id);
    fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2));
    res.json({ success: true });
  });

  // API route to update an invoice
  app.put("/api/invoices/:id", (req, res) => {
    const { id } = req.params;
    const updatedData = req.body;
    const filePath = path.join(process.cwd(), "data.json");
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }
    let existingData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const index = existingData.findIndex((inv: any) => inv.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Invoice not found" });
    }
    existingData[index] = { ...existingData[index], ...updatedData, id };
    fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2));
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
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
