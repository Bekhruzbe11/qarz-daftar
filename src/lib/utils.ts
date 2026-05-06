import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility for combining Tailwind classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a number as Uzbek So'm with space separators
 */
export function formatCurrency(amount: number): string {
  if (amount >= 1000000) {
    const mln = amount / 1000000;
    if (Number.isInteger(mln)) {
      return mln + " mln so'm";
    }
    return mln.toFixed(1) + " mln so'm";
  }
  
  return new Intl.NumberFormat('uz-UZ', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount).replace(/,/g, ' ') + " so'm";
}

/**
 * Formats a date string to a readable format: 6-may, 2026-yil
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const months = [
    'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
    'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'
  ];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  
  return `${day}-${month}, ${year}-yil`;
}

/**
 * Parses a string amount that can include "million", "mln", "ming", "k"
 */
export function parseAmount(input: string): number {
  let cleanInput = input.toLowerCase().replace(/,/g, '.').replace(/\s/g, '');
  
  let multiplier = 1;
  if (cleanInput.includes('million') || cleanInput.includes('mln')) {
    multiplier = 1000000;
    cleanInput = cleanInput.replace('million', '').replace('mln', '');
  } else if (cleanInput.includes('ming') || cleanInput.endsWith('k')) {
    multiplier = 1000;
    cleanInput = cleanInput.replace('ming', '').replace('k', '');
  }
  
  const value = parseFloat(cleanInput.replace(/[^0-9.]/g, ''));
  return isNaN(value) ? 0 : value * multiplier;
}

/**
 * Generates a unique ID
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}
