'use client';
import { useEffect, useRef, useState } from 'react';

const fmt = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return `${h ? `${h}:` : ''}${String(m).padStart(h ? 2 : 1, '0')}:${String(sec).padStart(2, '0')}`;
};

/**
 * Sits inside an exam form. Saves answers to this browser as you go (so a reload or a
 * dropped connection loses nothing), shows progress and the countdown, and submits the
 * form when the time runs out.
 */
export function ExamClock({ formId, attemptId, deadline, total }: {
  formId: string; attemptId: string; deadline: string | null; total: number;
}) {
  const key = `cert-academy:attempt:${attemptId}`;
  const end = deadline ? new Date(deadline).getTime() : null;
  const [left, setLeft] = useState<number | null>(end ? end - Date.now() : null);
  const [answered, setAnswered] = useState(0);
  const submitted = useRef(false);

  useEffect(() => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;

    const count = () => {
      const names = new Set<string>();
      for (const el of Array.from(form.elements) as HTMLInputElement[]) {
        if (!el.name?.startsWith('q:')) continue;
        if (((el.type === 'radio' || el.type === 'checkbox') && el.checked) || (el.tagName === 'TEXTAREA' && el.value.trim())) names.add(el.name);
      }
      setAnswered(names.size);
    };
    const save = () => {
      const data: Record<string, string[]> = {};
      for (const [name, value] of new FormData(form).entries()) {
        if (name.startsWith('q:')) (data[name] ??= []).push(String(value));
      }
      try { localStorage.setItem(key, JSON.stringify(data)); } catch { /* storage off: answers still submit */ }
      count();
    };

    // Restore saved answers before anything can submit.
    try {
      const saved = JSON.parse(localStorage.getItem(key) ?? '{}') as Record<string, string[]>;
      for (const el of Array.from(form.elements) as HTMLInputElement[]) {
        const vals = saved[el.name];
        if (!vals) continue;
        if (el.type === 'radio' || el.type === 'checkbox') el.checked = vals.includes(el.value);
        else if (el.tagName === 'TEXTAREA') el.value = vals[0] ?? '';
      }
    } catch { /* nothing saved */ }
    count();

    const onSubmit = () => { submitted.current = true; try { localStorage.removeItem(key); } catch { /* ignore */ } };
    form.addEventListener('change', save);
    form.addEventListener('input', save);
    form.addEventListener('submit', onSubmit);

    const leave = (e: BeforeUnloadEvent) => { if (!submitted.current) e.preventDefault(); };
    window.addEventListener('beforeunload', leave);

    let timer: ReturnType<typeof setInterval> | undefined;
    if (end) {
      const tick = () => {
        const ms = end - Date.now();
        setLeft(ms);
        if (ms <= 0 && !submitted.current) {
          submitted.current = true;
          clearInterval(timer);
          form.requestSubmit();
        }
      };
      tick();
      timer = setInterval(tick, 1000);
    }
    return () => {
      form.removeEventListener('change', save);
      form.removeEventListener('input', save);
      form.removeEventListener('submit', onSubmit);
      window.removeEventListener('beforeunload', leave);
      if (timer) clearInterval(timer);
    };
  }, [formId, key, end]);

  const low = left !== null && left < 5 * 60 * 1000;
  return (
    <div className="exam-bar" role="status">
      <span><b>{answered}</b> of {total} answered</span>
      <div className="exam-bar-track" aria-hidden><span style={{ width: `${total ? (answered / total) * 100 : 0}%` }} /></div>
      {left !== null && <span className={`clock ${low ? 'low' : ''}`}>{left <= 0 ? 'Time is up' : `${fmt(left)} left`}</span>}
    </div>
  );
}
