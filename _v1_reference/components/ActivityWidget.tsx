import React, { useState, useEffect } from 'react';
import { ActivityData, ActivityType } from '../types';

interface ActivityWidgetProps {
  data: ActivityData;
  onComplete: (success: boolean, score: number) => void;
}

const ActivityWidget: React.FC<ActivityWidgetProps> = ({ data, onComplete }) => {
  const [isCompleted, setIsCompleted] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');
  const [error, setError] = useState(false);
  const [matches, setMatches] = useState<Record<string, string>>({}); // term -> definition
  const [selectedTerm, setSelectedTerm] = useState<string | null>(null);

  // QUIZ LOGIC
  const handleQuizSubmit = (option: string) => {
    if (isCompleted) return;
    setSelectedOption(option);
    setIsCompleted(true);
    const isCorrect = option === data.correctAnswer;
    setTimeout(() => onComplete(isCorrect, isCorrect ? 10 : 0), 1000);
  };

  // FILL BLANK LOGIC
  const handleBlankSubmit = () => {
    if (isCompleted) return;

    // If the AI provided a correctAnswer, validate against it.
    // If no correctAnswer was provided, we fallback to accepting any non-empty input (legacy behavior/fail-safe).
    if (data.correctAnswer) {
        const normalizedInput = textInput.trim().toLowerCase();
        const normalizedAnswer = data.correctAnswer.toString().trim().toLowerCase();

        if (normalizedInput !== normalizedAnswer) {
            setError(true);
            // Shake or show error, do not complete
            return;
        }
    }

    setError(false);
    setIsCompleted(true);
    onComplete(true, 5); 
  };

  // Reset error when typing
  useEffect(() => {
    if (error) setError(false);
  }, [textInput]);

  // MATCHING LOGIC
  const handleMatchClick = (item: string, type: 'term' | 'def') => {
    if (isCompleted) return;

    if (type === 'term') {
      setSelectedTerm(item);
    } else {
      if (selectedTerm) {
        // Check if correct pair
        const correctDef = data.pairs?.find(p => p.term === selectedTerm)?.definition;
        if (correctDef === item) {
          setMatches(prev => ({ ...prev, [selectedTerm]: item }));
          setSelectedTerm(null);
        } else {
           // Wrong match animation could go here
           setSelectedTerm(null);
        }
      }
    }
  };

  useEffect(() => {
    if (data.type === ActivityType.MATCHING && data.pairs) {
      if (Object.keys(matches).length === data.pairs.length) {
        setIsCompleted(true);
        setTimeout(() => onComplete(true, 15), 1000);
      }
    }
  }, [matches, data.pairs, data.type, onComplete]);


  // RENDERERS
  if (data.type === ActivityType.QUIZ) {
    return (
      <div className="bg-white p-4 rounded-xl shadow-sm border border-amber-100 my-2 w-full max-w-md">
        <h3 className="font-serif text-lg text-ink mb-3">{data.question}</h3>
        <div className="space-y-2">
          {data.options?.map((opt, idx) => (
            <button
              key={idx}
              onClick={() => handleQuizSubmit(opt)}
              className={`w-full text-left p-3 rounded-lg transition-colors border ${
                selectedOption === opt 
                  ? (opt === data.correctAnswer ? 'bg-emerald-100 border-emerald-500' : 'bg-red-100 border-red-500')
                  : 'bg-amber-50 hover:bg-amber-100 border-transparent'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (data.type === ActivityType.FILL_BLANK) {
    const parts = data.sentence?.split('___');
    return (
      <div className="bg-white p-4 rounded-xl shadow-sm border border-amber-100 my-2 w-full max-w-md">
        <h3 className="font-serif text-lg text-ink mb-3">Fill in the missing word:</h3>
        <div className="text-lg leading-relaxed">
          {parts?.[0]}
          <input 
            type="text" 
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            disabled={isCompleted}
            className={`mx-2 border-b-2 outline-none bg-transparent text-center font-bold w-32 transition-colors ${
                error 
                ? 'border-red-500 text-red-600' 
                : 'border-amber-400 text-ink focus:border-amber-600'
            }`}
            placeholder="?"
          />
          {parts?.[1]}
        </div>
        {error && (
            <div className="text-red-500 text-sm mt-2">That doesn't look quite right. Try again!</div>
        )}
        {!isCompleted && (
          <button 
            onClick={handleBlankSubmit}
            disabled={!textInput}
            className="mt-4 bg-amber-800 text-white px-4 py-2 rounded-lg hover:bg-amber-900 disabled:opacity-50"
          >
            Check Answer
          </button>
        )}
      </div>
    );
  }

  if (data.type === ActivityType.MATCHING) {
    const terms = data.pairs?.map(p => p.term) || [];
    const defs = data.pairs?.map(p => p.definition).sort(() => Math.random() - 0.5) || [];

    return (
      <div className="bg-white p-4 rounded-xl shadow-sm border border-amber-100 my-2 w-full max-w-md">
        <h3 className="font-serif text-lg text-ink mb-3">Match the pairs:</h3>
        <div className="flex justify-between gap-4">
          <div className="flex flex-col gap-2 flex-1">
            {terms.map(term => (
              <button
                key={term}
                disabled={!!matches[term]}
                onClick={() => handleMatchClick(term, 'term')}
                className={`p-2 rounded border text-sm ${
                  matches[term] 
                    ? 'bg-emerald-100 border-emerald-300 opacity-50' 
                    : selectedTerm === term 
                      ? 'bg-amber-200 border-amber-400' 
                      : 'bg-amber-50 border-amber-100'
                }`}
              >
                {term}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2 flex-1">
             {defs.map(def => {
               const isMatched = Object.values(matches).includes(def);
               return (
                <button
                  key={def}
                  disabled={isMatched}
                  onClick={() => handleMatchClick(def, 'def')}
                  className={`p-2 rounded border text-sm ${
                    isMatched 
                      ? 'bg-emerald-100 border-emerald-300 opacity-50' 
                      : 'bg-white border-gray-200'
                  }`}
                >
                  {def}
                </button>
               )
             })}
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default ActivityWidget;