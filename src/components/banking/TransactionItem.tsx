import React from 'react';
import type { Transaction } from '../../types';
import { formatBRL } from '../../utils/currency';
import { formatDateTime } from '../../utils/date';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { Badge } from '../common/Badge';

interface TransactionItemProps {
  transaction: Transaction;
}

export const TransactionItem: React.FC<TransactionItemProps> = ({ transaction }) => {
  const isDeposit = transaction.type === 'DEPOSIT';

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-900/60 hover:bg-slate-850/80 border border-slate-800 rounded-xl transition-all gap-3">
      {/* Left info: Icon, Description, Category, Date */}
      <div className="flex items-start sm:items-center gap-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isDeposit
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
              : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
            }`}
        >
          {isDeposit ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-semibold text-white truncate">{transaction.description}</h4>
            <Badge variant={isDeposit ? 'deposit' : 'withdrawal'}>
              {isDeposit ? 'Entrada' : 'Saída'}
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">{formatDateTime(transaction.timestamp)}</p>
        </div>
      </div>

      {/* Right info: Amount & Balance After */}
      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800/80">
        <span
          className={`text-base font-bold font-mono ${isDeposit ? 'text-emerald-400' : 'text-rose-400'
            }`}
        >
          {isDeposit ? '+' : '-'} {formatBRL(transaction.amount)}
        </span>
        <span className="text-[11px] text-slate-400 font-mono mt-0.5">
          Saldo pós-op: <span className="text-slate-300 font-semibold">{formatBRL(transaction.balanceAfter)}</span>
        </span>
      </div>
    </div>
  );
};
