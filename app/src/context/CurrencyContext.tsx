import React, { createContext, useContext, useState, useEffect } from 'react';

export type CurrencyCode = 'EGP' | 'USD' | 'EUR' | 'AED' | 'KWD';

interface Currency {
    code: CurrencyCode;
    symbol: string;
    name: string;
    locale: string;
}

export const CURRENCIES: Record<CurrencyCode, Currency> = {
    EGP: { code: 'EGP', symbol: 'EGP', name: 'Egyptian Pound', locale: 'en-EG' },
    USD: { code: 'USD', symbol: '$', name: 'US Dollar', locale: 'en-US' },
    EUR: { code: 'EUR', symbol: '€', name: 'Euro', locale: 'en-IE' },
    AED: { code: 'AED', symbol: 'AED', name: 'UAE Dirham', locale: 'en-AE' },
    KWD: { code: 'KWD', symbol: 'KWD', name: 'Kuwaiti Dinar', locale: 'en-KW' },
};

interface CurrencyContextType {
    currency: Currency;
    setCurrency: (code: CurrencyCode) => void;
    formatPrice: (amount: number) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
    const [currencyCode, setCurrencyCode] = useState<CurrencyCode>(() => {
        const saved = localStorage.getItem('currency') as CurrencyCode;
        return (saved in CURRENCIES) ? saved : 'EGP';
    });

    const currency = CURRENCIES[currencyCode] || CURRENCIES['EGP'];

    const setCurrency = (code: CurrencyCode) => {
        setCurrencyCode(code);
        localStorage.setItem('currency', code);
    };

    const formatPrice = (amount: number) => {
        return new Intl.NumberFormat(currency.locale, {
            style: 'currency',
            currency: currency.code,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    return (
        <CurrencyContext.Provider value={{ currency, setCurrency, formatPrice }}>
            {children}
        </CurrencyContext.Provider>
    );
}

export function useCurrency() {
    const context = useContext(CurrencyContext);
    if (context === undefined) {
        throw new Error('useCurrency must be used within a CurrencyProvider');
    }
    return context;
}
