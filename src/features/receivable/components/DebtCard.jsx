import React, { useState } from "react";
import { generateAccountStatementPDF } from "../utils/receivablePDF";
import { WhatsAppStatementModal } from "./WhatsAppStatementModal";
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
  History,
} from "lucide-react";

export function DebtCard({ debt, onViewInvoices, onViewHistory }) {
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
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
    const isCredit = (saldoPEN < 0 || saldoUSD < 0) && saldoPEN <= 0 && saldoUSD <= 0;
    if (isCredit) return "credit";
    if (debt.documentosVencidos > 0 || saldoVencidoPEN > 0 || saldoVencidoUSD > 0 || debt.estado === "vencido" || debt.estado === "parcialmente_vencido") return "overdue";
    return "active";
  };

  const statusType = getStatusType();

  // Temas visuales de alta fidelidad - Estilo Ejecutivo SaaS Suave
  const theme = {
    overdue: {
      accentColor: "#f43f5e",
      topBar: "linear-gradient(90deg, #f43f5e 0%, #fb7185 100%)",
      avatarBg: "#fff1f2",
      avatarColor: "#e11d48",
      avatarBorder: "1px solid #fecdd3",
      cardBorder: "1px solid #fecdd3",
      amountColor: "#be123c",
      bgHoverShadow: "0 10px 25px rgba(225, 29, 72, 0.08)",
      primaryBtnBg: "#0f172a",
      primaryBtnHover: "#1e293b",
      primaryBtnColor: "#ffffff",
      primaryBtnShadow: "0 2px 6px rgba(15, 23, 42, 0.15)",
      badgeBg: "#fff1f2",
      badgeText: "#9f1239",
    },
    active: {
      accentColor: "#10b981",
      topBar: "linear-gradient(90deg, #10b981 0%, #34d399 100%)",
      avatarBg: "#ecfdf5",
      avatarColor: "#059669",
      avatarBorder: "1px solid #a7f3d0",
      cardBorder: "1px solid #a7f3d0",
      amountColor: "#047857",
      bgHoverShadow: "0 10px 25px rgba(16, 185, 129, 0.08)",
      primaryBtnBg: "#0f172a",
      primaryBtnHover: "#1e293b",
      primaryBtnColor: "#ffffff",
      primaryBtnShadow: "0 2px 6px rgba(15, 23, 42, 0.15)",
      badgeBg: "#ecfdf5",
      badgeText: "#065f46",
    },
    credit: {
      accentColor: "#3b82f6",
      topBar: "linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%)",
      avatarBg: "#eff6ff",
      avatarColor: "#2563eb",
      avatarBorder: "1px solid #bfdbfe",
      cardBorder: "1px solid #bfdbfe",
      amountColor: "#1d4ed8",
      bgHoverShadow: "0 10px 25px rgba(59, 130, 246, 0.08)",
      primaryBtnBg: "#0f172a",
      primaryBtnHover: "#1e293b",
      primaryBtnColor: "#ffffff",
      primaryBtnShadow: "0 2px 6px rgba(15, 23, 42, 0.15)",
      badgeBg: "#eff6ff",
      badgeText: "#1e40af",
    },
  }[statusType];

  // Configuración de la insignia de mora / días con tonos suaves pastel
  const getAgingBadge = () => {
    const days = debt.maxOverdueDays || 0;
    if (statusType === "credit") {
      return {
        text: "Saldo a Favor / Nota de Crédito",
        bg: "#eff6ff",
        color: "#1d4ed8",
        border: "1px solid #bfdbfe",
        icon: FileText,
      };
    }
    if (days > 0) {
      if (days > 90) {
        return {
          text: `⏱️ ${days} DÍAS DE MORA ${debt.oldestDueDate ? `• Venció: ${debt.oldestDueDate}` : ""}`,
          bg: "#fff1f2",
          color: "#be123c",
          border: "1px solid #fecdd3",
          icon: ShieldAlert,
        };
      }
      if (days > 30) {
        return {
          text: `⏱️ ${days} DÍAS DE MORA ${debt.oldestDueDate ? `• Venció: ${debt.oldestDueDate}` : ""}`,
          bg: "#fff7ed",
          color: "#c2410c",
          border: "1px solid #fed7aa",
          icon: ShieldAlert,
        };
      }
      return {
        text: `⏱️ ${days} DÍAS DE MORA ${debt.oldestDueDate ? `• Venció: ${debt.oldestDueDate}` : ""}`,
        bg: "#fefce8",
        color: "#a16207",
        border: "1px solid #fef08a",
        icon: ShieldAlert,
      };
    }
    return {
      text: debt.oldestDueDate ? `📅 Próximo vencimiento: ${debt.oldestDueDate}` : "✅ Al día (Sin moras)",
      bg: "#ecfdf5",
      color: "#047857",
      border: "1px solid #a7f3d0",
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
          height: "3.5px",
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
              color: theme.avatarColor,
              border: theme.avatarBorder,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            <Building2 size={22} color={theme.avatarColor} />
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
                color: statusType !== "credit" && debt.documentosVencidos > 0 ? "#dc2626" : "#059669",
                textTransform: "uppercase",
                letterSpacing: "0.4px",
                marginBottom: "4px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              {statusType !== "credit" && debt.documentosVencidos > 0 ? (
                <AlertCircle size={13} color="#dc2626" />
              ) : (
                <CheckCircle2 size={13} color="#059669" />
              )}
              <span>
                {statusType !== "credit" && debt.documentosVencidos > 0
                  ? `${debt.documentosVencidos} Vencido(s)`
                  : "Monto Vencido:"}
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              {statusType !== "credit" && saldoVencidoPEN > 0 && (
                <span style={{ fontSize: "16px", fontWeight: "800", color: "#dc2626" }}>
                  {formatAmount(saldoVencidoPEN, "PEN")}
                </span>
              )}
              {statusType !== "credit" && saldoVencidoUSD > 0 && (
                <span style={{ fontSize: "16px", fontWeight: "800", color: "#dc2626" }}>
                  {formatAmount(saldoVencidoUSD, "USD")}
                </span>
              )}
              {(statusType === "credit" || (saldoVencidoPEN <= 0 && saldoVencidoUSD <= 0)) && (
                <span style={{ fontSize: "15px", fontWeight: "800", color: "#059669" }}>
                  $ 0.00
                </span>
              )}
            </div>

            <div
              style={{
                fontSize: "11px",
                fontWeight: "600",
                color: statusType !== "credit" && debt.documentosVencidos > 0 ? "#b91c1c" : "#047857",
                marginTop: "4px",
              }}
            >
              {statusType === "credit"
                ? "Al día (Saldo a favor)"
                : debt.documentosVencidos === 0
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
              padding: "5px 12px",
              borderRadius: "50px",
              background: agingBadge.bg,
              color: agingBadge.color,
              border: agingBadge.border || "none",
              fontSize: "11.5px",
              fontWeight: "700",
              boxShadow: "none",
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
              color: theme.primaryBtnColor || "#ffffff",
              fontSize: "13px",
              fontWeight: "700",
              cursor: "pointer",
              boxShadow: theme.primaryBtnShadow || "0 2px 6px rgba(15, 23, 42, 0.15)",
              transition: "all 0.2s ease",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = theme.primaryBtnHover;
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = theme.primaryBtnBg;
              e.currentTarget.style.transform = "translateY(0)";
            }}
            onClick={(e) => {
              e.stopPropagation();
              setIsWhatsAppModalOpen(true);
            }}
          >
            Ver detalles <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Modal de Envío por WhatsApp y Enlace Web */}
      <WhatsAppStatementModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        debt={debt}
      />
    </div>
  );
}
