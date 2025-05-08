import { useState, useMemo } from "react";
import { ClientSearch } from "../components/ClientSearch";
import { ClientList } from "../components/ClientList";
import { MainLayout } from "../../../components/layouts/MainLayout";

const clients = [
  { code: "001", name: "Client A" },
  { code: "002", name: "Client B" },
  { code: "003", name: "Client C" },
];

export function ClientPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredClients = useMemo(() => {
    return clients.filter((client) =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.code.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  return (
    <>
    <MainLayout>
      <ClientSearch onSearch={setSearchTerm} />
      <ClientList clients={filteredClients} />
    </MainLayout>
    </>
  );
}
