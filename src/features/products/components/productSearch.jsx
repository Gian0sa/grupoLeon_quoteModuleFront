import { Input, Button, FormControl, FormLabel} from "@chakra-ui/react";

export function ProductSearch({ setValue }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    const value = e.target.search.value;
    setValue(value);
    console.log("value:", value);
  };

  return (
    <div>
      <h1>Product Search</h1>
      <form onSubmit={handleSubmit}>
        <FormControl>
          <FormLabel>Search by  Code</FormLabel>
          <Input type="text" placeholder="Search..." name="search" />
        </FormControl>
        <Button type="submit">Search</Button>
      </form>
    </div>
  );
}
