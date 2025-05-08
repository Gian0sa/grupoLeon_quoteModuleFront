import { useEffect, useState } from "react";
import { Input } from "@chakra-ui/react";

export function ClientSearch({ onSearch }) {
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      onSearch(inputValue);
    }, 300); // espera 300ms después de dejar de tipear

    return () => clearTimeout(delayDebounce);
  }, [inputValue, onSearch]);

  return (
    <Input
      placeholder="Search by name or code"
      mb={4}
      value={inputValue}
      onChange={(e) => setInputValue(e.target.value)}
    />
  );
}
