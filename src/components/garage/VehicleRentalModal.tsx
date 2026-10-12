import React, { useEffect, useState } from 'react';
import { Modal } from '../common/Modal';
import { useCareer } from '../../context/CareerContext';
import { advanceRentalDueDate } from '../../utils/recurrence';
import { formatBRL } from '../../utils/currency';
import type { JobPaymentFrequency, Vehicle } from '../../types';

const today = () => new Date().toISOString().slice(0, 10);
const dateInput = (value: Date) => value.toISOString().slice(0, 10);

export const VehicleRentalModal: React.FC<{ vehicle: Vehicle | null; isOpen: boolean; onClose: () => void }> = ({ vehicle, isOpen, onClose }) => {
  const { vehicleRentalContracts, vehicleRentalPayments, createVehicleRentalContract, terminateVehicleRentalContract } = useCareer();
  const [rentAmount, setRentAmount] = useState('');
  const [frequency, setFrequency] = useState<JobPaymentFrequency>('weekly');
  const [startDate, setStartDate] = useState(today());
  const [nextDue, setNextDue] = useState(dateInput(advanceRentalDueDate(new Date(), 'weekly')));
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const active = vehicleRentalContracts.find(c => c.vehicleId === vehicle?.id && c.status === 'active');
  const history = vehicleRentalPayments.filter(p => p.vehicleId === vehicle?.id);

  useEffect(() => {
    const start = new Date(`${startDate}T12:00:00`);
    if (Number.isFinite(start.getTime())) setNextDue(dateInput(advanceRentalDueDate(start, frequency)));
  }, [startDate, frequency]);

  if (!vehicle) return null;
  const create = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      await createVehicleRentalContract({ vehicleId: vehicle.id, rentAmount: Number(rentAmount.replace(',', '.')), paymentFrequency: frequency, startDate: new Date(`${startDate}T12:00:00`).toISOString(), nextPaymentDue: new Date(`${nextDue}T12:00:00`).toISOString(), notes });
      setRentAmount(''); setNotes(''); onClose();
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível criar o contrato.'); }
    finally { setBusy(false); }
  };

  return <Modal isOpen={isOpen} onClose={() => !busy && onClose()} title="Aluguel de veículo" subtitle={`${vehicle.brand} ${vehicle.model} (${vehicle.year}) permanece na sua garagem`} maxWidth="lg">
    {active ? <div className="space-y-4"><div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4"><p className="font-semibold text-emerald-300">Contrato ativo</p><p className="mt-1 text-sm text-white">{formatBRL(active.rentAmount)} / {active.paymentFrequency === 'daily' ? '24 horas' : active.paymentFrequency === 'weekly' ? 'semana' : 'mês'}</p><p className="text-xs text-slate-400">Próximo crédito: {new Date(active.nextPaymentDue).toLocaleString('pt-BR')}</p><button disabled={busy} onClick={async () => { setBusy(true); try { await terminateVehicleRentalContract(active.id); } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao encerrar.'); } finally { setBusy(false); } }} className="mt-3 rounded-lg border border-rose-500/30 px-3 py-2 text-xs text-rose-300">{busy ? 'Salvando…' : 'Encerrar contrato'}</button></div>{error && <p className="text-xs text-rose-300">{error}</p>}</div> : <form onSubmit={create} className="space-y-4"><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><label className="text-xs text-slate-300">Valor por período (R$) *<input required type="number" step="0.01" min="0.01" value={rentAmount} onChange={e => setRentAmount(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" /></label><label className="text-xs text-slate-300">Periodicidade<select value={frequency} onChange={e => setFrequency(e.target.value as JobPaymentFrequency)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"><option value="daily">A cada 24 horas</option><option value="weekly">Semanalmente</option><option value="monthly">Mensalmente</option></select></label><label className="text-xs text-slate-300">Início *<input required type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" /></label><label className="text-xs text-slate-300">Próximo vencimento *<input required type="date" value={nextDue} onChange={e => setNextDue(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" /></label></div><label className="block text-xs text-slate-300">Informações do contrato<textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" /></label>{error && <p className="rounded-xl bg-rose-500/10 p-3 text-xs text-rose-300">{error}</p>}<button disabled={busy || vehicle.isSold || vehicle.status !== 'available'} className="w-full rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-950 disabled:opacity-50">{busy ? 'Salvando…' : 'Ativar contrato de aluguel'}</button></form>}
    <div className="mt-5 border-t border-slate-800 pt-4"><h3 className="text-sm font-semibold text-white">Receitas registradas</h3>{history.length ? <div className="mt-2 max-h-40 space-y-2 overflow-auto">{history.map(payment => <div key={payment.id} className="flex justify-between rounded-lg bg-slate-950 px-3 py-2 text-xs"><span className="text-slate-400">Período {payment.periodIndex} • {new Date(payment.periodEnd).toLocaleDateString('pt-BR')}</span><strong className="text-emerald-300">{formatBRL(payment.amount)}</strong></div>)}</div> : <p className="mt-2 text-xs text-slate-500">Nenhum crédito registrado.</p>}</div>
  </Modal>;
};
