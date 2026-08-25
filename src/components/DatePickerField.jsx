import ReactDatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Box, FormLabel, Input } from "@chakra-ui/react";
import { es } from "date-fns/locale";

export function DatePickerField({ label, selectedDate, setSelectedDate, isDisabled = false, isReadOnly = false }) {
  const parsedDate = selectedDate
    ? (selectedDate instanceof Date ? selectedDate : new Date(selectedDate))
    : null;
  const validDate = parsedDate && !isNaN(parsedDate.getTime()) ? parsedDate : null;

  return (
    <Box>
      <FormLabel fontSize="xs" fontWeight="800" color="gray.700" mb={1}>
        {label}
      </FormLabel>
      <ReactDatePicker
        selected={validDate}
        onChange={(date) => !isDisabled && !isReadOnly && setSelectedDate(date)}
        disabled={isDisabled || isReadOnly}
        customInput={
          <Input
            size="sm"
            borderRadius="md"
            isDisabled={isDisabled || isReadOnly}
            isReadOnly={isReadOnly}
            bg={isDisabled || isReadOnly ? "gray.100" : "white"}
            cursor={isDisabled || isReadOnly ? "not-allowed" : "default"}
          />
        }
        locale={es}
        dateFormat="dd/MM/yyyy"
      />
    </Box>
  );
}
