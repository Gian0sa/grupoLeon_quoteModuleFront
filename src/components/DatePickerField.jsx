import ReactDatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Box, FormLabel, Input } from "@chakra-ui/react";
import { es } from "date-fns/locale";

const getStartOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const resolveDateObject = (val) => {
  if (!val) return null;
  if (val instanceof Date) {
    const copy = new Date(val.getTime());
    copy.setHours(0, 0, 0, 0);
    return copy;
  }
  const parsed = new Date(val);
  if (!isNaN(parsed.getTime())) {
    parsed.setHours(0, 0, 0, 0);
    return parsed;
  }
  return null;
};

export function DatePickerField({
  label,
  selectedDate,
  setSelectedDate,
  isDisabled = false,
  isReadOnly = false,
  minDate,
  maxDate,
  allowPastDates = false,
}) {
  const parsedDate = selectedDate
    ? (selectedDate instanceof Date ? selectedDate : new Date(selectedDate))
    : null;
  const validDate = parsedDate && !isNaN(parsedDate.getTime()) ? parsedDate : null;

  // Si allowPastDates es false (por defecto), la fecha mínima es hoy o minDate provisto
  const effectiveMinDate = allowPastDates
    ? (minDate ? resolveDateObject(minDate) : null)
    : (minDate !== undefined ? resolveDateObject(minDate) : getStartOfToday());

  const effectiveMaxDate = maxDate ? resolveDateObject(maxDate) : null;

  const handleDateChange = (date) => {
    if (isDisabled || isReadOnly) return;
    if (!date) {
      setSelectedDate(null);
      return;
    }
    const cleanDate = new Date(date);
    cleanDate.setHours(0, 0, 0, 0);

    // Si intenta poner una fecha anterior a hoy (o anterior a minDate), bloquear y forzar a hoy
    if (effectiveMinDate && cleanDate < effectiveMinDate) {
      setSelectedDate(effectiveMinDate);
      return;
    }
    if (effectiveMaxDate && cleanDate > effectiveMaxDate) {
      setSelectedDate(effectiveMaxDate);
      return;
    }
    setSelectedDate(date);
  };

  return (
    <Box
      sx={{
        "& .react-datepicker-wrapper": {
          width: "100%",
        },
        "& .react-datepicker__input-container": {
          width: "100%",
        },
        "& .react-datepicker": {
          fontFamily: "inherit",
          borderRadius: "xl",
          border: "1px solid #cbd5e1",
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
          overflow: "hidden",
        },
        "& .react-datepicker__header": {
          backgroundColor: "#f8fafc",
          borderBottom: "1px solid #e2e8f0",
          paddingTop: "8px",
        },
        "& .react-datepicker__day--disabled": {
          color: "#94a3b8 !important",
          cursor: "not-allowed !important",
          pointerEvents: "none !important",
          opacity: "0.35 !important",
          textDecoration: "line-through !important",
          backgroundColor: "transparent !important",
        },
        "& .react-datepicker__day": {
          borderRadius: "md",
          transition: "all 0.15s ease",
        },
        "& .react-datepicker__day:hover:not(.react-datepicker__day--disabled)": {
          backgroundColor: "#dcfce7 !important",
          color: "#166534 !important",
        },
        "& .react-datepicker__day--selected": {
          backgroundColor: "#16a34a !important",
          color: "#ffffff !important",
          fontWeight: "bold",
        },
        "& .react-datepicker__day--today": {
          fontWeight: "bold",
          border: "1.5px solid #16a34a",
        },
      }}
    >
      {label && (
        <FormLabel fontSize="xs" fontWeight="800" color="gray.700" mb={1}>
          {label}
        </FormLabel>
      )}
      <ReactDatePicker
        selected={validDate}
        onChange={handleDateChange}
        minDate={effectiveMinDate}
        maxDate={effectiveMaxDate}
        filterDate={(date) => {
          if (!effectiveMinDate) return true;
          const checkDate = new Date(date);
          checkDate.setHours(0, 0, 0, 0);
          return checkDate >= effectiveMinDate;
        }}
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
