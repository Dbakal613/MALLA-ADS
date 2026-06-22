/**
 * Returns a contextual academic message based on the student's situation.
 * Pure function — no DOM access, no side effects.
 *
 * @param {object} ctx
 * @param {string}      ctx.name
 * @param {string}      ctx.preferredPace   'rapida' | 'equilibrada' | 'tranquila'
 * @param {Set}         ctx.approved
 * @param {Set}         ctx.failed
 * @param {Set}         ctx.notTaken
 * @param {object}      ctx.plan            { semNum: [courseId] }
 * @param {number|null} ctx.currentSem
 * @returns {{ type: string, title: string, message: string }}
 */

import { COURSES } from './data.js';

const PACE_MAX_SCT = { rapida: 33, equilibrada: 28, tranquila: 26 };

export function getContextualAcademicMessage({ name, preferredPace, approved, failed, notTaken, plan, currentSem }) {
  const pct     = Math.round((approved?.size ?? 0) / COURSES.length * 100);
  const delayed = (failed?.size ?? 0) + (notTaken?.size ?? 0);
  const pace    = preferredPace || 'equilibrada';
  const n       = name?.trim() || '';

  // ── 1. Overloaded future semester ────────────────────────────────────────────
  const maxSCT    = PACE_MAX_SCT[pace] ?? 28;
  const hasOverload = currentSem && Object.entries(plan ?? {}).some(([sem, ids]) => {
    if (Number(sem) <= currentSem) return false;
    const sct = ids.reduce((sum, id) => {
      const c = COURSES.find(c => c.id === id);
      return sum + (c?.credits ?? 0);
    }, 0);
    return sct > maxSCT;
  });

  if (hasOverload) {
    return {
      type: 'warning',
      title: 'Carga alta en el plan',
      message: {
        rapida:      n ? `Incluso yendo rápido, ${n}, algún semestre del plan se ve muy cargado. Mover un ramo puede hacer la diferencia entre avanzar bien o tener que repetir.`
                       : 'Incluso yendo rápido, algún semestre del plan se ve muy cargado. Mover un ramo puede hacer la diferencia.',
        equilibrada: n ? `${n}, algún semestre del plan se ve cargado. Podríamos mover algún ramo para que la distribución sea más sostenible.`
                       : 'Algún semestre del plan se ve cargado. Podríamos mover algún ramo para que la distribución sea más sostenible.',
        tranquila:   n ? `${n}, con una ruta tranquila conviene cuidar la carga semestre a semestre. Revisa si puedes mover algún ramo.`
                       : 'Con una ruta tranquila conviene cuidar la carga semestre a semestre. Revisa si puedes mover algún ramo.',
      }[pace],
    };
  }

  // ── 2. Many delayed courses ───────────────────────────────────────────────────
  if (delayed >= 3) {
    return {
      type: 'support',
      title: 'Podemos reorganizar',
      message: {
        rapida:      n ? `No te preocupes, ${n}. Esto no significa que estés sin alternativas. Ajustemos la ruta para recuperar el ritmo de forma ordenada.`
                       : 'No te preocupes. Esto no significa que estés sin alternativas. Ajustemos la ruta para recuperar el ritmo.',
        equilibrada: n ? `No te preocupes, ${n}. Esto no significa que estés sin alternativas. Podemos ajustar la ruta para avanzar de forma más ordenada.`
                       : 'No te preocupes. Esto no significa que estés sin alternativas. Podemos ajustar la ruta para avanzar de forma más ordenada.',
        tranquila:   n ? `No te preocupes, ${n}. Esto no significa que estés sin alternativas. Podemos ir paso a paso, reorganizando con calma.`
                       : 'No te preocupes. Esto no significa que estés sin alternativas. Podemos ir paso a paso, reorganizando con calma.',
      }[pace],
    };
  }

  // ── 3. High progress (≥ 70 %) ─────────────────────────────────────────────────
  if (pct >= 70) {
    return {
      type: 'positive',
      title: 'Vas muy bien',
      message: {
        rapida:      n ? `${n}, ya tienes una parte importante del camino avanzado. Mantén el ritmo pero cuida los prerrequisitos del tramo final — una cadena rota aquí puede costar caro.`
                       : 'Ya tienes una parte importante del camino avanzado. Mantén el ritmo pero cuida los prerrequisitos del tramo final.',
        equilibrada: n ? `${n}, ya tienes una parte importante del camino avanzado. Ahora conviene cuidar bien las decisiones del tramo final.`
                       : 'Ya tienes una parte importante del camino avanzado. Ahora conviene cuidar bien las decisiones del tramo final.',
        tranquila:   n ? `${n}, ya tienes una parte importante del camino avanzado. Tómate el tiempo que necesitas para cerrar bien esta última etapa.`
                       : 'Ya tienes una parte importante del camino avanzado. Tómate el tiempo que necesitas para cerrar bien esta última etapa.',
      }[pace],
    };
  }

  // ── 4. Medium progress (35 – 69 %) ───────────────────────────────────────────
  if (pct >= 35) {
    return {
      type: 'info',
      title: 'Buen avance',
      message: {
        rapida:      n ? `${n}, ya estás construyendo una ruta sólida. Sigues bien encaminado — revisemos qué ramos tomar ahora para mantener el impulso.`
                       : 'Ya estás construyendo una ruta sólida. Revisemos qué ramos tomar ahora para mantener el impulso.',
        equilibrada: n ? `${n}, ya estás construyendo una ruta sólida. Revisemos qué ramos te conviene tomar ahora para seguir avanzando con claridad.`
                       : 'Ya estás construyendo una ruta sólida. Revisemos qué ramos te conviene tomar ahora para seguir avanzando con claridad.',
        tranquila:   n ? `${n}, ya estás construyendo una ruta sólida. Sigues avanzando bien — revisemos qué viene sin apresurarte.`
                       : 'Ya estás construyendo una ruta sólida. Sigues avanzando bien — revisemos qué viene sin apresurarte.',
      }[pace],
    };
  }

  // ── 5. Low progress (< 35 %) — default ───────────────────────────────────────
  return {
    type: 'info',
    title: 'Buen punto de partida',
    message: {
      rapida:      n ? `${n}, este es un buen momento para ordenar la ruta desde el comienzo y arrancar con fuerza antes de que lleguen los ramos más complejos.`
                     : 'Este es un buen momento para ordenar la ruta desde el comienzo y arrancar con fuerza antes de que lleguen los ramos más complejos.',
      equilibrada: n ? `${n}, este es un buen momento para ordenar la ruta desde el comienzo y evitar sobrecargas más adelante.`
                     : 'Este es un buen momento para ordenar la ruta desde el comienzo y evitar sobrecargas más adelante.',
      tranquila:   n ? `${n}, este es un buen momento para ordenar la ruta con calma desde el comienzo. Un buen punto de partida evita muchos problemas después.`
                     : 'Este es un buen momento para ordenar la ruta con calma desde el comienzo. Un buen punto de partida evita muchos problemas después.',
    }[pace],
  };
}
