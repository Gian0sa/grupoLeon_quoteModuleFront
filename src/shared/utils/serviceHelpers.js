// src/features/admin/utils/serviceHelpers.js

export const getServiceDisplayName = (name) => {
  if (!name) return '';
  const parts = name.split('-');
  return parts.length > 1 ? parts.slice(1).join('-').trim() : name.trim();
};

export function groupServicesByCategory(services) {
  if (!services || services.length === 0) return {};

  const iconMap = {
    'notificación': '🔔',
    'producto': '🛍️',
    'pedido': '📦',
    'cliente': '👤',
    'reporte': '📊',
    'usuario': '👥',
    'factura': '📄',
    'orden': '📃',
    'admin': '⚙️',
  };

  const colorMap = {
    'notificación': 'purple',
    'producto': 'orange',
    'pedido': 'blue',
    'vendedor': 'green',
    'admin': 'yellow',
    'usuario': 'pink',
    'factura': 'red',
    'orden': 'teal',
  };

  const dynamicCategories = {};

  services.forEach(service => {
    const rawPrefix = service.name?.split('-')[0]?.trim() || 'Otros';
    const prefixKey = rawPrefix.toLowerCase();

    if (!dynamicCategories[prefixKey]) {
      dynamicCategories[prefixKey] = {
        name: rawPrefix,
        icon: iconMap[prefixKey] || '📁',
        color: colorMap[prefixKey] || 'gray',
        services: []
      };
    }

    dynamicCategories[prefixKey].services.push(service);
  });

  return dynamicCategories;
}