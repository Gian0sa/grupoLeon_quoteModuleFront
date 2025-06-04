import ReactDatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Box, FormLabel, Input } from "@chakra-ui/react";
import { es } from "date-fns/locale";

export function DatePickerField({ label, selectedDate, setSelectedDate }) {
  return (
    <Box>
      <FormLabel>{label}</FormLabel>
      <ReactDatePicker
        selected={selectedDate}
        onChange={(date) => setSelectedDate(date)}
        customInput={<Input />}
        locale={es}
        dateFormat="dd/MM/yyyy"
      />
    </Box>
  );
}
