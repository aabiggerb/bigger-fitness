import { ImageSourcePropType } from 'react-native';

/**
 * Mapeo de IDs de ejercicio a sus GIFs locales.
 * Los GIFs se almacenan en assets/gifs/ y se cargan mediante require() estático.
 */
const exerciseGifs: Record<string, ImageSourcePropType> = {
  // ═══ PECHO ═══
  'e2':  require('../../assets/gifs/barbell-bench-press.gif'),         // Press Banca
  'e50': require('../../assets/gifs/incline-barbell-bench-press.gif'), // Press Banca Inclinado
  'e52': require('../../assets/gifs/dumbbell-bench-press.gif'),        // Press Mancuernas Plano
  'e53': require('../../assets/gifs/dumbbell-incline-press.gif'),      // Press Mancuernas Inclinado
  'e54': require('../../assets/gifs/dumbbell-fly.gif'),                // Aperturas con Mancuernas
  'e55': require('../../assets/gifs/incline-dumbbell-fly.gif'),        // Aperturas Inclinadas
  'e56': require('../../assets/gifs/cable-crossover.gif'),             // Cruces en Polea
  'e57': require('../../assets/gifs/chest-dip.gif'),                   // Fondos en Paralelas (Pecho)
  'e58': require('../../assets/gifs/dumbbell-pullover.gif'),           // Pullover con Mancuerna
  'e59': require('../../assets/gifs/machine-chest-press.gif'),         // Press en Máquina
  'e60': require('../../assets/gifs/pec-deck-fly.gif'),                // Pec Deck (Mariposa)
  'e61': require('../../assets/gifs/push-up.gif'),                     // Flexiones
  'e62': require('../../assets/gifs/diamond-push-up.gif'),             // Flexiones Diamante

  // ═══ ESPALDA ═══
  'e3':  require('../../assets/gifs/pull-up.gif'),                     // Dominadas
  'e4':  require('../../assets/gifs/barbell-deadlift.gif'),            // Peso Muerto
  'e63': require('../../assets/gifs/barbell-bent-over-row.gif'),       // Remo con Barra
  'e64': require('../../assets/gifs/dumbbell-row.gif'),                // Remo con Mancuerna
  'e65': require('../../assets/gifs/lat-pulldown.gif'),                // Jalón al Pecho
  'e66': require('../../assets/gifs/lat-pulldown-behind-neck.gif'),    // Jalón Tras Nuca
  'e67': require('../../assets/gifs/seated-cable-row.gif'),            // Remo en Polea Baja
  'e68': require('../../assets/gifs/t-bar-row.gif'),                   // Remo T-Bar
  'e71': require('../../assets/gifs/barbell-romanian-deadlift.gif'),   // Peso Muerto Rumano
  'e73': require('../../assets/gifs/face-pull.gif'),                   // Face Pull
  'e74': require('../../assets/gifs/barbell-shrug.gif'),               // Encogimientos (Shrugs)

  // ═══ HOMBROS ═══
  'e5':  require('../../assets/gifs/barbell-overhead-press.gif'),      // Press Militar
  'e75': require('../../assets/gifs/arnold-press.gif'),                // Press Arnold
  'e76': require('../../assets/gifs/dumbbell-shoulder-press.gif'),     // Press Mancuernas Sentado
  'e77': require('../../assets/gifs/dumbbell-lateral-raise.gif'),      // Elevaciones Laterales
  'e78': require('../../assets/gifs/front-raise.gif'),                 // Elevaciones Frontales
  'e80': require('../../assets/gifs/cable-lateral-raise.gif'),         // Elevación Lateral en Polea
  'e81': require('../../assets/gifs/upright-row.gif'),                 // Remo al Mentón

  // ═══ BÍCEPS ═══
  'e6':  require('../../assets/gifs/dumbbell-curl.gif'),               // Curl Bíceps Mancuernas
  'e82': require('../../assets/gifs/barbell-curl.gif'),                // Curl con Barra
  'e84': require('../../assets/gifs/hammer-curl.gif'),                 // Curl Martillo
  'e85': require('../../assets/gifs/concentration-curl.gif'),          // Curl Concentrado

  // ═══ TRÍCEPS ═══
  'e90': require('../../assets/gifs/chest-dips.gif'),                  // Fondos en Paralelas (Tríceps)
  'e92': require('../../assets/gifs/pushdown.gif'),                    // Extensión de Tríceps Polea
  'e94': require('../../assets/gifs/tricep-kickback.gif'),             // Patada de Tríceps (Kickback)
  'e95': require('../../assets/gifs/close-grip-bench.gif'),            // Press Cerrado

  // ═══ PIERNAS ═══
  'e1':  require('../../assets/gifs/barbell-squat.gif'),               // Sentadilla con Barra
  'e104': require('../../assets/gifs/leg-curl.gif'),                   // Curl de Isquiotibiales
  'e106': require('../../assets/gifs/dumbbell-lunges.gif'),            // Zancadas (Lunges)

  // ═══ GLÚTEOS ═══
  'e112': require('../../assets/gifs/barbell-hip-thrust.gif'),         // Hip Thrust

  // ═══ CORE ═══
  'e123': require('../../assets/gifs/russian-twist.gif'),              // Russian Twist
  'e128': require('../../assets/gifs/dead-bug.gif'),                   // Dead Bug

  // ═══ ANTEBRAZOS ═══
  'e131': require('../../assets/gifs/reverse-wrist-curl.gif'),         // Curl de Muñeca Invertido
};

/**
 * Obtiene el GIF local para un ejercicio dado su ID.
 * Retorna undefined si no hay GIF disponible.
 */
export function getExerciseGif(exerciseId: string): ImageSourcePropType | undefined {
  return exerciseGifs[exerciseId];
}

/**
 * Verifica si un ejercicio tiene GIF local disponible.
 */
export function hasExerciseGif(exerciseId: string): boolean {
  return exerciseId in exerciseGifs;
}

export default exerciseGifs;
