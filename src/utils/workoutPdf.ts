import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { Asset } from 'expo-asset';
import { ExerciseSet, ExerciseLog } from '../types';

// ─── Types ────
export interface PdfAthleteData {
  clientName: string;
  clientColor: string;
  exercises: {
    name: string;
    muscleGroup: string;
    sets: ExerciseSet[];
    notes?: string;
    exerciseId?: string;
  }[];
}

export interface PdfSessionData {
  date: string;
  duration: string;
  athletes: PdfAthleteData[];
  weightUnit: 'kg' | 'lbs';
  trainerName?: string;
  /** Historical logs for comparison — keyed by `${clientId}:${exerciseId}` */
  historicalLogs?: Record<string, ExerciseLog[]>;
}

// ─── Logo loader ────
let cachedLogoBase64: string | null = null;

async function getLogoBase64(): Promise<string> {
  if (cachedLogoBase64) return cachedLogoBase64;
  try {
    const asset = Asset.fromModule(require('../../assets/logo.png'));
    await asset.downloadAsync();
    if (asset.localUri) {
      const file = new File(asset.localUri);
      const b64 = await file.base64();
      cachedLogoBase64 = `data:image/png;base64,${b64}`;
      return cachedLogoBase64;
    }
  } catch (e) {
    console.warn('Could not load logo for PDF:', e);
  }
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQABNjN9GQAAAABJREFTkSuQmCC';
}

// ─── Helpers ────
function rpeColor(rpe: number): string {
  if (rpe >= 9) return '#d92020';
  if (rpe >= 7) return '#e07a00';
  if (rpe >= 5) return '#0a8a6f';
  return '#5a6478';
}

function rpeBgColor(rpe: number): string {
  if (rpe >= 9) return '#fde8e8';
  if (rpe >= 7) return '#fff1dd';
  if (rpe >= 5) return '#dcfff5';
  return '#e8ecf4';
}

function rpeLabel(rpe: number): string {
  if (rpe >= 9) return 'Máximo';
  if (rpe >= 7) return 'Intenso';
  if (rpe >= 5) return 'Moderado';
  if (rpe >= 3) return 'Ligero';
  return 'Muy Ligero';
}

function formatWeight(w: number, unit: 'kg' | 'lbs'): number {
  return unit === 'lbs' ? Math.round(w * 2.20462 * 10) / 10 : w;
}

function volumeFromSets(sets: ExerciseSet[]): number {
  return sets.reduce((t, s) => t + s.weight * s.reps, 0);
}

function avgRpe(sets: ExerciseSet[]): number | null {
  const withRpe = sets.filter(s => s.rpe && s.rpe > 0);
  if (withRpe.length === 0) return null;
  return Math.round((withRpe.reduce((t, s) => t + (s.rpe || 0), 0) / withRpe.length) * 10) / 10;
}

function bestSet(sets: ExerciseSet[]): ExerciseSet | null {
  if (sets.length === 0) return null;
  return sets.reduce((best, s) => (s.weight > best.weight ? s : best), sets[0]);
}

function deltaArrow(current: number, previous: number): string {
  if (current > previous) return `<span class="delta-up">▲ +${Math.abs(Math.round(current - previous))}</span>`;
  if (current < previous) return `<span class="delta-down">▼ -${Math.abs(Math.round(previous - current))}</span>`;
  return `<span class="delta-same">= 0</span>`;
}

function deltaPercent(current: number, previous: number): string {
  if (previous === 0) return '';
  const pct = ((current - previous) / previous) * 100;
  if (pct > 0) return `<span class="delta-up">+${pct.toFixed(1)}%</span>`;
  if (pct < 0) return `<span class="delta-down">${pct.toFixed(1)}%</span>`;
  return `<span class="delta-same">0%</span>`;
}

// ─── Get previous session data for an exercise ────
function getPreviousSession(
  exerciseId: string | undefined,
  clientName: string,
  historicalLogs?: Record<string, ExerciseLog[]>,
): { sets: ExerciseSet[]; date: string } | null {
  if (!exerciseId || !historicalLogs) return null;

  for (const [key, logs] of Object.entries(historicalLogs)) {
    if (key.endsWith(`:${exerciseId}`) || key === exerciseId) {
      const sorted = [...logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const previous = sorted.find(l => {
        const today = new Date().toISOString().split('T')[0];
        return l.date !== today;
      });
      if (previous) return { sets: previous.sets, date: previous.date };
    }
  }
  return null;
}

// ─── RPE Distribution chart ────
function rpeDistributionHtml(allSets: ExerciseSet[]): string {
  const withRpe = allSets.filter(s => s.rpe && s.rpe > 0);
  if (withRpe.length === 0) return '';

  const buckets: Record<string, { count: number; color: string; label: string }> = {
    '1-4': { count: 0, color: '#5a6478', label: 'Ligero (1-4)' },
    '5-6': { count: 0, color: '#0a8a6f', label: 'Moderado (5-6)' },
    '7-8': { count: 0, color: '#e07a00', label: 'Intenso (7-8)' },
    '9-10': { count: 0, color: '#d92020', label: 'Máximo (9-10)' },
  };

  withRpe.forEach(s => {
    const r = s.rpe!;
    if (r <= 4) buckets['1-4'].count++;
    else if (r <= 6) buckets['5-6'].count++;
    else if (r <= 8) buckets['7-8'].count++;
    else buckets['9-10'].count++;
  });

  const total = withRpe.length;
  const bars = Object.values(buckets).map(b => {
    const pct = total > 0 ? (b.count / total) * 100 : 0;
    return `
      <div class="rpe-row">
        <div class="rpe-row-label">${b.label}</div>
        <div class="rpe-bar-track">
          <div class="rpe-bar-fill" style="width:${pct}%;background:${b.color}"></div>
        </div>
        <div class="rpe-row-val">${b.count} <small>(${pct.toFixed(0)}%)</small></div>
      </div>`;
  }).join('');

  return `
    <div class="analysis-card">
      <div class="analysis-title">📊 Distribución de Intensidad (RPE)</div>
      ${bars}
    </div>`;
}

// ─── Muscle group volume map ────
function muscleVolumeMapHtml(
  exercises: PdfAthleteData['exercises'],
  unit: 'kg' | 'lbs',
): string {
  const muscleMap: Record<string, { volume: number; sets: number; exercises: number }> = {};

  exercises.forEach(ex => {
    const group = ex.muscleGroup || 'Otro';
    if (!muscleMap[group]) muscleMap[group] = { volume: 0, sets: 0, exercises: 0 };
    muscleMap[group].exercises++;
    muscleMap[group].sets += ex.sets.length;
    muscleMap[group].volume += volumeFromSets(ex.sets);
  });

  const entries = Object.entries(muscleMap).sort((a, b) => b[1].volume - a[1].volume);
  const maxVol = entries.length > 0 ? entries[0][1].volume : 1;

  const rows = entries.map(([group, data]) => {
    const displayVol = formatWeight(data.volume, unit);
    const pct = (data.volume / maxVol) * 100;
    return `
      <div class="muscle-row">
        <div class="muscle-name">${group}</div>
        <div class="muscle-bar-track">
          <div class="muscle-bar-fill" style="width:${pct}%"></div>
        </div>
        <div class="muscle-meta">${data.exercises} ej · ${data.sets} series · ${displayVol.toLocaleString()} ${unit}</div>
      </div>`;
  }).join('');

  return `
    <div class="analysis-card">
      <div class="analysis-title">💪 Volumen por Grupo Muscular</div>
      ${rows}
    </div>`;
}

// ─── Build progression chart (SVG line) for an exercise ────
function progressionChartSvg(
  exerciseId: string | undefined,
  clientId: string | undefined,
  currentSets: ExerciseSet[],
  unit: 'kg' | 'lbs',
  historicalLogs?: Record<string, ExerciseLog[]>,
): string {
  if (!exerciseId || !historicalLogs) return '';

  // Collect prior sessions for this exercise
  const allLogs: ExerciseLog[] = [];
  for (const [key, logs] of Object.entries(historicalLogs)) {
    if (key.endsWith(`:${exerciseId}`) || key === exerciseId) {
      allLogs.push(...logs);
    }
  }

  // Group max weight per date
  const byDate = new Map<string, number>();
  allLogs.forEach(l => {
    const max = Math.max(...l.sets.map(s => s.weight));
    if (!byDate.has(l.date) || (byDate.get(l.date)! < max)) byDate.set(l.date, max);
  });

  // Add current session as the last point (today)
  const today = new Date().toISOString().split('T')[0];
  const currentMax = currentSets.length ? Math.max(...currentSets.map(s => s.weight)) : 0;
  if (currentMax > 0) byDate.set(today, currentMax);

  // Build sorted points (last 8)
  const sorted = Array.from(byDate.entries())
    .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
    .slice(-8);

  if (sorted.length < 2) return ''; // not enough data

  const points = sorted.map(([date, w]) => ({
    date,
    weight: formatWeight(w, unit),
  }));

  const W = 340, H = 110, P = 26;
  const innerW = W - P * 2;
  const innerH = H - P * 2 - 14;
  const maxW = Math.max(...points.map(p => p.weight));
  const minW = Math.min(...points.map(p => p.weight));
  const range = Math.max(1, maxW - minW);

  const xs = (i: number) => P + (points.length === 1 ? innerW / 2 : (innerW * i) / (points.length - 1));
  const ys = (w: number) => P + innerH - ((w - minW) / range) * innerH;

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xs(i).toFixed(1)} ${ys(p.weight).toFixed(1)}`).join(' ');

  const dots = points.map((p, i) => {
    const cx = xs(i).toFixed(1);
    const cy = ys(p.weight).toFixed(1);
    const isLast = i === points.length - 1;
    return `<circle cx="${cx}" cy="${cy}" r="${isLast ? 4.5 : 3}" fill="${isLast ? '#0a8a6f' : '#0a192f'}" stroke="#fff" stroke-width="1.5"/>`;
  }).join('');

  const labels = points.map((p, i) => {
    const d = new Date(p.date + 'T12:00:00');
    const lbl = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    return `<text x="${xs(i).toFixed(1)}" y="${(H - 4).toFixed(1)}" font-size="9" fill="#5a6478" text-anchor="middle">${lbl}</text>`;
  }).join('');

  // Grid baseline + max label
  const baseline = `<line x1="${P}" y1="${P + innerH}" x2="${W - P}" y2="${P + innerH}" stroke="#e8ecf4" stroke-width="1"/>`;
  const maxLabel = `<text x="${P - 4}" y="${(P + 4).toFixed(1)}" font-size="9" fill="#5a6478" text-anchor="end">${maxW} ${unit}</text>`;
  const minLabel = `<text x="${P - 4}" y="${(P + innerH + 3).toFixed(1)}" font-size="9" fill="#5a6478" text-anchor="end">${minW} ${unit}</text>`;

  // Trend
  const first = points[0].weight;
  const last = points[points.length - 1].weight;
  const trendPct = first > 0 ? ((last - first) / first) * 100 : 0;
  const trendColor = trendPct > 0 ? '#0a8a6f' : trendPct < 0 ? '#d92020' : '#5a6478';
  const trendArrow = trendPct > 0 ? '▲' : trendPct < 0 ? '▼' : '=';

  return `
    <div class="progress-chart">
      <div class="progress-chart-header">
        <span class="progress-chart-title">📈 Progresión peso máximo</span>
        <span class="progress-chart-trend" style="color:${trendColor}">${trendArrow} ${Math.abs(trendPct).toFixed(0)}% (${points.length} sesiones)</span>
      </div>
      <svg width="100%" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
        ${baseline}
        ${maxLabel}
        ${minLabel}
        <path d="${path}" stroke="#0a192f" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        ${dots}
        ${labels}
      </svg>
    </div>`;
}

// ─── Build exercise comparison card ────
function buildExerciseHtml(
  ex: PdfAthleteData['exercises'][0],
  athleteName: string,
  unit: 'kg' | 'lbs',
  historicalLogs?: Record<string, ExerciseLog[]>,
): string {
  const prev = getPreviousSession(ex.exerciseId, athleteName, historicalLogs);
  const currentVol = volumeFromSets(ex.sets);
  const currentAvgRpe = avgRpe(ex.sets);
  const currentBest = bestSet(ex.sets);

  let comparisonHtml = '';
  if (prev) {
    const prevVol = volumeFromSets(prev.sets);
    const prevBest = bestSet(prev.sets);
    const prevAvgRpe = avgRpe(prev.sets);

    const volDelta = deltaArrow(formatWeight(currentVol, unit), formatWeight(prevVol, unit));
    const volPct = deltaPercent(currentVol, prevVol);
    const bestDelta = currentBest && prevBest
      ? deltaArrow(formatWeight(currentBest.weight, unit), formatWeight(prevBest.weight, unit))
      : '';
    const rpeDelta = currentAvgRpe != null && prevAvgRpe != null
      ? deltaArrow(currentAvgRpe, prevAvgRpe)
      : '';

    const prevDate = new Date(prev.date);
    const prevDateStr = `${prevDate.getDate().toString().padStart(2, '0')}/${(prevDate.getMonth() + 1).toString().padStart(2, '0')}`;

    comparisonHtml = `
      <div class="comparison-strip">
        <div class="comp-badge">vs ${prevDateStr}</div>
        <div class="comp-item">Vol: ${volDelta} ${volPct}</div>
        ${bestDelta ? `<div class="comp-item">Mejor: ${bestDelta}</div>` : ''}
        ${rpeDelta ? `<div class="comp-item">RPE: ${rpeDelta}</div>` : ''}
      </div>`;
  }

  const setRows = ex.sets.map((s, idx) => {
    const displayW = formatWeight(s.weight, unit);
    const vol = s.weight * s.reps;
    const displayVol = formatWeight(vol, unit);

    let weightComp = '';
    let repsComp = '';
    if (prev && prev.sets[idx]) {
      const ps = prev.sets[idx];
      if (s.weight !== ps.weight) {
        const diff = formatWeight(s.weight - ps.weight, unit);
        weightComp = s.weight > ps.weight
          ? `<span class="mini-up">+${diff}</span>`
          : `<span class="mini-down">${diff}</span>`;
      }
      if (s.reps !== ps.reps) {
        const diff = s.reps - ps.reps;
        repsComp = diff > 0
          ? `<span class="mini-up">+${diff}</span>`
          : `<span class="mini-down">${diff}</span>`;
      }
    }

    const rpeHtml = s.rpe
      ? `<span class="rpe-badge" style="background:${rpeBgColor(s.rpe)};color:${rpeColor(s.rpe)};border:1px solid ${rpeColor(s.rpe)}40">${s.rpe}</span>`
      : '<span class="rpe-na">—</span>';

    const rpeBar = s.rpe
      ? `<div class="rpe-mini-bar"><div class="rpe-mini-fill" style="width:${(s.rpe / 10) * 100}%;background:${rpeColor(s.rpe)}"></div></div>`
      : '';

    return `
      <tr>
        <td class="set-num">${s.setNumber}</td>
        <td class="set-val">${displayW > 0 ? `${displayW} ${unit}` : '—'} ${weightComp}</td>
        <td class="set-val">${s.reps > 0 ? s.reps : '—'} ${repsComp}</td>
        <td class="set-vol">${displayVol > 0 ? displayVol.toLocaleString() : '—'}</td>
        <td class="set-rpe">${rpeHtml} ${rpeBar}</td>
      </tr>`;
  }).join('');

  const notesHtml = ex.notes
    ? `<div class="ex-notes"><span class="notes-icon">📝</span> ${ex.notes}</div>`
    : '';

  const chartHtml = progressionChartSvg(ex.exerciseId, undefined, ex.sets, unit, historicalLogs);

  const totalVol = formatWeight(currentVol, unit);
  const isPR = prev && currentBest && bestSet(prev.sets)
    ? currentBest.weight > bestSet(prev.sets)!.weight
    : false;

  return `
    <div class="exercise-card">
      <div class="ex-header">
        <div class="ex-header-left">
          <div class="ex-name">${ex.name}${isPR ? ' <span class="pr-badge">🏆 PR</span>' : ''}</div>
          <div class="ex-muscle">${ex.muscleGroup}</div>
        </div>
        <div class="ex-header-right">
          <div class="ex-stat">${ex.sets.length} series</div>
          <div class="ex-stat">${totalVol.toLocaleString()} ${unit}</div>
          ${currentAvgRpe != null ? `<div class="ex-stat" style="color:${rpeColor(currentAvgRpe)}">RPE ${currentAvgRpe}</div>` : ''}
        </div>
      </div>
      ${comparisonHtml}
      <table class="sets-table">
        <thead>
          <tr>
            <th class="th-set">Serie</th>
            <th class="th-val">Peso</th>
            <th class="th-val">Reps</th>
            <th class="th-val">Volumen</th>
            <th class="th-rpe">RPE</th>
          </tr>
        </thead>
        <tbody>${setRows}</tbody>
      </table>
      ${chartHtml}
      ${notesHtml}
    </div>`;
}

// ─── Build full HTML ────
async function buildHtml(data: PdfSessionData): Promise<string> {
  const logoUri = await getLogoBase64();

  const totalExercises = data.athletes.reduce((t, a) => t + a.exercises.length, 0);
  const totalSets = data.athletes.reduce((t, a) => t + a.exercises.reduce((ts, e) => ts + e.sets.length, 0), 0);
  const totalVolumeRaw = data.athletes.reduce(
    (t, a) => t + a.exercises.reduce((te, ex) => te + volumeFromSets(ex.sets), 0), 0);
  const totalVolume = formatWeight(totalVolumeRaw, data.weightUnit);

  const allSets = data.athletes.flatMap(a => a.exercises.flatMap(e => e.sets));
  const globalAvgRpe = avgRpe(allSets);
  const maxWeightSet = bestSet(allSets);
  const maxWeight = maxWeightSet ? formatWeight(maxWeightSet.weight, data.weightUnit) : 0;
  const totalReps = allSets.reduce((t, s) => t + s.reps, 0);

  const athleteSections = data.athletes.map(athlete => {
    const athleteAllSets = athlete.exercises.flatMap(e => e.sets);
    const athleteVol = formatWeight(volumeFromSets(athleteAllSets), data.weightUnit);
    const athleteAvgRpe = avgRpe(athleteAllSets);
    const athleteMaxSet = bestSet(athleteAllSets);
    const athleteMax = athleteMaxSet ? formatWeight(athleteMaxSet.weight, data.weightUnit) : 0;
    const athleteReps = athleteAllSets.reduce((t, s) => t + s.reps, 0);

    const exerciseCards = athlete.exercises.map(ex =>
      buildExerciseHtml(ex, athlete.clientName, data.weightUnit, data.historicalLogs)
    ).join('');

    const rpeChart = rpeDistributionHtml(athleteAllSets);
    const muscleChart = muscleVolumeMapHtml(athlete.exercises, data.weightUnit);

    return `
      <div class="athlete-section">
        <div class="athlete-header" style="border-left: 4px solid ${athlete.clientColor}">
          <div class="athlete-avatar" style="background:${athlete.clientColor}">${athlete.clientName.charAt(0).toUpperCase()}</div>
          <div class="athlete-info">
            <div class="athlete-name">${athlete.clientName}</div>
            <div class="athlete-subtitle">Evaluación Individual</div>
          </div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-icon">🏋️</div>
            <div class="kpi-value">${athlete.exercises.length}</div>
            <div class="kpi-label">Ejercicios</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon">🔁</div>
            <div class="kpi-value">${athleteAllSets.length}</div>
            <div class="kpi-label">Series</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon">💥</div>
            <div class="kpi-value">${athleteReps}</div>
            <div class="kpi-label">Reps Totales</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon">⚖️</div>
            <div class="kpi-value">${athleteVol.toLocaleString()}</div>
            <div class="kpi-label">Volumen (${data.weightUnit})</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon">🔥</div>
            <div class="kpi-value" ${athleteAvgRpe != null ? `style="color:${rpeColor(athleteAvgRpe)}"` : ''}>${athleteAvgRpe != null ? athleteAvgRpe : '—'}</div>
            <div class="kpi-label">RPE Promedio</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon">🏆</div>
            <div class="kpi-value">${athleteMax} ${data.weightUnit}</div>
            <div class="kpi-label">Peso Máximo</div>
          </div>
        </div>

        <div class="analysis-grid">
          ${rpeChart}
          ${muscleChart}
        </div>

        <div class="exercises-section">
          <div class="section-subtitle">Detalle por Ejercicio</div>
          ${exerciseCards}
        </div>
      </div>`;
  }).join('<div class="page-break"></div>');

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  /* ── Mobile-first PDF: optimized for smartphone screens ── */
  @page { size: 390px 844px; margin: 10px 14px; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif;
    color: #1a1a2e;
    background: #fff;
    font-size: 15px;
    line-height: 1.55;
    max-width: 390px;
    margin: 0 auto;
    padding: 0 4px;
  }
  .page-break { page-break-before: always; margin-top: 0; }

  /* Cover Header */
  .cover-header {
    background: linear-gradient(135deg, #0a192f 0%, #112240 100%);
    border-radius: 18px;
    padding: 22px 20px;
    margin-bottom: 18px;
    color: #fff;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .cover-left { display: flex; align-items: center; gap: 14px; }
  .cover-logo {
    width: 52px; height: 52px; border-radius: 14px;
    object-fit: cover; border: 2px solid rgba(100,255,218,0.3);
  }
  .cover-brand { font-size: 28px; font-weight: 800; letter-spacing: -0.5px; }
  .cover-sub {
    font-size: 11px; color: #64ffda; text-transform: uppercase;
    letter-spacing: 3px; font-weight: 600; margin-top: 2px;
  }
  .cover-right { text-align: left; }
  .cover-title { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
  .cover-meta { font-size: 13px; color: #5a6478; }
  .cover-date { font-size: 15px; color: #64ffda; font-weight: 600; margin-top: 4px; }

  /* Global KPI Strip */
  .global-kpi-strip {
    display: flex; gap: 8px; margin-bottom: 18px; flex-wrap: wrap;
  }
  .global-kpi {
    flex: 1 1 calc(33% - 8px); min-width: 100px;
    background: linear-gradient(135deg, #f0f4ff 0%, #f8faff 100%);
    border-radius: 14px; padding: 14px 10px; text-align: center;
    border: 1px solid #e8ecf4;
  }
  .global-kpi-val { font-size: 26px; font-weight: 800; color: #0a192f; }
  .global-kpi-label {
    font-size: 10px; color: #4a5568; text-transform: uppercase;
    letter-spacing: 1.5px; margin-top: 3px; font-weight: 700;
  }

  /* Athlete section */
  .athlete-section { margin-bottom: 24px; }
  .athlete-header {
    display: flex; align-items: center; gap: 14px;
    padding: 16px 18px;
    background: linear-gradient(135deg, #0a192f 0%, #112240 100%);
    border-radius: 14px; margin-bottom: 16px; color: #fff;
  }
  .athlete-avatar {
    width: 48px; height: 48px; border-radius: 24px; color: #fff;
    font-size: 22px; font-weight: 800; display: flex;
    align-items: center; justify-content: center; flex-shrink: 0;
  }
  .athlete-name { font-size: 20px; font-weight: 700; }
  .athlete-subtitle {
    font-size: 11px; color: #64ffda; text-transform: uppercase;
    letter-spacing: 2px; font-weight: 600; margin-top: 2px;
  }

  /* KPI Grid — 2 columns for mobile */
  .kpi-grid {
    display: flex; gap: 10px; margin-bottom: 16px;
    flex-wrap: wrap;
  }
  .kpi-card {
    flex: 1 1 calc(50% - 10px); min-width: 140px;
    background: #f8faff;
    border: 1px solid #e8ecf4; border-radius: 14px;
    padding: 14px 12px; text-align: center;
  }
  .kpi-icon { font-size: 22px; margin-bottom: 4px; }
  .kpi-value { font-size: 24px; font-weight: 800; color: #0a192f; }
  .kpi-label {
    font-size: 10px; color: #4a5568; text-transform: uppercase;
    letter-spacing: 1px; font-weight: 700; margin-top: 3px;
  }

  /* Analysis Cards — stacked vertically */
  .analysis-grid {
    display: flex; flex-direction: column;
    gap: 12px; margin-bottom: 18px;
  }
  .analysis-card {
    background: #f8faff; border: 1px solid #e8ecf4;
    border-radius: 14px; padding: 16px;
  }
  .analysis-title { font-size: 15px; font-weight: 700; color: #0a192f; margin-bottom: 12px; }
  .rpe-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
  .rpe-row-label { width: 110px; font-size: 13px; color: #2d3748; font-weight: 600; }
  .rpe-bar-track { flex: 1; height: 16px; background: #e8ecf4; border-radius: 8px; overflow: hidden; }
  .rpe-bar-fill { height: 100%; border-radius: 8px; }
  .rpe-row-val { width: 70px; text-align: right; font-size: 13px; font-weight: 700; color: #0a192f; }
  .rpe-row-val small { font-weight: 500; color: #5a6478; }

  .muscle-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
  .muscle-name { width: 90px; font-size: 13px; font-weight: 700; color: #0a192f; }
  .muscle-bar-track { flex: 1; height: 16px; background: #e8ecf4; border-radius: 8px; overflow: hidden; }
  .muscle-bar-fill { height: 100%; border-radius: 8px; background: linear-gradient(90deg, #64ffda, #0a192f); }
  .muscle-meta { width: 100%; font-size: 11px; color: #4a5568; font-weight: 700; text-align: right; }

  /* Section subtitle */
  .section-subtitle {
    font-size: 17px; font-weight: 700; color: #0a192f;
    margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #e8ecf4;
  }

  /* Exercise card */
  .exercise-card {
    border: 1px solid #e8ecf4; border-radius: 14px;
    margin-bottom: 14px; overflow: hidden; break-inside: avoid;
  }
  .ex-header {
    display: flex; flex-direction: column; gap: 8px;
    padding: 14px 16px;
    background: linear-gradient(135deg, #fafbfe 0%, #f5f7ff 100%);
    border-bottom: 1px solid #e8ecf4;
  }
  .ex-header-left { flex: 1; }
  .ex-header-right { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
  .ex-name { font-size: 16px; font-weight: 700; color: #0a192f; }
  .ex-muscle { font-size: 12px; color: #4a5568; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; font-weight: 600; }
  .ex-stat {
    font-size: 13px; font-weight: 700; color: #0a192f;
    background: #e8ecf4; padding: 4px 10px; border-radius: 10px;
  }
  .pr-badge { font-size: 13px; color: #FFD700; }

  /* Comparison strip */
  .comparison-strip {
    display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
    padding: 10px 16px; background: #f0f4ff;
    border-bottom: 1px solid #e8ecf4; font-size: 13px;
  }
  .comp-badge {
    background: #0a192f; color: #64ffda; padding: 4px 10px;
    border-radius: 10px; font-weight: 700; font-size: 11px;
    text-transform: uppercase; letter-spacing: 0.5px;
  }
  .comp-item { font-weight: 600; color: #2d3748; }
  .delta-up { color: #0a8a6f; font-weight: 700; }
  .delta-down { color: #d92020; font-weight: 700; }
  .delta-same { color: #5a6478; font-weight: 600; }
  .mini-up { color: #0a8a6f; font-size: 12px; font-weight: 700; }
  .mini-down { color: #d92020; font-size: 12px; font-weight: 700; }

  /* Sets table */
  .sets-table { width: 100%; border-collapse: collapse; }
  .sets-table th {
    font-size: 10px; color: #4a5568; text-transform: uppercase;
    letter-spacing: 1px; padding: 10px 8px; text-align: center;
    font-weight: 700; background: #fafbfe;
  }
  .th-set { width: 44px; }
  .th-val { text-align: center; }
  .th-rpe { width: 80px; }
  .sets-table td {
    padding: 10px 8px; border-top: 1px solid #f0f2f8;
    text-align: center; font-size: 14px;
  }
  .set-num { font-weight: 700; color: #4a5568; width: 44px; }
  .set-val { font-weight: 700; color: #0a192f; }
  .set-vol { font-weight: 600; color: #4a5568; font-size: 13px; }
  .set-rpe { width: 80px; }
  .rpe-badge {
    display: inline-block; padding: 4px 10px; border-radius: 12px;
    font-size: 14px; font-weight: 700;
  }
  .rpe-na { color: #94a3b8; }
  .rpe-mini-bar {
    display: inline-block; width: 44px; height: 6px; background: #e8ecf4;
    border-radius: 3px; overflow: hidden; vertical-align: middle; margin-left: 4px;
  }
  .rpe-mini-fill { height: 100%; border-radius: 3px; }

  .ex-notes {
    padding: 12px 16px; background: #fefef5;
    border-top: 1px solid #f0f2f8; font-size: 13px;
    color: #2d3748; font-style: italic;
  }
  .notes-icon { font-style: normal; }

  /* Progression chart */
  .progress-chart {
    padding: 12px 16px 6px;
    background: #fafbfe;
    border-top: 1px solid #f0f2f8;
  }
  .progress-chart-header {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 4px;
  }
  .progress-chart-title { font-size: 12px; font-weight: 700; color: #0a192f; }
  .progress-chart-trend { font-size: 12px; font-weight: 700; }

  /* Footer */
  .footer {
    margin-top: 24px; padding-top: 16px; border-top: 2px solid #e8ecf4;
    text-align: center; color: #4a5568; font-size: 12px;
  }
  .footer strong { color: #0a192f; }
  .footer-note { margin-top: 6px; font-size: 10px; color: #5a6478; }
</style>
</head>
<body>

  <div class="cover-header">
    <div class="cover-left">
      <img src="${logoUri}" class="cover-logo" />
      <div>
        <div class="cover-brand">Secret</div>
        <div class="cover-sub">Training System</div>
      </div>
    </div>
    <div class="cover-right">
      <div class="cover-title">Informe de Entrenamiento</div>
      <div class="cover-meta">${data.trainerName ? `Entrenador: ${data.trainerName} · ` : ''}Duración: ${data.duration}</div>
      <div class="cover-date">📅 ${data.date}</div>
    </div>
  </div>

  <div class="global-kpi-strip">
    <div class="global-kpi">
      <div class="global-kpi-val">${data.athletes.length}</div>
      <div class="global-kpi-label">Atletas</div>
    </div>
    <div class="global-kpi">
      <div class="global-kpi-val">${totalExercises}</div>
      <div class="global-kpi-label">Ejercicios</div>
    </div>
    <div class="global-kpi">
      <div class="global-kpi-val">${totalSets}</div>
      <div class="global-kpi-label">Series</div>
    </div>
    <div class="global-kpi">
      <div class="global-kpi-val">${totalReps}</div>
      <div class="global-kpi-label">Repeticiones</div>
    </div>
    <div class="global-kpi">
      <div class="global-kpi-val">${totalVolume.toLocaleString()}</div>
      <div class="global-kpi-label">Volumen (${data.weightUnit})</div>
    </div>
    <div class="global-kpi">
      <div class="global-kpi-val">${maxWeight}</div>
      <div class="global-kpi-label">Peso Máx (${data.weightUnit})</div>
    </div>
    ${globalAvgRpe != null ? `
    <div class="global-kpi">
      <div class="global-kpi-val" style="color:${rpeColor(globalAvgRpe)}">${globalAvgRpe}</div>
      <div class="global-kpi-label">RPE Promedio</div>
    </div>` : ''}
  </div>

  ${athleteSections}

  <div class="footer">
    Generado por <strong>Secret Training System</strong> · ${data.date} · ${data.duration}
    <div class="footer-note">Los datos comparativos se basan en la sesión anterior registrada para cada ejercicio.</div>
  </div>

</body>
</html>`;
}

// ─── Generate PDF and share ────
export async function generateAndShareWorkoutPdf(data: PdfSessionData): Promise<void> {
  const html = await buildHtml(data);

  const { uri } = await Print.printToFileAsync({
    html,
    base64: false,
    // Mobile-first: page size similar to a smartphone screen (iPhone)
    width: 390,
    height: 844,
  });

  const fileName = `Informe_${data.date.replace(/\//g, '-')}_${Date.now()}.pdf`;
  const srcFile = new File(uri);
  const destFile = new File(Paths.cache, fileName);

  try {
    if (destFile.exists) destFile.delete();
  } catch (_) { /* ignore */ }

  srcFile.move(destFile);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(destFile.uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Compartir Informe de Entrenamiento',
      UTI: 'com.adobe.pdf',
    });
  }
}
