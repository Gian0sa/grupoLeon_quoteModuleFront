import { Input } from "@chakra-ui/react";
import { useEffect, useState } from "react";

export function ClientSearch({ onSearch }) {
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      onSearch(inputValue);
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [inputValue, onSearch]);

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  return (
    <div>
      <Input
        placeholder="Search by name or code"
        value={inputValue}
        onChange={handleInputChange}
      />
    </div>
  );
}
