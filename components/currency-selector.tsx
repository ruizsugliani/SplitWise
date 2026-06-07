"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronDown } from "lucide-react";
import { Currency } from "@/app/types/currency";
import { currencyConfig } from "@/lib/currency-config";

interface CurrencySelectorProps {
  currencies: Currency[];
  value: string;
  onChange: (currencyId: string) => void;
}

export default function CurrencySelector({
  currencies,
  value,
  onChange,
}: CurrencySelectorProps) {
  const [open, setOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedCurrency = currencies.find(
    (c) => c.id === value
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  if (!selectedCurrency) return null;

  const selectedMeta =
    currencyConfig[selectedCurrency.code];

  return (
    <div
      ref={dropdownRef}
      className="relative"
    >
      {/* Selected Currency */}

      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="
          w-full
          flex
          items-center
          justify-between
          text-white
          font-medium
          pt-1
        "
      >
        <div className="flex items-center gap-2">
          <Image
            src={selectedMeta.flag}
            alt={selectedCurrency.code}
            width={24}
            height={18}
            className="shrink-0"
          />

          <span>{selectedCurrency.code}</span>
        </div>

        <ChevronDown
          size={16}
          className={`transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown */}

      {open && (
        <div
          className="
            absolute
            top-full
            left-0
            mt-2
            w-full
            min-w-[140px]
            rounded-xl
            border
            border-white/10
            bg-[#121212]
            shadow-2xl
            overflow-hidden
            z-50
          "
        >
          {currencies.map((currency) => {
            const meta =
              currencyConfig[currency.code];

            return (
              <button
                key={currency.id}
                type="button"
                onClick={() => {
                  onChange(currency.id);
                  setOpen(false);
                }}
                className="
                  w-full
                  flex
                  items-center
                  gap-3
                  px-3
                  py-2
                  text-white
                  hover:bg-white/5
                  transition-colors
                "
              >
                <Image
                  src={meta.flag}
                  alt={currency.code}
                  width={24}
                  height={18}
                  className="shrink-0"
                />

                <span>{currency.code}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}