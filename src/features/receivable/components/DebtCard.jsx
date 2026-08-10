import { generateReceivablePDF } from "../utils/receivablePDF";
import {
  Building2,
  FileText,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  User,
  ArrowRight,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";

export function DebtCard({ debt, onViewInvoices }) {
  // Soporte para ambas monedas separadas (saldoPEN/saldoUSD) y el modo legado (saldoPrincipal)
  const saldoPEN = debt.saldoPEN ?? (debt.monedaPrincipal === "PEN" ? debt.saldoPrincipal : 0) ?? 0;
  const saldoUSD = debt.saldoUSD ?? (debt.monedaPrincipal === "USD" ? debt.saldoPrincipal : 0) ?? 0;

  const saldoVencidoPEN = debt.saldoVencidoPEN ?? 0;
  const saldoVencidoUSD = debt.saldoVencidoUSD ?? 0;

  const formatAmount = (amount, currency) => {
    if (amount == null || isNaN(Number(amount))) return null;
    const num = Number(amount);
    const symbol = currency === "USD" ? "$" : "S/";
    return `${symbol} ${Math.abs(num).toLocaleString("es-PE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Determinar tipo de estado
  const getStatusType = () => {
    if (debt.tipoDocumento === "Nota de Crédito" || saldoPEN < 0 || saldoUSD < 0) return "credit";
    if (debt.documentosVencidos > 0 || debt.estado === "vencido" || debt.estado === "parcialmente_vencido") return "overdue";
    return "active";
  };

  const statusType = getStatusType();

  // Temas visuales de alta fidelidad
  const theme = {
    overdue: {
      accentColor: "#dc2626",
      topBar: "linear-gradient(90deg, #dc2626 0%, #ef4444 100%)",
      avatarBg: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
      cardBorder: "1px solid #fecaca",
      amountColor: "#b91c1c",
      bgHoverShadow: "0 14px 30px rgba(220, 38, 38, 0.12)",
      primaryBtnBg: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
      primaryBtnHover: "#991b1b",
      badgeBg: "#fee2e2",
      badgeText: "#991b1b",
    },
    active: {
      accentColor: "#059669",
      topBar: "linear-gradient(90deg, #059669 0%, #10b981 100%)",
      avatarBg: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
      cardBorder: "1px solid #a7f3d0",
      amountColor: "#047857",
      bgHoverShadow: "0 14px 30px rgba(5, 150, 105, 0.12)",
      primaryBtnBg: "linear-gradient(135deg, #059669 0%, #047857 100%)",
      primaryBtnHover: "#065f46",
      badgeBg: "#d1fae5",
      badgeText: "#065f46",
    },
    credit: {
      accentColor: "#2563eb",
      topBar: "linear-gradient(90deg, #2563eb 0%, #3b82f6 100%)",
      avatarBg: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
      cardBorder: "1px solid #bfdbfe",
      amountColor: "#1d4ed8",
      bgHoverShadow: "0 14px 30px rgba(37, 99, 235, 0.12)",
      primaryBtnBg: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
      primaryBtnHover: "#1e40af",
      badgeBg: "#dbeafe",
      badgeText: "#1e40af",
    },
  }[statusType];

  // Configuración de la insignia de mora / días
  const getAgingBadge = () => {
    const days = debt.maxOverdueDays || 0;
    if (statusType === "credit") {
      return {
        text: "Saldo a Favor / Nota de Crédito",
        bg: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
        color: "#ffffff",
        icon: FileText,
      };
    }
    if (days > 0) {
      let bg = "linear-gradient(135deg, #ca8a04 0%, #a16207 100%)";
      if (days > 90) bg = "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)";
      else if (days > 30) bg = "linear-gradient(135deg, #ea580c 0%, #c2410c 100%)";

      return {
        text: `⏱️ ${days} DÍAS DE MORA ${debt.oldestDueDate ? `• Venció: ${debt.oldestDueDate}` : ""}`,
        bg,
        color: "#ffffff",
        icon: ShieldAlert,
      };
    }
    return {
      text: debt.oldestDueDate ? `📅 Próximo vencimiento: ${debt.oldestDueDate}` : "✅ Al día (Sin moras)",
      bg: "linear-gradient(135deg, #059669 0%, #047857 100%)",
      color: "#ffffff",
      icon: CheckCircle2,
    };
  };

  const agingBadge = getAgingBadge();

  return (
    <div
      style={{
        position: "relative",
        background: "#ffffff",
        borderRadius: "20px",
        border: "1px solid #e2e8f0",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.04)",
        overflow: "hidden",
        transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        marginBottom: "16px",
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow = theme.bgHoverShadow;
        e.currentTarget.style.borderColor = theme.accentColor;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 4px 20px rgba(0, 0, 0, 0.04)";
        e.currentTarget.style.borderColor = "#e2e8f0";
      }}
    >
      {/* Barra superior de acento visual */}
      <div
        style={{
          height: "5px",
          background: theme.topBar,
          width: "100%",
        }}
      />

      <div style={{ padding: "20px 22px" }}>
        {/* Cabecera del Cliente */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "14px",
            marginBottom: "16px",
          }}
        >
          {/* Avatar / Inicial de Empresa */}
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "14px",
              background: theme.avatarBg,
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow: "0 4px 10px rgba(0,0,0,0.12)",
            }}
          >
            <Building2 size={22} color="#ffffff" />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Nombre del Cliente */}
            <h3
              style={{
                margin: 0,
                fontSize: "16px",
                fontWeight: "800",
                color: "#1e293b",
                lineHeight: "1.25",
                marginBottom: "6px",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
              title={debt.nombre}
            >
              {debt.nombre}
            </h3>

            {/* RUC y Vendedor */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                flexWrap: "wrap",
                fontSize: "12.5px",
                color: "#64748b",
                fontWeight: "500",
              }}
            >
              <span
                style={{
                  background: "#f8fafc",
                  padding: "3px 9px",
                  borderRadius: "6px",
                  border: "1px solid #e2e8f0",
                  fontWeight: "600",
                  color: "#334155",
                }}
              >
                RUC / DNI: <strong>{debt.ruc}</strong>
              </span>

              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  background: "#f1f5f9",
                  padding: "3px 9px",
                  borderRadius: "6px",
                  fontWeight: "600",
                  color: "#475569",
                }}
              >
                <User size={12} /> {debt.vendedor}
              </span>
            </div>
          </div>
        </div>

        {/* Rejilla Estadística Financiera (Monto Pendiente vs Vencido) */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
            background: "#f8fafc",
            borderRadius: "14px",
            padding: "14px 16px",
            border: "1px solid #e2e8f0",
            marginBottom: "16px",
          }}
        >
          {/* Columna 1: Pendiente Total */}
          <div>
            <div
              style={{
                fontSize: "11.5px",
                fontWeight: "700",
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "0.4px",
                marginBottom: "4px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <FileText size={13} color="#64748b" />
              <span>
                {statusType === "credit" ? "Saldo a Favor:" : "Monto Pendiente:"}
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              {saldoPEN !== 0 && (
                <span
                  style={{
                    fontSize: "16px",
                    fontWeight: "800",
                    color: statusType === "credit" ? "#1d4ed8" : "#1e293b",
                  }}
                >
                  {formatAmount(saldoPEN, "PEN")}
                </span>
              )}
              {saldoUSD !== 0 && (
                <span
                  style={{
                    fontSize: "16px",
                    fontWeight: "800",
                    color: statusType === "credit" ? "#1d4ed8" : "#1e293b",
                  }}
                >
                  {formatAmount(saldoUSD, "USD")}
                </span>
              )}
              {saldoPEN === 0 && saldoUSD === 0 && (
                <span style={{ fontSize: "15px", fontWeight: "700", color: "#94a3b8" }}>
                  S/ 0.00
                </span>
              )}
            </div>

            <div
              style={{
                fontSize: "11px",
                fontWeight: "600",
                color: "#64748b",
                marginTop: "4px",
              }}
            >
              {debt.totalDocumentos} {debt.totalDocumentos === 1 ? "documento" : "documentos"}
            </div>
          </div>

          {/* Columna 2: Vencido Real */}
          <div
            style={{
              borderLeft: "1px solid #cbd5e1",
              paddingLeft: "14px",
            }}
          >
            <div
              style={{
                fontSize: "11.5px",
                fontWeight: "700",
                color: debt.documentosVencidos > 0 ? "#dc2626" : "#059669",
                textTransform: "uppercase",
                letterSpacing: "0.4px",
                marginBottom: "4px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <AlertCircle size={13} color={debt.documentosVencidos > 0 ? "#dc2626" : "#059669"} />
              <span>
                {debt.documentosVencidos > 0
                  ? `${debt.documentosVencidos} Vencido(s)`
                  : "Monto Vencido:"}
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              {saldoVencidoPEN !== 0 && (
                <span style={{ fontSize: "16px", fontWeight: "800", color: "#dc2626" }}>
                  {formatAmount(saldoVencidoPEN, "PEN")}
                </span>
              )}
              {saldoVencidoUSD !== 0 && (
                <span style={{ fontSize: "16px", fontWeight: "800", color: "#dc2626" }}>
                  {formatAmount(saldoVencidoUSD, "USD")}
                </span>
              )}
              {saldoVencidoPEN === 0 && saldoVencidoUSD === 0 && (
                <span style={{ fontSize: "15px", fontWeight: "800", color: "#059669" }}>
                  $ 0.00
                </span>
              )}
            </div>

            <div
              style={{
                fontSize: "11px",
                fontWeight: "600",
                color: debt.documentosVencidos > 0 ? "#b91c1c" : "#047857",
                marginTop: "4px",
              }}
            >
              {debt.documentosVencidos === 0
                ? "Al día"
                : `${debt.documentosVencidos} vencido(s)`}
            </div>
          </div>
        </div>

        {/* Insignia Dinámica de Mora y Antigüedad (RN-FECHAS) */}
        <div style={{ marginBottom: "16px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 14px",
              borderRadius: "50px",
              background: agingBadge.bg,
              color: agingBadge.color,
              fontSize: "11.5px",
              fontWeight: "800",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              maxWidth: "100%",
            }}
          >
            <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {agingBadge.text}
            </span>
          </div>
        </div>

        {/* Acciones del Pie de Tarjeta */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px",
            paddingTop: "12px",
            borderTop: "1px solid #f1f5f9",
          }}
        >
          {/* Botón Ver Facturas */}
          <button
            type="button"
            style={{
              flex: 1,
              padding: "9px 14px",
              borderRadius: "50px",
              border: "1px solid #cbd5e1",
              background: "#ffffff",
              color: "#334155",
              fontSize: "13px",
              fontWeight: "700",
              cursor: "pointer",
              transition: "all 0.2s ease",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#f8fafc";
              e.currentTarget.style.borderColor = "#94a3b8";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#ffffff";
              e.currentTarget.style.borderColor = "#cbd5e1";
            }}
            onClick={() => onViewInvoices?.(debt)}
          >
            <FileText size={15} /> Ver facturas
          </button>

          {/* Botón Ver Detalles / PDF */}
          <button
            type="button"
            style={{
              flex: 1,
              padding: "9px 14px",
              borderRadius: "50px",
              border: "none",
              background: theme.primaryBtnBg,
              color: "#ffffff",
              fontSize: "13px",
              fontWeight: "700",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              transition: "all 0.2s ease",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.02)";
              e.currentTarget.style.filter = "brightness(1.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.filter = "none";
            }}
            onClick={() => generateReceivablePDF(debt)}
          >
            Ver detalles <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
