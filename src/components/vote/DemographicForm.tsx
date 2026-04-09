'use client';

import { useState, useEffect } from 'react';
import { AGE_BRACKETS, INCOME_BRACKETS, GENDER_OPTIONS, EDUCATION_BRACKETS, TURNOUT_OPTIONS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Check, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

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

// Step sırası: 1=gender, 2=ageBracket, 3=education, 4=incomeBracket, 5=turnoutIntention, 6=previousVote2023
function findFirstMissingStep(data?: {
  gender?: string;
  ageBracket?: string;
  education?: string;
  incomeBracket?: string;
  turnoutIntention?: string;
  previousVote2023?: string;
}): number {
  if (!data) return 1;
  if (!data.gender) return 1;
  if (!data.ageBracket) return 2;
  if (!data.education) return 3;
  if (!data.incomeBracket) return 4;
  if (!data.turnoutIntention) return 5;
  if (!data.previousVote2023) return 6;
  return 1;
}

export default function DemographicForm({ onSave, onSkip, loading, parties2023, existingData }: DemographicFormProps) {
  const [step, setStep] = useState(() => findFirstMissingStep(existingData));
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
      setStep(findFirstMissingStep(existingData));
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
      <h2 className="text-xl font-bold mb-1">
        Anketin dogruluğuna katkı sağla
      </h2>
      <p className="text-muted-foreground text-sm mb-6">
        Bu bilgiler anonim olarak saklanır ve sonuçları Türkiye gerçeğine yaklaştırmak için kullanılır.
      </p>

      <Progress value={(step / TOTAL_STEPS) * 100} className="h-1.5 mb-6" />

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

      <Button className="w-full" onClick={handleNext} disabled={loading}>
        {loading ? 'Kaydediliyor...' : isLastStep ? 'Kaydet' : 'Devam'}
      </Button>
      <div className="flex gap-3 mt-3">
        {step > 1 && (
          <Button variant="ghost" className="flex-1" onClick={handleBack}>
            <ArrowLeft className="size-3.5" data-icon="inline-start" />
            Geri
          </Button>
        )}
        <Button variant="ghost" className="flex-1 text-muted-foreground" onClick={onSkip}>
          {currentValue ? 'Atla' : 'Şimdi değil'}
        </Button>
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
      <h3 className="text-sm font-semibold mb-3">{label}</h3>
      <div className="grid grid-cols-2 gap-2">
        {options.map((b) => (
          <Button
            key={b.value}
            type="button"
            variant="outline"
            onClick={() => onChange(b.value)}
            className={cn(
              value === b.value && 'ring-2 ring-ring bg-accent'
            )}
          >
            {b.label}
          </Button>
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
      <h3 className="text-sm font-semibold mb-3">2023 seçiminde hangi partiye oy verdiniz?</h3>
      <div className="flex flex-col gap-1.5 max-h-[40vh] overflow-y-auto">
        {sorted.map((party) => {
          const isSelected = value === party.id;
          return (
            <Button
              key={party.id}
              type="button"
              variant="outline"
              onClick={() => onChange(party.id)}
              className={cn(
                "justify-start gap-3 h-auto px-3 py-2.5 w-full",
                isSelected && 'ring-2 ring-ring bg-accent'
              )}
            >
              <div
                className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center"
                style={{ backgroundColor: party.color, color: '#ffffff' }}
              >
                <span className="text-[10px] font-bold">{party.shortName}</span>
              </div>
              <span className={cn("text-sm font-medium truncate", isSelected ? 'text-foreground' : 'text-foreground/80')}>
                {party.name}
              </span>
              {isSelected && (
                <div className="ml-auto w-5 h-5 bg-primary rounded-full flex items-center justify-center shrink-0">
                  <Check className="size-3 text-primary-foreground" />
                </div>
              )}
            </Button>
          );
        })}
        <Button
          type="button"
          variant="outline"
          onClick={() => onChange('yok')}
          className={cn(
            "justify-start gap-3 h-auto px-3 py-2.5 w-full",
            value === 'yok' && 'ring-2 ring-ring bg-accent'
          )}
        >
          <div className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center bg-muted">
            <span className="text-xs font-bold text-muted-foreground">-</span>
          </div>
          <span className={cn("text-sm font-medium", value === 'yok' ? 'text-foreground' : 'text-foreground/80')}>
            Oy kullanmadım
          </span>
          {value === 'yok' && (
            <div className="ml-auto w-5 h-5 bg-primary rounded-full flex items-center justify-center shrink-0">
              <Check className="size-3 text-primary-foreground" />
            </div>
          )}
        </Button>
      </div>
    </div>
  );
}
