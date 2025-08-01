import { useState, useMemo } from "react";

export function useReceivables() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const debts = [
    {
      id: 1,
      name: "Arturo Boyer Rojas",
      ruc: "124590080",
      amount: "S/. 2,350.00",
      documents: 4,
      dueDate: "25/07/2025"
    },
    {
      id: 2,
      name: "David Guardamino Checa",
      ruc: "124590080", 
      amount: "S/. 2,350.00",
      documents: 4,
      dueDate: "25/07/2025"
    },
    {
      id: 3,
      name: "Luis Canales Rivera",
      ruc: "124590080",
      amount: "S/. 2,350.00", 
      documents: 4,
      dueDate: "25/07/2025"
    },
    {
      id: 4,
      name: "Antony Mattos Arapa",
      ruc: "124590080",
      amount: "S/. 2,350.00",
      documents: 4,
      dueDate: "25/07/2025"
    }
  ];

  const filteredDebts = useMemo(() => {
    if (!searchTerm) return debts;
    return debts.filter(debt => 
      debt.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      debt.ruc.includes(searchTerm)
    );
  }, [debts, searchTerm]);

  const handleSearch = (term) => {
    setSearchTerm(term);
  };

  const handleToggleFilters = () => {
    setShowFilters(prev => !prev);
  };

  const handleViewInvoices = (debt) => {
    console.log("Ver facturas para:", debt.name);
    // Implementar navegación o modal
  };

  const handleViewDetails = (debt) => {
    console.log("Ver detalles para:", debt.name);
    // Implementar navegación o modal
  };

  return {
    debts: filteredDebts,
    searchTerm,
    showFilters,
    handleSearch,
    handleToggleFilters,
    handleViewInvoices,
    handleViewDetails
  };
}
