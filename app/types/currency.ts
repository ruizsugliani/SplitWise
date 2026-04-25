export interface Currency {
  id: string;
  code: string;
  name: string;
}

export const formatCurrency = (value: number, currencyCode: string = 'ARS') => {
  try {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
    }).format(value);
  } catch (error) {
    console.error("Error formateando la moneda:", error);
    return `$${value.toFixed(2)} ${currencyCode}`;
  }
};