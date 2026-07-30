import { HStack, Button, Text, IconButton, useBreakpointValue } from '@chakra-ui/react';
import { ChevronLeftIcon, ChevronRightIcon, ArrowLeftIcon, ArrowRightIcon } from '@chakra-ui/icons';

export default function Pagination({ page, totalPages, onPageChange }) {
  const isMobile = useBreakpointValue({ base: true, md: false });
  
  if (totalPages <= 1) return null;

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      onPageChange(newPage);
    }
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = isMobile ? 3 : 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      let startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2));
      let endPage = startPage + maxVisiblePages - 1;

      if (endPage > totalPages) {
        endPage = totalPages;
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
      }

      if (startPage > 1) {
        pages.push(1);
        if (startPage > 2) pages.push('...');
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }

      if (endPage < totalPages) {
        if (endPage < totalPages - 1) pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  return (
    <HStack justify="center" mt={6} spacing={2} flexWrap="wrap">
      <IconButton
        icon={<ArrowLeftIcon boxSize={3} />}
        onClick={() => handlePageChange(1)}
        isDisabled={page === 1}
        aria-label="Primera página"
        size="sm"
        variant="ghost"
      />
      <IconButton
        icon={<ChevronLeftIcon boxSize={5} />}
        onClick={() => handlePageChange(page - 1)}
        isDisabled={page === 1}
        aria-label="Página anterior"
        size="sm"
        variant="ghost"
      />

      {getPageNumbers().map((p, idx) => (
        <Button
          key={idx}
          onClick={() => p !== '...' && handlePageChange(p)}
          isDisabled={p === '...'}
          size="sm"
          colorScheme={p === page ? "green" : "gray"}
          variant={p === page ? "solid" : (p === '...' ? "unstyled" : "ghost")}
          minW="32px"
        >
          {p}
        </Button>
      ))}

      <IconButton
        icon={<ChevronRightIcon boxSize={5} />}
        onClick={() => handlePageChange(page + 1)}
        isDisabled={page === totalPages}
        aria-label="Página siguiente"
        size="sm"
        variant="ghost"
      />
      <IconButton
        icon={<ArrowRightIcon boxSize={3} />}
        onClick={() => handlePageChange(totalPages)}
        isDisabled={page === totalPages}
        aria-label="Última página"
        size="sm"
        variant="ghost"
      />
    </HStack>
  );
}
