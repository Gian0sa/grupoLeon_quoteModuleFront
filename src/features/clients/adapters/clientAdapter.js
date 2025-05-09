export function adaptClientFromApi(apiClient) {
    return {
      id: apiClient.id_cliente,
      firstName: apiClient.nombre,
      lastName: apiClient.apellido,
      phone: apiClient.telefono,
    };
  }