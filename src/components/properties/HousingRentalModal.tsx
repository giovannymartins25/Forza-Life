import React, { useEffect, useState } from 'react';
import { Modal } from '../common/Modal';
import { useCareer } from '../../context/CareerContext';
import { advanceRentalDueDate } from '../../utils/recurrence';
import type { JobPaymentFrequency } from '../../types';

const today = () => new Date().toISOString().slice(0, 10);
const asDateInput = (date: Date) => date.toISOString().slice(0, 10);

export const HousingRentalModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { createHousingRentalContract } = useCareer();
  const [propertyName, setPropertyName] = useState('');
  const [address, setAddress] = useState('');
  const [rentAmount, setRentAmount] = useState('');
  const [paymentFrequency, setPaymentFrequency] = useState<JobPaymentFrequency>('monthly');
  const [startDate, setStartDate] = useState(today());
  const [nextPaymentDue, setNextPaymentDue] = useState(asDateInput(advanceRentalDueDate(new Date(), 'monthly')));
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const start = new Date(`${startDate}T12:00:00`);
    if (Number.isFinite(start.getTime())) setNextPaymentDue(asDateInput(advanceRentalDueDate(start, paymentFrequency)));
  }, [startDate, paymentFrequency]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setSaving(true);
    try {
      await createHousingRentalContract({ propertyName, address, rentAmount: Number(rentAmount.replace(',', '.')), paymentFrequency, startDate: new Date(`${startDate}T12:00:00`).toISOString(), nextPaymentDue: new Date(`${nextPaymentDue}T12:00:00`).toISOString(), notes });
      setPropertyName(''); setAddress(''); setRentAmount(''); setNotes(''); onClose();
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível criar o contrato.'); }
    finally { setSaving(false); }
  };

  return <Modal isOpen={isOpen} onClose={() => !saving && onClose()} title="Cadastrar moradia alugada" subtitle="O aluguel será lançado em Contas a Pagar; o saldo só muda ao pagar." maxWidth="lg">
    <form onSubmit={submit} className="space-y-4">
      <label className="block text-xs text-slate-300">Identificação do imóvel *<input required value={propertyName} onChange={e => setPropertyName(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white" placeholder="Ex.: Apartamento Centro" /></label>
      <label className="block text-xs text-slate-300">Endereço ou localização<input value={address} onChange={e => setAddress(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white" /></label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block text-xs text-slate-300">Aluguel por período (R$) *<input required type="number" min="0.01" step="0.01" value={rentAmount} onChange={e => setRentAmount(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white" /></label>
        <label className="block text-xs text-slate-300">Periodicidade<select value={paymentFrequency} onChange={e => setPaymentFrequency(e.target.value as JobPaymentFrequency)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"><option value="daily">A cada 24 horas</option><option value="weekly">Semanalmente</option><option value="monthly">Mensalmente</option></select></label>
        <label className="block text-xs text-slate-300">Início do contrato *<input required type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white" /></label>
        <label className="block text-xs text-slate-300">Próximo vencimento *<input required type="date" value={nextPaymentDue} onChange={e => setNextPaymentDue(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white" /></label>
      </div>
      <label className="block text-xs text-slate-300">Observações<textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white" /></label>
      {error && <p className="rounded-xl bg-rose-500/10 p-3 text-xs text-rose-300">{error}</p>}
      <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm text-slate-300">Cancelar</button><button disabled={saving} className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50">{saving ? 'Salvando…' : 'Criar contrato'}</button></div>
    </form>
  </Modal>;
};
