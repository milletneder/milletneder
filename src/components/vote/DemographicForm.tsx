'use client';

import { useState, useEffect } from 'react';
import { AGE_BRACKETS, INCOME_BRACKETS, GENDER_OPTIONS, EDUCATION_BRACKETS, TURNOUT_OPTIONS } from '@/lib/constants';

interface DemographicFormProps {
  onSave: (data: {
    ageBracket?: string;
    incomeBracket?: string;
    gender?: string;
    education?: string;
    turnoutIntention?: string;
    previousVote2023?: string;
  }) => void;
  onSkip: () => void;
  loading?: boolean;
  parties2023?: Array<{ id: string; name: string; shortName: string; color: string; logoUrl?: string }>;
  existingData?: {
    ageBracket?: string;
    incomeBracket?: string;
    gender?: string;
    education?: string;
    turnoutIntention?: string;
    previousVote2023?: string;
  };
}

const TOTAL_STEPS = 6;

export default function DemographicForm({ onSave, onSkip, loading, parties2023, existingData }: DemographicFormProps) {
  const [step, setStep] = useState(1);
  const [gender, setGender] = useState<string | undefined>(existingData?.gender);
  const [ageBracket, setAgeBracket] = useState<string | undefined>(existingData?.ageBracket);
  const [education, setEducation] = useState<string | undefined>(existingData?.education);
  const [incomeBracket, setIncomeBracket] = useState<string | undefined>(existingData?.incomeBracket);
  const [turnoutIntention, setTurnoutIntention] = useState<string | undefined>(existingData?.turnoutIntention);
  const [previousVote2023, setPreviousVote2023] = useState<string | undefined>(existingData?.previousVote2023);

  useEffect(() => {
    if (existingData) {
      if (existingData.gender) setGender(existingData.gender);
      if (existingData.ageBracket) setAgeBracket(existingData.ageBracket);
      if (existingData.education) setEducation(existingData.education);
      if (existingData.incomeBracket) setIncomeBracket(existingData.incomeBracket);
      if (existingData.turnoutIntention) setTurnoutIntention(existingData.turnoutIntention);
      if (existingData.previousVote2023) setPreviousVote2023(existingData.previousVote2023);
    }
  }, [existingData]);

  const handleNext = () => {
    if (step < TOTAL_STEPS) setStep(step + 1);
    else onSave({ gender, ageBracket, incomeBracket, education, turnoutIntention, previousVote2023 });
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const currentValue = [undefined, gender, ageBracket, education, incomeBracket, turnoutIntention, previousVote2023][step];
  const isLastStep = step === TOTAL_STEPS;

  return (
    <div>
      <h2 className="text-2xl font-bold text-black mb-2">
        Anketin dogruluğuna katkı sağla
      </h2>
      <p className="text-neutral-500 text-sm mb-6">
        Bu bilgiler anonim olarak saklanır ve sonuçları Türkiye gerçeğine yaklaştırmak için kullanılır.
      </p>

      {/* Adım göstergesi */}
      <div className="flex items-center gap-1 mb-6">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <div key={i} className={`h-1 flex-1 transition-colors ${i < step ? 'bg-black' : 'bg-neutral-200'}`} />
        ))}
      </div>

      <div className="mb-6">
        {step === 1 && (
          <SelectGrid label="Cinsiyet" options={GENDER_OPTIONS} value={gender} onChange={setGender} />
        )}
        {step === 2 && (
          <SelectGrid label="Yaş grubu" options={AGE_BRACKETS} value={ageBracket} onChange={setAgeBracket} />
        )}
        {step === 3 && (
          <SelectGrid label="Eğitim düzeyi" options={EDUCATION_BRACKETS} value={education} onChange={setEducation} />
        )}
        {step === 4 && (
          <SelectGrid label="Aylık gelir grubu" options={INCOME_BRACKETS} value={incomeBracket} onChange={setIncomeBracket} />
        )}
        {step === 5 && (
          <SelectGrid label="Seçime katılım niyetiniz" options={TURNOUT_OPTIONS} value={turnoutIntention} onChange={setTurnoutIntention} />
        )}
        {step === 6 && (
          <PartySelect2023
            parties={parties2023 || []}
            value={previousVote2023}
            onChange={setPreviousVote2023}
          />
        )}
      </div>

      <button
        onClick={handleNext}
        disabled={loading}
        className="w-full border border-black bg-black text-white px-4 h-10 text-sm font-medium hover:bg-neutral-800 transition-colors disabled:opacity-50 inline-flex items-center justify-center"
      >
        {loading ? 'Kaydediliyor...' : isLastStep ? 'Kaydet' : 'Devam'}
      </button>
      <div className="flex gap-3 mt-3">
        {step > 1 && (
          <button onClick={handleBack} className="flex-1 text-sm text-neutral-500 hover:text-black transition-colors">
            Geri
          </button>
        )}
        <button onClick={onSkip} className="flex-1 text-sm text-neutral-400 hover:text-black transition-colors">
          {currentValue ? 'Atla' : 'Şimdi değil'}
        </button>
      </div>
    </div>
  );
}

function SelectGrid({ label, options, value, onChange }: {
  label: string;
  options: readonly { value: string; label: string }[];
  value?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-black mb-3">{label}</h3>
      <div className="grid grid-cols-2 gap-2">
        {options.map((b) => (
          <button
            key={b.value}
            type="button"
            onClick={() => onChange(b.value)}
            className={`px-3 py-2 text-sm text-black transition-colors ${
              value === b.value
                ? 'border-2 border-black bg-neutral-50'
                : 'border border-neutral-200 bg-white hover:border-black'
            }`}
          >
            {b.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function PartySelect2023({ parties, value, onChange }: {
  parties: Array<{ id: string; name: string; shortName: string; color: string; logoUrl?: string }>;
  value?: string;
  onChange: (v: string) => void;
}) {
  const sorted = [...parties].sort((a, b) => a.name.localeCompare(b.name, 'tr'));

  return (
    <div>
      <h3 className="text-sm font-semibold text-black mb-3">2023 seçiminde hangi partiye oy verdiniz?</h3>
      <div className="flex flex-col gap-1.5 max-h-[40vh] overflow-y-auto">
        {sorted.map((party) => {
          const isSelected = value === party.id;
          return (
            <button
              key={party.id}
              type="button"
              onClick={() => onChange(party.id)}
              className={`relative flex items-center gap-3 px-3 py-2.5 text-left transition-all ${
                isSelected
                  ? 'border-2 border-black bg-neutral-50'
                  : 'border border-neutral-200 bg-white hover:border-black'
              }`}
            >
              <div
                className="w-8 h-8 flex-shrink-0 flex items-center justify-center"
                style={{
                  backgroundColor: party.logoUrl ? 'transparent' : party.color,
                  borderRadius: party.logoUrl ? '0' : '50%',
                  color: '#ffffff',
                }}
              >
                {party.logoUrl ? (
                  <img src={party.logoUrl} alt={party.name} className="max-w-full max-h-full object-contain" />
                ) : (
                  <span className="text-[10px] font-bold">{party.shortName}</span>
                )}
              </div>
              <span className={`text-sm font-medium truncate ${isSelected ? 'text-black' : 'text-neutral-700'}`}>
                {party.name}
              </span>
              {isSelected && (
                <div className="ml-auto w-5 h-5 bg-black rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs">{'\u2713'}</span>
                </div>
              )}
            </button>
          );
        })}
        {/* Oy kullanmadım seçeneği */}
        <button
          type="button"
          onClick={() => onChange('yok')}
          className={`relative flex items-center gap-3 px-3 py-2.5 text-left transition-all ${
            value === 'yok'
              ? 'border-2 border-black bg-neutral-50'
              : 'border border-neutral-200 bg-white hover:border-black'
          }`}
        >
          <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center bg-neutral-300 rounded-full">
            <span className="text-[10px] font-bold text-white">-</span>
          </div>
          <span className={`text-sm font-medium ${value === 'yok' ? 'text-black' : 'text-neutral-700'}`}>
            Oy kullanmadım
          </span>
          {value === 'yok' && (
            <div className="ml-auto w-5 h-5 bg-black rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs">{'\u2713'}</span>
            </div>
          )}
        </button>
      </div>
    </div>
  );
}
