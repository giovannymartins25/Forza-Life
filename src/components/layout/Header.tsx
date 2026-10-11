import React, { useState, useEffect, useRef } from 'react';
import { useCareer } from '../../context/CareerContext';
import { formatBRL } from '../../utils/currency';
import { Plus, Minus, User, Wallet, Pencil, Check, X } from 'lucide-react';

export const Header: React.FC = () => {
  const { career, updatePilotName, setOpenDepositModal, setOpenWithdrawModal } = useCareer();
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(career?.pilotName || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (career?.pilotName) {
      setNameInput(career.pilotName);
    }
  }, [career?.pilotName]);

  useEffect(() => {
    if (isEditingName && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingName]);

  const handleSaveName = async () => {
    if (!nameInput.trim()) {
      setIsEditingName(false);
      setNameInput(career?.pilotName || 'Piloto');
      return;
    }
    await updatePilotName(nameInput.trim());
    setIsEditingName(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSaveName();
    } else if (e.key === 'Escape') {
      setNameInput(career?.pilotName || 'Piloto');
      setIsEditingName(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-[#080c14]/85 backdrop-blur-md border-b border-slate-800/80 px-4 md:px-8 py-3.5 flex items-center justify-between">
      {/* Left: User Pilot Profile (Editable) */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-750 flex items-center justify-center text-slate-300 shadow-md">
          <User className="w-5 h-5 text-amber-400" />
        </div>

        <div>
          {isEditingName ? (
            <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
              <input
                ref={inputRef}
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Digite seu nome..."
                maxLength={30}
                className="px-2.5 py-1 bg-slate-950 border border-amber-500 rounded-lg text-sm font-bold text-white focus:outline-none w-36 sm:w-52"
              />
              <button
                onClick={handleSaveName}
                className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                title="Salvar nome"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setNameInput(career?.pilotName || 'Piloto');
                  setIsEditingName(false);
                }}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700 transition-colors"
                title="Cancelar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group">
              <button
                onClick={() => setIsEditingName(true)}
                className="text-left flex items-center gap-1.5 hover:opacity-85 transition-opacity cursor-pointer"
                title="Clique para editar seu nome"
              >
                <span className="text-sm font-bold text-white tracking-wide truncate max-w-[140px] sm:max-w-[220px]">
                  {career?.pilotName || 'Clique para definir seu nome'}
                </span>
                <Pencil className="w-3 h-3 text-slate-500 group-hover:text-amber-400 transition-colors shrink-0" />
              </button>
            </div>
          )}

          <div className="text-[11px] text-slate-400 font-medium">
            Piloto Horizon
          </div>
        </div>
      </div>

      {/* Right: Quick Balance & Shortcuts */}
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
          <Wallet className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-xs text-slate-400">Saldo:</span>
          <span className="text-xs font-bold font-mono text-emerald-400">
            {formatBRL(career?.currentBalance || 0)}
          </span>
        </div>

        <button
          onClick={() => setOpenDepositModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 stroke-[3]" />
          <span className="hidden sm:inline">Depositar</span>
        </button>

        <button
          onClick={() => setOpenWithdrawModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold transition-colors cursor-pointer"
        >
          <Minus className="w-3.5 h-3.5 stroke-[3]" />
          <span className="hidden sm:inline">Sacar</span>
        </button>
      </div>
    </header>
  );
};
