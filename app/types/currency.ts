import { currencyConfig } from "@/lib/currency-config";

export interface Currency {
  id: string;
  code: string;
  name: string;
}

export const formatCurrency = (value: number, currencyCode: string = 'ARS') => {
  try {
    const formatted = new Intl.NumberFormat('es-AR', {
      minimumFractionDigits: 2,
    }).format(value);

    return `${currencyCode} ${currencyConfig[currencyCode].symbol} ${formatted}`;
  } catch (error) {
    console.error("Error formateando la moneda:", error);
    return `$${value.toFixed(2)} ${currencyCode}`;
  }
};

export const formatCurrencyWithSymbol = (
  value: number,
  currencyCode: string = "ARS"
) => {
  try {
    const formatted = new Intl.NumberFormat("es-AR", {
      minimumFractionDigits: 2,
    }).format(value);

    return `${currencyConfig[currencyCode].symbol}${formatted}`;
  } catch (error) {
    console.error("Error formateando moneda:", error);
    return `${currencyCode} $${value.toFixed(2)}`;
  }
};