/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Upload, FileText, Loader2, LayoutDashboard, Database } from 'lucide-react';

interface Product {
  nombre: string;
  cantidad: number;
  valor_unitario: number;
  total_sin_iva: number;
}

interface Invoice {
  id: string;
  fecha: string;
  proveedor: string;
  numero_factura: string;
  concepto: string;
  cantidad: string;
  subtotal: number;
  iva: number;
  total: number;
  total_sin_iva: number;
  productos: Product[];
}

function Dashboard() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, invoice: Invoice } | null>(null);

  useEffect(() => {
    fetch(`${process.env.APP_URL}/api/invoices`)
      .then(res => res.json())
      .then(data => {
        setInvoices(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching invoices:', err);
        setLoading(false);
      });
  }, []);

  const deleteInvoice = async (id: string) => {
    await fetch(`${process.env.APP_URL}/api/invoices/${id}`, { method: 'DELETE' });
    setInvoices(invoices.filter(inv => inv.id !== id));
    setContextMenu(null);
  };

  const editInvoice = (invoice: Invoice) => {
    alert('Edit functionality not yet implemented');
    setContextMenu(null);
  };

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {invoices.map((inv) => (
          <div 
            key={inv.id} 
            className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer border border-gray-200"
            onClick={() => setSelectedInvoice(inv)}
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenu({ x: e.clientX, y: e.clientY, invoice: inv });
            }}
          >
            <h3 className="font-bold text-lg mb-1">{inv.proveedor}</h3>
            <p className="text-sm text-gray-600 mb-2">{inv.fecha}</p>
            <p className="text-xl font-semibold text-blue-600">${!isNaN(Number(inv.total_sin_iva)) ? Number(inv.total_sin_iva).toFixed(2) : "0.00"}</p>
          </div>
        ))}
      </div>

      {contextMenu && (
        <div 
          className="fixed bg-white shadow-xl rounded-lg border border-gray-200 z-50 py-2"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button onClick={() => editInvoice(contextMenu.invoice)} className="block w-full text-left px-4 py-2 hover:bg-gray-100">Editar</button>
          <button onClick={() => deleteInvoice(contextMenu.invoice.id)} className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600">Eliminar</button>
        </div>
      )}

      {selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">{selectedInvoice.proveedor}</h2>
              <button onClick={() => setSelectedInvoice(null)} className="text-gray-500 hover:text-gray-700">Cerrar</button>
            </div>
            <p className="text-sm text-gray-600 mb-4">{selectedInvoice.fecha} - Factura: {selectedInvoice.numero_factura}</p>
            
            <h3 className="font-semibold mb-2">Productos:</h3>
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                <tr>
                  <th className="px-2 py-2">Nombre</th>
                  <th className="px-2 py-2">Cant</th>
                  <th className="px-2 py-2">Precio Unit</th>
                  <th className="px-2 py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {selectedInvoice.productos?.map((prod, j) => (
                  <tr key={j} className="border-b">
                    <td className="px-2 py-2">{prod.nombre}</td>
                    <td className="px-2 py-2">{prod.cantidad}</td>
                    <td className="px-2 py-2">${Number(prod.valor_unitario || 0).toFixed(2)}</td>
                    <td className="px-2 py-2">${Number(prod.total_sin_iva || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 text-right font-bold">
              {(() => {
                const calculatedSum = selectedInvoice.productos?.reduce((sum, prod) => sum + (Number(prod.total_sin_iva) || 0), 0) || 0;
                const isMatch = Math.abs(calculatedSum - (Number(selectedInvoice.total_sin_iva) || 0)) < 0.01;
                return (
                  <div className={isMatch ? "text-green-600" : "text-red-600"}>
                    Total sin IVA: ${Number(selectedInvoice.total_sin_iva || 0).toFixed(2)}
                    {!isMatch && <p className="text-xs">Advertencia: La suma de productos (${calculatedSum.toFixed(2)}) no coincide con el total sin IVA.</p>}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<'extractor' | 'dashboard'>('extractor');
  const [files, setFiles] = useState<File[]>([]);
  const [processedInvoices, setProcessedInvoices] = useState<Invoice[]>([]);
  const [filterProveedor, setFilterProveedor] = useState('');
  const [filterFecha, setFilterFecha] = useState('');
  const [selectedInvoiceDetails, setSelectedInvoiceDetails] = useState<Invoice | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, invoice: Invoice } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const MAX_FILES = 5;

  useEffect(() => {
    if (view === 'extractor') {
      fetch(`${process.env.APP_URL}/api/invoices`)
        .then(res => res.json())
        .then(data => setProcessedInvoices(data))
        .catch(err => console.error('Error fetching invoices:', err));
    }
  }, [view]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading && startTime) {
      interval = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    } else {
      setElapsed(0);
    }
    return () => clearInterval(interval);
  }, [loading, startTime]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const selectedFiles = Array.from(event.target.files).slice(0, MAX_FILES);
      setFiles(selectedFiles);
      setError(null);
    }
  };

  const processSingleFile = async (file: File): Promise<Invoice | null> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        try {
          const base64Data = (reader.result as string).split(',')[1];
          const ai = new GoogleGenAI({ apiKey: window.aistudio.getApiKey() });
          
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
                { inlineData: { data: base64Data, mimeType: file.type } },
                { text: prompt },
              ],
            },
          });

          if (response.text) {
            const jsonResult = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsedData = JSON.parse(jsonResult);
            
            const responseSave = await fetch(`${process.env.APP_URL}/api/save-invoice`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(parsedData),
            });
            const savedInvoice = await responseSave.json();
            resolve(savedInvoice);
          } else {
            reject(new Error('No se pudo extraer información.'));
          }
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
    });
  };

  const processFiles = async () => {
    if (files.length === 0) return;
    setLoading(true);
    setStartTime(Date.now());
    setError(null);

    try {
      const results = await Promise.all(files.map(file => processSingleFile(file)));
      setProcessedInvoices(prev => [...prev, ...results.filter((res): res is Invoice => res !== null)]);
      setFiles([]);
    } catch (err) {
      setError('Error al procesar archivos: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
      setStartTime(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm p-4 flex gap-4">
        <button onClick={() => setView('extractor')} className={`flex items-center gap-2 px-4 py-2 rounded ${view === 'extractor' ? 'bg-blue-100 text-blue-700' : 'text-gray-600'}`}>
          <FileText size={20} /> Extractor
        </button>
        <button onClick={() => setView('dashboard')} className={`flex items-center gap-2 px-4 py-2 rounded ${view === 'dashboard' ? 'bg-blue-100 text-blue-700' : 'text-gray-600'}`}>
          <LayoutDashboard size={20} /> Dashboard Contable
        </button>
      </nav>

      <main className="p-8">
        <div className="max-w-5xl mx-auto bg-white p-6 rounded-lg shadow-md">
          {view === 'extractor' ? (
            <>
              <h1 className="text-2xl font-bold mb-4">Invoice Data Extractor</h1>
              <p className="text-gray-600 mb-6">Sube una factura o ticket para extraer los datos.</p>
              
              <div className="flex items-center gap-4 mb-6">
                <input type="file" onChange={handleFileChange} className="hidden" id="file-upload" accept="image/*,application/pdf" multiple />
                <label htmlFor="file-upload" className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700">
                  <Upload size={20} /> Seleccionar archivos ({files.length}/{MAX_FILES})
                </label>
                <button 
                  onClick={processFiles} 
                  disabled={files.length === 0 || loading}
                  className={`
                    px-6 py-2.5 rounded-xl font-semibold text-white transition-all duration-200
                    flex items-center justify-center gap-2
                    ${loading 
                      ? 'bg-slate-500 cursor-not-allowed shadow-inner scale-[0.98]' 
                      : 'bg-green-600 hover:bg-green-700 shadow-md hover:shadow-lg active:shadow-inner active:scale-[0.97]'
                    }
                  `}
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      Procesando...
                    </>
                  ) : (
                    'Procesar Facturas'
                  )}
                </button>
                {loading && startTime !== null && <span className="text-sm text-gray-500 font-mono">Procesando... {elapsed}s</span>}
              </div>

              {error && <div className="text-red-600 mb-4">{error}</div>}
              
              {processedInvoices.length > 0 && (
                <div className="mt-6 border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Facturas Procesadas</h3>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Filtrar proveedor..." 
                        className="text-sm border border-gray-300 rounded px-2 py-1"
                        value={filterProveedor}
                        onChange={(e) => setFilterProveedor(e.target.value)}
                      />
                      <input 
                        type="text" 
                        placeholder="Filtrar fecha (DD/MM/AAAA)..." 
                        className="text-sm border border-gray-300 rounded px-2 py-1"
                        value={filterFecha}
                        onChange={(e) => setFilterFecha(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-gray-500 uppercase bg-gray-100">
                        <tr>
                          <th className="px-4 py-3 font-medium">Fecha</th>
                          <th className="px-4 py-3 font-medium">Proveedor</th>
                          <th className="px-4 py-3 font-medium">Nº Factura</th>
                          <th className="px-4 py-3 font-medium text-right">Subtotal</th>
                          <th className="px-4 py-3 font-medium text-right">IVA</th>
                          <th className="px-4 py-3 font-medium text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {processedInvoices
                          .filter(inv => 
                            (filterProveedor === '' || inv.proveedor?.toLowerCase().includes(filterProveedor.toLowerCase())) &&
                            (filterFecha === '' || inv.fecha?.includes(filterFecha))
                          )
                          .map((inv) => (
                          <tr 
                            key={inv.id} 
                            className="hover:bg-gray-50 cursor-pointer" 
                            onClick={() => setSelectedInvoiceDetails(inv)}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              setContextMenu({ x: e.clientX, y: e.clientY, invoice: inv });
                            }}
                          >
                            <td className="px-4 py-3 font-mono text-gray-900">{inv.fecha || 'N/A'}</td>
                            <td className="px-4 py-3 font-medium text-gray-900">{inv.proveedor || 'N/A'}</td>
                            <td className="px-4 py-3 font-mono text-gray-600">{inv.numero_factura || 'N/A'}</td>
                            <td className="px-4 py-3 text-right font-mono text-gray-900">
                              {(() => {
                                const val = parseFloat(inv.subtotal as any);
                                return !isNaN(val) ? val.toFixed(2) : 'N/A';
                              })()}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-gray-900">
                              {(() => {
                                const val = parseFloat(inv.iva as any);
                                return !isNaN(val) ? val.toFixed(2) : 'N/A';
                              })()}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-blue-700">
                              {(() => {
                                const val = parseFloat(inv.total as any);
                                return !isNaN(val) ? val.toFixed(2) : 'N/A';
                              })()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {contextMenu && (
                <div 
                  className="fixed bg-white shadow-xl rounded-lg border border-gray-200 z-50 py-2"
                  style={{ top: contextMenu.y, left: contextMenu.x }}
                >
                  <button 
                    onClick={async () => {
                      await deleteDoc(doc(db, 'invoices', contextMenu.invoice.id));
                      setProcessedInvoices(prev => prev.filter(inv => inv.id !== contextMenu.invoice.id));
                      setContextMenu(null);
                    }} 
                    className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600"
                  >
                    Eliminar
                  </button>
                </div>
              )}

              {selectedInvoiceDetails && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                  <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-2xl font-bold">{selectedInvoiceDetails.proveedor}</h2>
                      <button onClick={() => setSelectedInvoiceDetails(null)} className="text-gray-500 hover:text-gray-700">Cerrar</button>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">{selectedInvoiceDetails.fecha} - Factura: {selectedInvoiceDetails.numero_factura}</p>
                    
                    <h3 className="font-semibold mb-2">Productos:</h3>
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                        <tr>
                          <th className="px-2 py-2">Nombre</th>
                          <th className="px-2 py-2">Cant</th>
                          <th className="px-2 py-2">Precio Unit</th>
                          <th className="px-2 py-2">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedInvoiceDetails.productos?.map((prod, j) => (
                          <tr key={j} className="border-b">
                            <td className="px-2 py-2">{prod.nombre}</td>
                            <td className="px-2 py-2">{prod.cantidad}</td>
                            <td className="px-2 py-2">${Number(prod.valor_unitario || 0).toFixed(2)}</td>
                            <td className="px-2 py-2">${Number(prod.total_sin_iva || 0).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold mb-6">Dashboard Contable</h1>
              <Dashboard />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
