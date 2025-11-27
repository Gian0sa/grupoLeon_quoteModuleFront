import { useState } from "react";

// ===== MOCK DEL BACKEND =====
// Simula las respuestas del backend para probar la vista
async function mockBuscarCliente(query) {
  // Simular 1s de carga
  await new Promise((r) => setTimeout(r, 800));

  if (query.toLowerCase() === "cliente1") {
    return {
      access: "full",
      client: {
        code: "C001",
        name: "Ferretería López"
      },
      historico: [
        { id: 1, item: "Tornillo", qty: 50, fecha: "2025-10-20" },
        { id: 2, item: "Clavo", qty: 100, fecha: "2025-11-10" }
      ],
      stock: [
        { item: "Tornillo", stock: 200, precio: 1.5 },
        { item: "Clavo", stock: 600, precio: 0.8 }
      ],
      importaciones: [
        { item: "Tornillo", qty: 5000, llega: "2025-12-15" }
      ]
    };
  }

  return {
    access: "limited",
    client: {
      code: "X999",
      name: "Cliente AJENO S.A.",
      owner: "VENDEDOR_03"
    }
  };
}

// ===== COMPONENTE PRINCIPAL =====
export default function ClienteInfo() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("historico");

  const buscar = async () => {
    setLoading(true);
    const resp = await mockBuscarCliente(input);
    setData(resp);
    setLoading(false);
    setTab("historico"); // resetear tab
  };

  return (
    <div style={{ padding: "20px", maxWidth: 800, margin: "auto" }}>
      <h1>Buscar Cliente</h1>

      {/* Input */}
      <div style={{ display: "flex", gap: "10px", marginTop: 20 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Código, nombre…"
          style={{ flex: 1, padding: 8 }}
        />
        <button onClick={buscar} disabled={loading}>
          {loading ? "Buscando..." : "Buscar"}
        </button>
      </div>

      {/* Si no hay data aún */}
      {!data && <p style={{ marginTop: 20 }}>Ingresa algo y busca…</p>}

      {/* ==== CLIENTE ENCONTRADO ==== */}
      {data && (
        <div style={{ marginTop: 30 }}>
          <h2>
            {data.client.name} ({data.client.code})
          </h2>

          {/* ACCESO LIMITADO */}
          {data.access === "limited" && (
            <div
              style={{
                marginTop: 20,
                padding: 15,
                border: "1px solid #ccc",
                borderRadius: 8,
                background: "#f8f8f8"
              }}
            >
              <p>
                Este cliente pertenece a: <b>{data.client.owner}</b>
              </p>
              <p>No puedes ver histórico, stock ni importaciones.</p>
            </div>
          )}

          {/* ACCESO FULL */}
          {data.access === "full" && (
            <>
              {/* Tabs */}
              <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
                <button
                  onClick={() => setTab("historico")}
                  style={{
                    padding: 8,
                    borderBottom: tab === "historico" ? "3px solid blue" : "none"
                  }}
                >
                  Histórico
                </button>

                <button
                  onClick={() => setTab("stock")}
                  style={{
                    padding: 8,
                    borderBottom: tab === "stock" ? "3px solid blue" : "none"
                  }}
                >
                  Stock
                </button>

                <button
                  onClick={() => setTab("importaciones")}
                  style={{
                    padding: 8,
                    borderBottom: tab === "importaciones" ? "3px solid blue" : "none"
                  }}
                >
                  Importaciones
                </button>
              </div>

              {/* Contenido de tabs */}
              <div style={{ marginTop: 20 }}>
                {/* HISTORICO */}
                {tab === "historico" && (
                  <table width="100%" border="1" cellPadding="8">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Cantidad</th>
                        <th>Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.historico.map((h) => (
                        <tr key={h.id}>
                          <td>{h.item}</td>
                          <td>{h.qty}</td>
                          <td>{h.fecha}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* STOCK */}
                {tab === "stock" && (
                  <table width="100%" border="1" cellPadding="8">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Stock</th>
                        <th>Precio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.stock.map((s, i) => (
                        <tr key={i}>
                          <td>{s.item}</td>
                          <td>{s.stock}</td>
                          <td>S/ {s.precio}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* IMPORTACIONES */}
                {tab === "importaciones" && (
                  <table width="100%" border="1" cellPadding="8">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Cantidad</th>
                        <th>Llega</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.importaciones.map((f, i) => (
                        <tr key={i}>
                          <td>{f.item}</td>
                          <td>{f.qty}</td>
                          <td>{f.llega}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
