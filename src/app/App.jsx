import './App.css'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AppRoutes from './Routes'
import { ChakraProvider } from '@chakra-ui/react'

  const queryClient = new QueryClient();
function App() {
  

  return (
    <React.StrictMode>
      <ChakraProvider>
        <QueryClientProvider client= {queryClient}>
          <AppRoutes />
        </QueryClientProvider>
      </ChakraProvider>
    </React.StrictMode>
  )
}

export default App
