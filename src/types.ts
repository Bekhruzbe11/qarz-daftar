/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type DebtType = 'given' | 'taken';
export type DebtStatus = 'pending' | 'partially_paid' | 'paid';

export interface Transaction {
  id: string;
  amount: number;
  date: string;
  type: 'payment' | 'addition';
}

export interface Debt {
  id: string;
  personName: string;
  amount: number; // Original amount if it was a single entry, or total current debt
  type: DebtType;
  date: string;
  dueDate?: string;
  description: string;
  status: DebtStatus;
  transactions: Transaction[];
  archivedAt?: string;
  archiveReason?: 'paid' | 'deleted';
}

export interface AppState {
  debts: Debt[];
  archive: Debt[];
}
