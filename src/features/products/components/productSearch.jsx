import { Input, Button, FormControl, FormLabel, Select } from "@chakra-ui/react";

export function ProductSearch({ setField, setValue }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    const field = e.target.field.value;
    const value = e.target.search.value;
    setField(field);
    setValue(value);
    console.log("search by:", field, "value:", value);
  };

  return (
    <div>
      <h1>Product Search</h1>
      <form onSubmit={handleSubmit}>
        <FormControl>
          <FormLabel>Search by</FormLabel>
          <Select name="field" defaultValue="ItemName">
            <option value="ItemName">Name</option>
            <option value="ItemCode">Code</option>
          </Select>
          <Input type="text" placeholder="Search..." name="search" />
        </FormControl>
        <Button type="submit">Search</Button>
      </form>
    </div>
  );
}
