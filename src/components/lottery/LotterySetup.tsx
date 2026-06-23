// src/components/lottery/LotterySetup.tsx
//
// Typing here used to "skip letters": every keystroke fired an async Firestore
// write and then set state after the network round-trip, so a slow earlier
// write would resolve and clobber the input with its stale value. Fixed by
// using react-hook-form (uncontrolled inputs — no re-render per keystroke) and
// only persisting to Firestore on blur / on continue.
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, useFieldArray, Control, UseFormRegister } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import {
  getLotterySession,
  updateTeam,
  updateLotteryStatus,
  generateCombinations
} from '../../services/lotteryService';
import { LotterySession } from '../../types';
import { X, UserPlus, Mail } from 'lucide-react';

interface EmailEntry {
  value: string;
}

interface TeamForm {
  id: string;
  name: string;
  emails: EmailEntry[];
}

interface SetupForm {
  teams: TeamForm[];
}

const toEmailEntries = (emails: string[] | undefined, primary: string): EmailEntry[] => {
  const list = emails && emails.length > 0 ? [...emails] : primary ? [primary] : [''];
  if (list.length === 0) list.push('');
  return list.map((value) => ({ value: value || '' }));
};

const cleanEmails = (entries: EmailEntry[]): string[] =>
  entries.map((e) => e.value.trim()).filter((v) => v !== '');

// A single team card. Pulled into its own component so react-hook-form's nested
// useFieldArray (the co-owner email list) has a stable place to live.
const TeamCard: React.FC<{
  index: number;
  control: Control<SetupForm>;
  register: UseFormRegister<SetupForm>;
  teamId: string;
  rank: number;
  odds: number;
  onSave: (index: number) => void;
}> = ({ index, control, register, rank, odds, onSave }) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `teams.${index}.emails`
  });

  return (
    <div className="p-3 bg-gray-50 rounded shadow-sm border border-gray-200">
      <div className="flex items-center mb-3">
        <div className="flex-shrink-0 w-7 h-7 flex items-center justify-center bg-blue-600 text-white rounded-full mr-2 text-sm font-bold">
          {rank}
        </div>
        <div className="flex-grow mr-2">
          <input
            type="text"
            className="w-full p-1.5 text-sm border rounded"
            placeholder="Team Name"
            {...register(`teams.${index}.name`)}
            onBlur={() => onSave(index)}
          />
        </div>
        <div className="flex-shrink-0 text-right font-medium text-blue-700 text-sm">
          {odds.toFixed(1)}%
        </div>
      </div>

      {/* Primary email (always index 0) */}
      <div className="mb-2 flex items-center">
        <Mail size={14} className="text-gray-400 mr-2 flex-shrink-0" />
        <input
          type="email"
          className="w-full p-1.5 text-sm border rounded"
          placeholder="Primary Owner Email"
          {...register(`teams.${index}.emails.0.value`)}
          onBlur={() => onSave(index)}
        />
      </div>

      {/* Co-owner emails */}
      {fields.slice(1).map((field, i) => {
        const emailIndex = i + 1;
        return (
          <div key={field.id} className="flex items-center mb-2">
            <div className="w-4 mr-2" />
            <input
              type="email"
              className="flex-grow p-1.5 text-sm border rounded"
              placeholder="Co-owner Email"
              {...register(`teams.${index}.emails.${emailIndex}.value`)}
              onBlur={() => onSave(index)}
            />
            <button
              className="ml-1 p-1 text-red-500 hover:bg-red-50 rounded"
              onClick={() => {
                remove(emailIndex);
                onSave(index);
              }}
              aria-label="Remove co-owner email"
              type="button"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}

      <div className="mt-2">
        <button
          className="text-blue-600 hover:text-blue-800 text-xs flex items-center"
          onClick={() => append({ value: '' })}
          type="button"
        >
          <UserPlus size={14} className="mr-1" />
          Add Co-Owner
        </button>
      </div>
    </div>
  );
};

const LotterySetup: React.FC = () => {
  const [lottery, setLottery] = useState<LotterySession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const { lotteryId = '' } = useParams<{ lotteryId?: string }>();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const { control, register, getValues, reset, handleSubmit } = useForm<SetupForm>({
    defaultValues: { teams: [] }
  });
  const { fields } = useFieldArray({ control, name: 'teams' });

  useEffect(() => {
    const fetchLottery = async () => {
      if (!lotteryId) return;
      try {
        setLoading(true);
        const data = await getLotterySession(lotteryId);
        if (!data) {
          setError('Lottery not found');
          return;
        }
        if (data.adminId !== currentUser?.uid) {
          setError('You do not have permission to edit this lottery');
          return;
        }

        setLottery(data);
        reset({
          teams: data.teams.map((team) => ({
            id: team.id,
            name: team.name || '',
            emails: toEmailEntries(team.emails, team.email)
          }))
        });
      } catch (err: any) {
        setError(err.message || 'Failed to load lottery');
      } finally {
        setLoading(false);
      }
    };

    fetchLottery();
  }, [lotteryId, currentUser, reset]);

  // Persist a single team to Firestore (called on blur — not per keystroke).
  const saveTeam = async (index: number) => {
    if (!lotteryId) return;
    const team = getValues(`teams.${index}`);
    if (!team) return;

    const emails = cleanEmails(team.emails);
    try {
      await updateTeam(lotteryId, team.id, {
        name: team.name || '',
        emails,
        email: emails[0] || ''
      });
    } catch (err: any) {
      setError(err.message || 'Failed to save team');
    }
  };

  const onContinue = handleSubmit(async (data) => {
    if (!lotteryId) return;
    try {
      setLoading(true);
      await Promise.all(
        data.teams.map((team) => {
          const emails = cleanEmails(team.emails);
          return updateTeam(lotteryId, team.id, {
            name: team.name || '',
            emails,
            email: emails[0] || ''
          });
        })
      );

      if (lottery?.requiredVerifierCount === 0) {
        await generateCombinations(lotteryId);
        await updateLotteryStatus(lotteryId, 'drawing');
        navigate(`/lottery/${lotteryId}/drawing`);
      } else {
        await updateLotteryStatus(lotteryId, 'verification');
        navigate(`/lottery/${lotteryId}/verification`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update lottery status');
    } finally {
      setLoading(false);
    }
  });

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto my-10 p-6 bg-white rounded-lg shadow-md">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          onClick={() => navigate('/dashboard')}
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (!lottery) {
    return <div>No lottery data available</div>;
  }

  const oddsByIndex = lottery.teams.map((t) => t.oddsPercentage);
  const ranksByIndex = lottery.teams.map((t) => t.rank);

  return (
    <div className="max-w-6xl mx-auto my-10 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-2 text-center">{lottery.name || ''}</h2>
      <p className="text-center text-gray-600 mb-6">Setup your lottery teams</p>

      <h3 className="text-lg font-medium mb-2">Enter Team Information</h3>
      <p className="text-sm text-gray-600 mb-4">
        Teams are listed from worst record (highest odds) to best record (lowest odds)
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        {fields.map((field, index) => (
          <TeamCard
            key={field.id}
            index={index}
            control={control}
            register={register}
            teamId={field.id}
            rank={ranksByIndex[index]}
            odds={oddsByIndex[index]}
            onSave={saveTeam}
          />
        ))}
      </div>

      <div className="mt-6 flex justify-center">
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg"
          onClick={onContinue}
          type="button"
        >
          {lottery.requiredVerifierCount === 0 ? 'Continue to Drawing' : 'Continue to Verification'}
        </button>
      </div>
    </div>
  );
};

export default LotterySetup;
