// @ts-nocheck
'use client';

import { useState } from 'react';

export default function DynamicForm({ questions = [], onUpdate, disabled = false }) {
  const [answers, setAnswers] = useState({});

  const handleChange = (id, value) => {
    if (disabled) return;
    const newAnswers = { ...answers, [id]: value };
    setAnswers(newAnswers);
    onUpdate?.(newAnswers);
    console.log(`📝 Respuesta guardada: ${id} = ${value}`, newAnswers);
  };

  if (!Array.isArray(questions) || questions.length === 0) {
    return (
      <div className="p-10 text-center bg-slate-50 rounded-3xl border-2 border-dashed">
        <p className="text-slate-400 italic">⚠️ No hay preguntas configuradas.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {questions.map((q, idx) => {
        // Normalizar el tipo: 'cumple_no_cumple' → toggle, 'texto' → text
        const tipo = q.tipo === 'cumple_no_cumple' ? 'toggle'
                   : q.tipo === 'texto' ? 'text'
                   : q.tipo;

        return (
          <div key={q.id || idx} className="bg-white p-5 rounded-2xl border shadow-sm">
            <label className="block text-sm font-black text-slate-800 mb-3">
              <span className="text-blue-600 mr-2">{idx + 1}.</span> {q.pregunta}
            </label>
            {tipo === 'toggle' && (
              <div className="flex gap-4">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => handleChange(q.id, true)}
                  className={`flex-1 py-4 rounded-xl text-xs font-black transition ${answers[q.id] === true ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-500'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-50'}`}
                >
                  CUMPLE
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => handleChange(q.id, false)}
                  className={`flex-1 py-4 rounded-xl text-xs font-black transition ${answers[q.id] === false ? 'bg-red-600 text-white' : 'bg-slate-50 text-slate-500'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-50'}`}
                >
                  NO CUMPLE
                </button>
              </div>
            )}
            {tipo === 'text' && (
              <textarea
                disabled={disabled}
                readOnly={disabled}
                className={`w-full bg-slate-50 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                rows={3}
                placeholder={disabled ? '' : 'Escribe aquí...'}
                onChange={(e) => handleChange(q.id, e.target.value)}
                value={answers[q.id] || ''}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}