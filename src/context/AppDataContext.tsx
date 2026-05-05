import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { View, ActivityIndicator, Text, StyleSheet as RNStyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Client, Exercise, Routine, TrainingSession, Measurement, ProgressPhoto, ClientGoal, ClientPlan, ExerciseLog } from '../types';
import { generateId } from '../utils/generateId';

const STORAGE_KEYS = {
  clients: '@secret_clients',
  exercises: '@secret_exercises',
  routines: '@secret_routines',
  sessions: '@secret_sessions',
  exerciseLogs: '@secret_exerciseLogs',
  initialized: '@secret_initialized',
  seedVersion: '@secret_seed_version',
} as const;

// Increment this whenever seed exercise/routine data changes to force re-seed
const CURRENT_SEED_VERSION = '4';

interface AppDataContextType {
  isLoading: boolean;
  clients: Client[];
  exercises: Exercise[];
  routines: Routine[];
  sessions: TrainingSession[];
  exerciseLogs: ExerciseLog[];
  // Client CRUD
  addClient: (client: Client) => void;
  updateClient: (id: string, data: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  // Measurements
  addMeasurement: (clientId: string, measurement: Measurement) => void;
  deleteMeasurement: (clientId: string, measurementId: string) => void;
  // Progress Photos
  addProgressPhoto: (clientId: string, photo: ProgressPhoto) => void;
  deleteProgressPhoto: (clientId: string, photoId: string) => void;
  // Goals
  addGoal: (clientId: string, goal: ClientGoal) => void;
  updateGoal: (clientId: string, goalId: string, data: Partial<ClientGoal>) => void;
  deleteGoal: (clientId: string, goalId: string) => void;
  toggleGoalComplete: (clientId: string, goalId: string) => void;
  // Plans
  assignPlan: (clientId: string, plan: ClientPlan) => void;
  updatePlan: (clientId: string, planId: string, data: Partial<ClientPlan>) => void;
  removePlan: (clientId: string, planId: string) => void;
  // Exercise CRUD
  addExercise: (exercise: Exercise) => void;
  updateExercise: (id: string, data: Partial<Exercise>) => void;
  deleteExercise: (id: string) => void;
  // Routine CRUD
  addRoutine: (routine: Routine) => void;
  updateRoutine: (id: string, data: Partial<Routine>) => void;
  deleteRoutine: (id: string) => void;
  // Session CRUD
  addSession: (session: TrainingSession) => void;
  // Exercise Logs
  addExerciseLog: (log: ExerciseLog) => void;
  updateExerciseLog: (logId: string, data: Partial<ExerciseLog>) => void;
  deleteExerciseLog: (logId: string) => void;
  getLogsForExercise: (exerciseId: string, clientId?: string) => ExerciseLog[];
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

export const AppDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const isInitialLoad = useRef(true);

  // ─── Persistence helpers ───────────────
  const saveToStorage = useCallback(async (key: string, data: unknown) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error(`Error saving ${key}:`, e);
    }
  }, []);

  // Auto-save whenever state changes (skip initial load)
  useEffect(() => {
    if (!isLoaded || isInitialLoad.current) return;
    saveToStorage(STORAGE_KEYS.clients, clients);
  }, [clients, isLoaded, saveToStorage]);

  useEffect(() => {
    if (!isLoaded || isInitialLoad.current) return;
    saveToStorage(STORAGE_KEYS.exercises, exercises);
  }, [exercises, isLoaded, saveToStorage]);

  useEffect(() => {
    if (!isLoaded || isInitialLoad.current) return;
    saveToStorage(STORAGE_KEYS.routines, routines);
  }, [routines, isLoaded, saveToStorage]);

  useEffect(() => {
    if (!isLoaded || isInitialLoad.current) return;
    saveToStorage(STORAGE_KEYS.sessions, sessions);
  }, [sessions, isLoaded, saveToStorage]);

  useEffect(() => {
    if (!isLoaded || isInitialLoad.current) return;
    saveToStorage(STORAGE_KEYS.exerciseLogs, exerciseLogs);
  }, [exerciseLogs, isLoaded, saveToStorage]);

  // ─── Load from storage or seed defaults ─
  useEffect(() => {
    const loadData = async () => {
      try {
        const wasInitialized = await AsyncStorage.getItem(STORAGE_KEYS.initialized);
        const storedSeedVersion = await AsyncStorage.getItem(STORAGE_KEYS.seedVersion);

        if (wasInitialized) {
          // Load persisted data
          const [storedClients, storedExercises, storedRoutines, storedSessions, storedLogs] = await Promise.all([
            AsyncStorage.getItem(STORAGE_KEYS.clients),
            AsyncStorage.getItem(STORAGE_KEYS.exercises),
            AsyncStorage.getItem(STORAGE_KEYS.routines),
            AsyncStorage.getItem(STORAGE_KEYS.sessions),
            AsyncStorage.getItem(STORAGE_KEYS.exerciseLogs),
          ]);

          // Defensive: if data was lost (initialized flag exists but no exercises), re-seed everything
          if (!storedExercises || JSON.parse(storedExercises).length === 0) {
            console.log('Data loss detected — re-seeding all defaults...');
            if (storedClients) setClients(JSON.parse(storedClients));
            if (storedSessions) setSessions(JSON.parse(storedSessions));
            if (storedLogs) setExerciseLogs(JSON.parse(storedLogs));
            seedDefaultExercises();
            const existingRoutines: Routine[] = storedRoutines ? JSON.parse(storedRoutines) : [];
            const userRoutines = existingRoutines.filter(r => !r.isTemplate);
            seedDefaultRoutines(userRoutines);
            await AsyncStorage.setItem(STORAGE_KEYS.seedVersion, CURRENT_SEED_VERSION);
          } else if (storedSeedVersion !== CURRENT_SEED_VERSION) {
            // Seed version changed → re-seed exercises + template routines
            console.log(`Seed version changed (${storedSeedVersion} → ${CURRENT_SEED_VERSION}), re-seeding exercises & routines...`);
            if (storedClients) setClients(JSON.parse(storedClients));
            if (storedSessions) setSessions(JSON.parse(storedSessions));
            if (storedLogs) setExerciseLogs(JSON.parse(storedLogs));
            seedDefaultExercises();
            const existingRoutines: Routine[] = storedRoutines ? JSON.parse(storedRoutines) : [];
            const userRoutines = existingRoutines.filter(r => !r.isTemplate);
            seedDefaultRoutines(userRoutines);
            await AsyncStorage.setItem(STORAGE_KEYS.seedVersion, CURRENT_SEED_VERSION);
          } else {
            if (storedClients) setClients(JSON.parse(storedClients));
            if (storedExercises) setExercises(JSON.parse(storedExercises));
            if (storedRoutines) setRoutines(JSON.parse(storedRoutines));
            if (storedSessions) setSessions(JSON.parse(storedSessions));
            if (storedLogs) setExerciseLogs(JSON.parse(storedLogs));
          }
        } else {
          // First launch: seed with demo data
          seedDefaultData();
          await AsyncStorage.setItem(STORAGE_KEYS.initialized, 'true');
          await AsyncStorage.setItem(STORAGE_KEYS.seedVersion, CURRENT_SEED_VERSION);
        }
      } catch (e) {
        console.error('Error loading data:', e);
        // Fallback: seed defaults
        seedDefaultData();
      } finally {
        setIsLoaded(true);
        // Allow auto-save after a short delay to skip the initial setState calls
        setTimeout(() => { isInitialLoad.current = false; }, 500);
      }
    };

    loadData();
  }, []);

  const seedDefaultExercises = () => {
    setExercises([
      // ═══════════════════════════════════════════
      // PECHO — Chest
      // ═══════════════════════════════════════════
      { id: 'e2', name: 'Press Banca', muscleGroup: ['Pecho'], description: 'Press de banca plano con barra. Ejercicio fundamental para desarrollo de pectoral mayor.', equipment: 'Barra y banco', popularity: 5, icon: '🏋️', isDefault: true, difficulty: 'Intermedio',
        primaryMuscles: ['Pectoral Mayor (porción esternal)', 'Pectoral Mayor (porción clavicular)'],
        secondaryMuscles: ['Deltoides Anterior', 'Tríceps Braquial', 'Serrato Anterior'],
        instructions: ['Acuéstate en el banco con los pies firmes en el suelo', 'Agarra la barra con un ancho ligeramente mayor al de los hombros', 'Retrae las escápulas y arquea ligeramente la espalda baja', 'Baja la barra controladamente hasta tocar el pecho medio', 'Empuja la barra hacia arriba extendiendo los codos sin bloquearlos'],
        tips: ['Mantén las muñecas rectas y alineadas con los antebrazos', 'No rebotes la barra en el pecho', 'Exhala al empujar, inhala al bajar', 'Usa un compañero de entrenamiento para cargas pesadas'],
        commonMistakes: ['Rebotar la barra en el pecho', 'Levantar los glúteos del banco', 'Agarre demasiado ancho o estrecho', 'No retraer las escápulas'] },
      { id: 'e50', name: 'Press Banca Inclinado', muscleGroup: ['Pecho', 'Hombros'], description: 'Press en banco inclinado 30-45°. Enfatiza pecho superior y deltoides anterior.', equipment: 'Barra y banco inclinado', popularity: 5, icon: '🏋️', isDefault: true, difficulty: 'Intermedio',
        primaryMuscles: ['Pectoral Mayor (porción clavicular)', 'Deltoides Anterior'],
        secondaryMuscles: ['Tríceps Braquial', 'Serrato Anterior'],
        instructions: ['Ajusta el banco a 30-45 grados de inclinación', 'Acuéstate con la espalda apoyada y pies en el suelo', 'Desmonta la barra y bájala hasta la parte alta del pecho', 'Empuja hacia arriba en línea recta hasta extensión completa'],
        tips: ['30° activa más pecho, 45° más hombro', 'Mantén los codos a ~75° del torso', 'No arquees excesivamente la espalda'],
        commonMistakes: ['Inclinar el banco demasiado (se convierte en press de hombro)', 'Bajar la barra al pecho medio en vez del pecho alto'] },
      { id: 'e51', name: 'Press Banca Declinado', muscleGroup: ['Pecho'], description: 'Press en banco declinado. Trabaja la porción inferior del pectoral.', equipment: 'Barra y banco declinado', popularity: 3, icon: '🏋️', isDefault: true },
      { id: 'e52', name: 'Press Mancuernas Plano', muscleGroup: ['Pecho'], description: 'Press plano con mancuernas. Mayor rango de movimiento que con barra.', equipment: 'Mancuernas y banco', popularity: 5, icon: '💪', isDefault: true, difficulty: 'Intermedio',
        primaryMuscles: ['Pectoral Mayor', 'Deltoides Anterior'],
        secondaryMuscles: ['Tríceps Braquial', 'Bíceps (estabilizador)'],
        instructions: ['Siéntate con las mancuernas sobre los muslos', 'Acuéstate llevando las mancuernas al pecho', 'Empuja hacia arriba juntando ligeramente las mancuernas', 'Baja controladamente abriendo los codos a 75°'],
        tips: ['Mayor rango de movimiento que la barra', 'Permite corregir desbalances entre lados', 'No choques las mancuernas arriba'],
        commonMistakes: ['Usar impulso para levantar', 'Abrir demasiado los codos'] },
      { id: 'e53', name: 'Press Mancuernas Inclinado', muscleGroup: ['Pecho', 'Hombros'], description: 'Press inclinado con mancuernas. Excelente para pecho superior.', equipment: 'Mancuernas y banco inclinado', popularity: 4, icon: '💪', isDefault: true },
      { id: 'e54', name: 'Aperturas con Mancuernas', muscleGroup: ['Pecho'], description: 'Aperturas en banco plano. Aislamiento del pectoral con estiramiento profundo.', equipment: 'Mancuernas y banco', popularity: 4, icon: '🦋', isDefault: true },
      { id: 'e55', name: 'Aperturas Inclinadas', muscleGroup: ['Pecho'], description: 'Aperturas en banco inclinado para pecho superior.', equipment: 'Mancuernas y banco inclinado', popularity: 3, icon: '🦋', isDefault: true },
      { id: 'e56', name: 'Cruces en Polea', muscleGroup: ['Pecho'], description: 'Cable crossover. Tensión constante en el pectoral durante todo el recorrido.', equipment: 'Polea doble', popularity: 4, icon: '🔗', isDefault: true },
      { id: 'e57', name: 'Fondos en Paralelas (Pecho)', muscleGroup: ['Pecho', 'Tríceps'], description: 'Fondos inclinando el torso hacia adelante. Gran activador de pecho inferior.', equipment: 'Barras paralelas', popularity: 4, icon: '🤸', isDefault: true },
      { id: 'e58', name: 'Pullover con Mancuerna', muscleGroup: ['Pecho', 'Espalda'], description: 'Pullover para expandir caja torácica y trabajar pectoral y dorsal.', equipment: 'Mancuerna y banco', popularity: 3, icon: '🔄', isDefault: true },
      { id: 'e59', name: 'Press en Máquina', muscleGroup: ['Pecho'], description: 'Press de pecho en máquina. Ideal para principiantes y aislamiento seguro.', equipment: 'Máquina de press', popularity: 3, icon: '🖥️', isDefault: true },
      { id: 'e60', name: 'Pec Deck (Mariposa)', muscleGroup: ['Pecho'], description: 'Máquina de aperturas. Aislamiento puro del pectoral.', equipment: 'Máquina pec deck', popularity: 3, icon: '🦋', isDefault: true },
      { id: 'e61', name: 'Flexiones (Push-ups)', muscleGroup: ['Pecho', 'Tríceps', 'Core'], description: 'Flexiones clásicas. Ejercicio funcional con peso corporal.', equipment: 'Peso corporal', popularity: 5, icon: '👐', isDefault: true, difficulty: 'Principiante',
        primaryMuscles: ['Pectoral Mayor', 'Tríceps Braquial'],
        secondaryMuscles: ['Deltoides Anterior', 'Core', 'Serrato Anterior'],
        instructions: ['Colócate boca abajo con manos al ancho de hombros', 'Mantén el cuerpo recto como una tabla', 'Baja el pecho hasta casi tocar el suelo', 'Empuja hacia arriba hasta extensión completa'],
        tips: ['Aprieta glúteos y abdomen durante todo el movimiento', 'Para más dificultad: eleva los pies', 'Para menos dificultad: apoya las rodillas'],
        commonMistakes: ['Dejar caer la cadera', 'No bajar lo suficiente', 'Separar demasiado los codos'] },
      { id: 'e62', name: 'Flexiones Diamante', muscleGroup: ['Pecho', 'Tríceps'], description: 'Flexiones con manos juntas. Mayor énfasis en tríceps y pecho interior.', equipment: 'Peso corporal', popularity: 3, icon: '💎', isDefault: true },

      // ═══════════════════════════════════════════
      // ESPALDA — Back
      // ═══════════════════════════════════════════
      { id: 'e3', name: 'Dominadas', muscleGroup: ['Espalda', 'Bíceps'], description: 'Dominadas con agarre prono. El rey de los ejercicios de espalda.', equipment: 'Barra de dominadas', popularity: 5, icon: '🧗', isDefault: true, difficulty: 'Avanzado',
        primaryMuscles: ['Dorsal Ancho', 'Redondo Mayor', 'Bíceps Braquial'],
        secondaryMuscles: ['Romboides', 'Trapecio Inferior', 'Braquiorradial', 'Core'],
        instructions: ['Agarra la barra con agarre prono al ancho de hombros o más', 'Cuélgate con brazos extendidos (dead hang)', 'Tira de los codos hacia abajo y atrás', 'Sube hasta que el mentón supere la barra', 'Baja de forma controlada hasta extensión completa'],
        tips: ['Inicia el movimiento retrayendo las escápulas', 'No uses kipping ni balanceo', 'Si no puedes hacer una, usa bandas de asistencia', 'Varía el ancho del agarre para diferentes estímulos'],
        commonMistakes: ['Usar impulso con las piernas', 'No completar el rango de movimiento', 'Subir solo con los brazos sin activar espalda'] },
      { id: 'e4', name: 'Peso Muerto', muscleGroup: ['Espalda', 'Piernas', 'Glúteos'], description: 'Peso muerto convencional. Ejercicio compuesto rey para fuerza general.', equipment: 'Barra', popularity: 5, icon: '🏋️', isDefault: true, difficulty: 'Avanzado',
        primaryMuscles: ['Erectores Espinales', 'Glúteo Mayor', 'Isquiotibiales'],
        secondaryMuscles: ['Cuádriceps', 'Trapecio', 'Dorsal Ancho', 'Core', 'Antebrazos'],
        instructions: ['Párate con los pies al ancho de caderas, barra sobre el empeine', 'Agarra la barra con agarre mixto o doble prono', 'Baja la cadera, pecho arriba, espalda neutra', 'Empuja el suelo con los pies mientras extiendes cadera y rodillas', 'Bloquea arriba apretando glúteos, sin hiperextender la lumbar', 'Baja la barra de forma controlada invirtiendo el movimiento'],
        tips: ['La barra debe mantenerse pegada al cuerpo en todo momento', 'Piensa en empujar el suelo, no en tirar la barra', 'Usa cinturón para cargas superiores al 80% de tu 1RM', 'Domina la técnica con peso ligero antes de progresar'],
        commonMistakes: ['Redondear la espalda baja', 'Iniciar el movimiento con la espalda en vez de las piernas', 'Alejar la barra del cuerpo', 'Hiperextender la columna al bloquear'] },
      { id: 'e63', name: 'Remo con Barra', muscleGroup: ['Espalda'], description: 'Remo inclinado con barra. Fundamental para espesor de espalda.', equipment: 'Barra', popularity: 5, icon: '🚣', isDefault: true, difficulty: 'Intermedio',
        primaryMuscles: ['Dorsal Ancho', 'Romboides', 'Trapecio Medio'],
        secondaryMuscles: ['Bíceps Braquial', 'Erectores Espinales', 'Deltoides Posterior'],
        instructions: ['De pie, inclina el torso a 45° con rodillas ligeramente flexionadas', 'Agarra la barra al ancho de hombros con agarre prono', 'Tira de la barra hacia el abdomen bajo retrayendo escápulas', 'Mantén el torso estable sin usar impulso', 'Baja controladamente extendiendo los brazos'],
        tips: ['Enfócate en apretar las escápulas al final del movimiento', 'Mantén el core tenso para proteger la espalda baja', 'Prueba agarre supino para mayor activación del bíceps'],
        commonMistakes: ['Usar impulso con el torso', 'No completar la contracción escapular', 'Estar demasiado erguido o demasiado inclinado'] },
      { id: 'e64', name: 'Remo con Mancuerna', muscleGroup: ['Espalda'], description: 'Remo a una mano con mancuerna. Permite corregir desbalances.', equipment: 'Mancuerna y banco', popularity: 4, icon: '🚣', isDefault: true },
      { id: 'e65', name: 'Jalón al Pecho', muscleGroup: ['Espalda', 'Bíceps'], description: 'Jalón frontal en polea alta. Alternativa a dominadas para ancho de espalda.', equipment: 'Polea alta', popularity: 5, icon: '⬇️', isDefault: true, difficulty: 'Principiante',
        primaryMuscles: ['Dorsal Ancho', 'Redondo Mayor'],
        secondaryMuscles: ['Bíceps Braquial', 'Romboides', 'Trapecio Inferior'],
        instructions: ['Siéntate con los muslos bajo las almohadillas', 'Agarra la barra ancha con agarre prono', 'Tira de la barra hacia la clavícula sacando el pecho', 'Controla el regreso hasta extensión completa'],
        tips: ['Imagina que tiras con los codos, no con las manos', 'Agarre más ancho = más dorsal, más cerrado = más bíceps', 'No te inclines excesivamente hacia atrás'],
        commonMistakes: ['Tirar con los brazos en vez de la espalda', 'Inclinarse demasiado hacia atrás', 'No completar la extensión arriba'] },
      { id: 'e66', name: 'Jalón Tras Nuca', muscleGroup: ['Espalda'], description: 'Jalón por detrás de la cabeza. Mayor activación del dorsal.', equipment: 'Polea alta', popularity: 3, icon: '⬇️', isDefault: true },
      { id: 'e67', name: 'Remo en Polea Baja', muscleGroup: ['Espalda'], description: 'Remo sentado en polea baja. Excelente para espesor de espalda media.', equipment: 'Polea baja', popularity: 4, icon: '🔗', isDefault: true },
      { id: 'e68', name: 'Remo T-Bar', muscleGroup: ['Espalda'], description: 'Remo con barra T. Gran carga para espesor de espalda.', equipment: 'Barra T', popularity: 4, icon: '🚣', isDefault: true },
      { id: 'e69', name: 'Pull-up Agarre Neutro', muscleGroup: ['Espalda', 'Bíceps'], description: 'Dominadas con agarre neutro (palmas enfrentadas).', equipment: 'Barra multiagarre', popularity: 4, icon: '🧗', isDefault: true },
      { id: 'e70', name: 'Peso Muerto Sumo', muscleGroup: ['Espalda', 'Piernas', 'Glúteos'], description: 'Peso muerto con apertura amplia. Mayor énfasis en piernas internas.', equipment: 'Barra', popularity: 4, icon: '🏋️', isDefault: true },
      { id: 'e71', name: 'Peso Muerto Rumano', muscleGroup: ['Espalda', 'Piernas', 'Glúteos'], description: 'Peso muerto con piernas semi-extendidas. Énfasis en isquiotibiales y glúteos.', equipment: 'Barra', popularity: 5, icon: '🏋️', isDefault: true, difficulty: 'Intermedio',
        primaryMuscles: ['Isquiotibiales', 'Glúteo Mayor'],
        secondaryMuscles: ['Erectores Espinales', 'Trapecio', 'Antebrazos'],
        instructions: ['De pie con la barra al frente de los muslos', 'Flexiona ligeramente las rodillas y mantenlas fijas', 'Inclínate hacia adelante empujando la cadera hacia atrás', 'Baja la barra por la cara anterior de las piernas', 'Siente el estiramiento en isquiotibiales y sube apretando glúteos'],
        tips: ['La barra debe rozar las piernas durante todo el recorrido', 'No redondees la espalda, mantén pecho arriba', 'Piensa en empujar la cadera atrás, no en bajar la barra'],
        commonMistakes: ['Flexionar demasiado las rodillas (se convierte en peso muerto convencional)', 'Redondear la espalda', 'No llevar la barra pegada a las piernas'] },
      { id: 'e72', name: 'Hiperextensiones', muscleGroup: ['Espalda', 'Glúteos'], description: 'Extensiones de espalda en banco romano. Fortalece erectores espinales.', equipment: 'Banco romano', popularity: 4, icon: '🔙', isDefault: true },
      { id: 'e73', name: 'Face Pull', muscleGroup: ['Espalda', 'Hombros'], description: 'Tirón a la cara con cuerda en polea. Salud de hombros y trapecios posteriores.', equipment: 'Polea con cuerda', popularity: 4, icon: '🎯', isDefault: true },
      { id: 'e74', name: 'Encogimientos (Shrugs)', muscleGroup: ['Espalda'], description: 'Encogimientos de hombros para trapecio superior.', equipment: 'Mancuernas o barra', popularity: 3, icon: '🤷', isDefault: true },

      // ═══════════════════════════════════════════
      // HOMBROS — Shoulders
      // ═══════════════════════════════════════════
      { id: 'e5', name: 'Press Militar', muscleGroup: ['Hombros'], description: 'Press de hombros con barra de pie. Ejercicio compuesto fundamental.', equipment: 'Barra', popularity: 5, icon: '🏋️', isDefault: true, difficulty: 'Intermedio',
        primaryMuscles: ['Deltoides Anterior', 'Deltoides Lateral'],
        secondaryMuscles: ['Tríceps Braquial', 'Trapecio Superior', 'Core', 'Serrato Anterior'],
        instructions: ['De pie con los pies al ancho de hombros', 'Toma la barra con agarre ligeramente más ancho que los hombros', 'La barra parte desde las clavículas', 'Empuja la barra por encima de la cabeza', 'Extiende completamente los brazos y mete la cabeza entre ellos', 'Baja controladamente a la posición inicial'],
        tips: ['Aprieta glúteos y abdomen para estabilizar', 'No uses impulso de piernas (eso sería push press)', 'La trayectoria de la barra debe ser lo más vertical posible'],
        commonMistakes: ['Arquear excesivamente la espalda', 'Usar impulso con las piernas', 'No completar la extensión arriba'] },
      { id: 'e75', name: 'Press Arnold', muscleGroup: ['Hombros'], description: 'Press con rotación inventado por Arnold. Trabaja las 3 cabezas del deltoides.', equipment: 'Mancuernas', popularity: 4, icon: '💪', isDefault: true },
      { id: 'e76', name: 'Press Mancuernas Sentado', muscleGroup: ['Hombros'], description: 'Press de hombros sentado con mancuernas. Estable y controlado.', equipment: 'Mancuernas y banco', popularity: 5, icon: '💪', isDefault: true, difficulty: 'Principiante',
        primaryMuscles: ['Deltoides Anterior', 'Deltoides Lateral'],
        secondaryMuscles: ['Tríceps Braquial', 'Trapecio Superior'],
        instructions: ['Siéntate en banco a 90° con mancuernas a la altura de los hombros', 'Empuja las mancuernas hacia arriba hasta casi tocarse', 'Baja controladamente hasta que los codos estén a 90°'],
        tips: ['No bloquees los codos completamente arriba', 'Mantén la espalda apoyada en el respaldo', 'Puedes alternar brazos para mayor control'],
        commonMistakes: ['Arquear la espalda alejándola del respaldo', 'Usar demasiado peso sacrificando rango'] },
      { id: 'e77', name: 'Elevaciones Laterales', muscleGroup: ['Hombros'], description: 'Elevaciones laterales con mancuernas. Aislamiento del deltoides lateral.', equipment: 'Mancuernas', popularity: 5, icon: '🦅', isDefault: true, difficulty: 'Principiante',
        primaryMuscles: ['Deltoides Lateral'],
        secondaryMuscles: ['Deltoides Anterior', 'Trapecio Superior', 'Supraespinoso'],
        instructions: ['De pie con mancuernas a los lados, codos ligeramente flexionados', 'Eleva los brazos lateralmente hasta la altura de los hombros', 'Los pinkies deben estar ligeramente más altos que los pulgares', 'Baja controladamente sin dejar caer el peso'],
        tips: ['Usa peso ligero-moderado, la técnica es clave', 'Inclina ligeramente el torso para aislar más el lateral', 'Imagina que viertes agua de una jarra al subir'],
        commonMistakes: ['Usar impulso con el cuerpo', 'Elevar los hombros (encogerse) durante el movimiento', 'Usar demasiado peso'] },
      { id: 'e78', name: 'Elevaciones Frontales', muscleGroup: ['Hombros'], description: 'Elevaciones frontales con mancuernas o disco. Deltoides anterior.', equipment: 'Mancuernas', popularity: 3, icon: '🦅', isDefault: true },
      { id: 'e79', name: 'Pájaros (Reverse Fly)', muscleGroup: ['Hombros', 'Espalda'], description: 'Elevaciones posteriores inclinadas. Deltoides posterior y romboides.', equipment: 'Mancuernas', popularity: 4, icon: '🐦', isDefault: true },
      { id: 'e80', name: 'Elevación Lateral en Polea', muscleGroup: ['Hombros'], description: 'Elevación lateral con cable. Tensión constante para deltoides lateral.', equipment: 'Polea baja', popularity: 4, icon: '🔗', isDefault: true },
      { id: 'e81', name: 'Remo al Mentón', muscleGroup: ['Hombros', 'Tríceps'], description: 'Remo vertical con barra. Trabaja deltoides y trapecio.', equipment: 'Barra', popularity: 3, icon: '⬆️', isDefault: true },

      // ═══════════════════════════════════════════
      // BÍCEPS — Biceps
      // ═══════════════════════════════════════════
      { id: 'e6', name: 'Curl Bíceps con Mancuernas', muscleGroup: ['Bíceps'], description: 'Curl alterno con mancuernas. Básico para bíceps.', equipment: 'Mancuernas', popularity: 5, icon: '💪', isDefault: true, difficulty: 'Principiante',
        primaryMuscles: ['Bíceps Braquial (cabeza corta y larga)'],
        secondaryMuscles: ['Braquial', 'Braquiorradial', 'Pronador Redondo'],
        instructions: ['De pie con mancuernas a los lados, palmas hacia adelante', 'Flexiona un codo llevando la mancuerna al hombro', 'Contrae el bíceps en la parte superior', 'Baja controladamente y alterna con el otro brazo'],
        tips: ['Mantén los codos pegados al torso', 'Puedes supinar la muñeca al subir para mayor contracción', 'No balancees el cuerpo para subir el peso'],
        commonMistakes: ['Mover los codos adelante-atrás', 'Usar impulso con el torso', 'No completar el rango de movimiento'] },
      { id: 'e82', name: 'Curl con Barra', muscleGroup: ['Bíceps'], description: 'Curl de bíceps con barra recta. Permite usar más peso.', equipment: 'Barra recta', popularity: 5, icon: '💪', isDefault: true, difficulty: 'Principiante',
        primaryMuscles: ['Bíceps Braquial'],
        secondaryMuscles: ['Braquial', 'Braquiorradial'],
        instructions: ['De pie con la barra en agarre supino al ancho de hombros', 'Mantén los codos fijos a los costados', 'Flexiona los codos llevando la barra hacia los hombros', 'Aprieta en la contracción y baja controladamente'],
        tips: ['No dejes que los codos se desplacen hacia adelante', 'Usa barra Z si sientes dolor en las muñecas', 'Prueba tempo lento en la negativa para más hipertrofia'],
        commonMistakes: ['Balancear el cuerpo', 'Desplazar los codos', 'Soltar el peso en la bajada'] },
      { id: 'e83', name: 'Curl Barra Z', muscleGroup: ['Bíceps'], description: 'Curl con barra Z. Menor estrés en muñecas que barra recta.', equipment: 'Barra Z', popularity: 4, icon: '💪', isDefault: true },
      { id: 'e84', name: 'Curl Martillo', muscleGroup: ['Bíceps', 'Antebrazos'], description: 'Curl con agarre neutro. Trabaja braquial y braquiorradial.', equipment: 'Mancuernas', popularity: 5, icon: '🔨', isDefault: true, difficulty: 'Principiante',
        primaryMuscles: ['Braquial', 'Braquiorradial'],
        secondaryMuscles: ['Bíceps Braquial', 'Pronador Redondo'],
        instructions: ['De pie con mancuernas a los lados, palmas enfrentadas', 'Flexiona los codos manteniendo el agarre neutro (tipo martillo)', 'Sube hasta la contracción completa sin rotar las muñecas', 'Baja controladamente'],
        tips: ['Excelente para el grosor del brazo (trabaja el braquial)', 'Puedes hacerlo alterno o simultáneo', 'Más funcional que el curl supino'],
        commonMistakes: ['Rotar las muñecas durante el movimiento', 'Usar impulso corporal'] },
      { id: 'e85', name: 'Curl Concentrado', muscleGroup: ['Bíceps'], description: 'Curl sentado con apoyo en muslo. Máximo aislamiento del bíceps.', equipment: 'Mancuerna', popularity: 4, icon: '🎯', isDefault: true },
      { id: 'e86', name: 'Curl en Banco Scott', muscleGroup: ['Bíceps'], description: 'Curl predicador. Elimina impulso para aislamiento total.', equipment: 'Barra Z y banco Scott', popularity: 4, icon: '📐', isDefault: true },
      { id: 'e87', name: 'Curl en Polea', muscleGroup: ['Bíceps'], description: 'Curl de bíceps en polea baja. Tensión constante.', equipment: 'Polea baja', popularity: 3, icon: '🔗', isDefault: true },
      { id: 'e88', name: 'Curl Inclinado', muscleGroup: ['Bíceps'], description: 'Curl en banco inclinado 45°. Estiramiento profundo del bíceps.', equipment: 'Mancuernas y banco', popularity: 3, icon: '💪', isDefault: true },
      { id: 'e89', name: 'Curl Spider', muscleGroup: ['Bíceps'], description: 'Curl boca abajo en banco inclinado. Máxima contracción del bíceps.', equipment: 'Mancuernas o barra Z', popularity: 3, icon: '🕷️', isDefault: true },

      // ═══════════════════════════════════════════
      // TRÍCEPS — Triceps
      // ═══════════════════════════════════════════
      { id: 'e90', name: 'Fondos en Paralelas (Tríceps)', muscleGroup: ['Tríceps'], description: 'Fondos con torso erguido. Énfasis en tríceps.', equipment: 'Barras paralelas', popularity: 5, icon: '🤸', isDefault: true, difficulty: 'Intermedio',
        primaryMuscles: ['Tríceps Braquial (las 3 cabezas)'],
        secondaryMuscles: ['Pectoral Inferior', 'Deltoides Anterior'],
        instructions: ['Sujétate en las barras con brazos extendidos', 'Mantén el torso lo más erguido posible', 'Baja flexionando los codos hasta 90°', 'Empuja hacia arriba hasta extensión completa'],
        tips: ['Torso erguido = más tríceps, inclinado = más pecho', 'Agrega peso con cinturón cuando domines 15+ reps', 'Mantén los codos pegados al cuerpo'],
        commonMistakes: ['Bajar demasiado (estrés en el hombro)', 'Inclinarse demasiado hacia adelante', 'No completar la extensión'] },
      { id: 'e91', name: 'Press Francés', muscleGroup: ['Tríceps'], description: 'Extensión de tríceps acostado con barra Z. Cabeza larga del tríceps.', equipment: 'Barra Z y banco', popularity: 4, icon: '🇫🇷', isDefault: true },
      { id: 'e92', name: 'Extensión de Tríceps en Polea', muscleGroup: ['Tríceps'], description: 'Pushdown con barra o cuerda. El más popular para tríceps.', equipment: 'Polea alta', popularity: 5, icon: '⬇️', isDefault: true, difficulty: 'Principiante',
        primaryMuscles: ['Tríceps Braquial (cabeza lateral y medial)'],
        secondaryMuscles: ['Anconeo'],
        instructions: ['De pie frente a la polea alta', 'Agarra la barra o cuerda con codos a 90°', 'Extiende los codos empujando el agarre hacia abajo', 'Mantén los codos fijos a los costados', 'Regresa controladamente a 90°'],
        tips: ['Con cuerda: separa las puntas al final para contracción máxima', 'Mantén una leve inclinación del torso', 'No dejes que los codos se separen del cuerpo'],
        commonMistakes: ['Mover los codos adelante-atrás', 'Usar el peso del cuerpo para empujar', 'Velocidad excesiva'] },
      { id: 'e93', name: 'Extensión Overhead con Mancuerna', muscleGroup: ['Tríceps'], description: 'Extensión de tríceps por encima de la cabeza. Cabeza larga.', equipment: 'Mancuerna', popularity: 4, icon: '⬆️', isDefault: true },
      { id: 'e94', name: 'Patada de Tríceps (Kickback)', muscleGroup: ['Tríceps'], description: 'Extensión de tríceps inclinado. Aislamiento con contracción pico.', equipment: 'Mancuerna', popularity: 3, icon: '🦶', isDefault: true },
      { id: 'e95', name: 'Press Cerrado', muscleGroup: ['Tríceps', 'Pecho'], description: 'Press de banca con agarre cerrado. Compuesto para tríceps.', equipment: 'Barra y banco', popularity: 4, icon: '🏋️', isDefault: true },
      { id: 'e96', name: 'Extensión con Cuerda en Polea', muscleGroup: ['Tríceps'], description: 'Pushdown con cuerda. Permite separar al final para contracción máxima.', equipment: 'Polea alta con cuerda', popularity: 4, icon: '🪢', isDefault: true },

      // ═══════════════════════════════════════════
      // PIERNAS — Legs
      // ═══════════════════════════════════════════
      { id: 'e1', name: 'Sentadilla con Barra', muscleGroup: ['Piernas', 'Glúteos', 'Core'], description: 'Sentadilla trasera con barra. El ejercicio rey para tren inferior.', equipment: 'Barra y rack', popularity: 5, icon: '🏋️', isDefault: true, difficulty: 'Intermedio',
        primaryMuscles: ['Cuádriceps', 'Glúteo Mayor'],
        secondaryMuscles: ['Isquiotibiales', 'Erectores Espinales', 'Core', 'Aductores'],
        instructions: ['Coloca la barra en los trapecios (high bar) o deltoides posteriores (low bar)', 'Pies al ancho de hombros o ligeramente más, puntas a 30° hacia afuera', 'Inicia el movimiento empujando la cadera hacia atrás', 'Baja hasta que los muslos queden paralelos al suelo o más', 'Empuja el suelo con los pies para subir, aprieta glúteos arriba'],
        tips: ['Las rodillas deben seguir la dirección de los pies', 'Mantén el pecho arriba y la mirada al frente', 'Trabaja movilidad de tobillos si no puedes bajar a paralelo', 'Inhala al bajar, exhala al subir'],
        commonMistakes: ['Redondear la espalda', 'Que las rodillas se metan hacia adentro', 'No bajar a paralelo', 'Elevar los talones del suelo'] },
      { id: 'e100', name: 'Sentadilla Frontal', muscleGroup: ['Piernas', 'Core'], description: 'Sentadilla con barra al frente. Mayor énfasis en cuádriceps y core.', equipment: 'Barra y rack', popularity: 4, icon: '🏋️', isDefault: true },
      { id: 'e101', name: 'Sentadilla Búlgara', muscleGroup: ['Piernas', 'Glúteos'], description: 'Zancada con pie trasero elevado. Unilateral para equilibrio y fuerza.', equipment: 'Mancuernas y banco', popularity: 5, icon: '🦵', isDefault: true, difficulty: 'Intermedio',
        primaryMuscles: ['Cuádriceps', 'Glúteo Mayor'],
        secondaryMuscles: ['Isquiotibiales', 'Aductores', 'Core (estabilización)'],
        instructions: ['Coloca el empeine del pie trasero sobre un banco', 'Da un paso largo hacia adelante con el pie delantero', 'Baja verticalmente flexionando la rodilla delantera a 90°', 'Empuja con el pie delantero para subir'],
        tips: ['La rodilla delantera no debe sobrepasar excesivamente los dedos del pie', 'Más distancia al banco = más glúteo, menos = más cuádriceps', 'Usa mancuernas para mayor estabilidad'],
        commonMistakes: ['Inclinarse demasiado hacia adelante', 'Paso demasiado corto o largo', 'Perder el equilibrio por falta de core'] },
      { id: 'e102', name: 'Prensa de Piernas', muscleGroup: ['Piernas', 'Glúteos'], description: 'Prensa de piernas en máquina 45°. Permite alta carga con seguridad.', equipment: 'Máquina prensa', popularity: 5, icon: '🦿', isDefault: true, difficulty: 'Principiante',
        primaryMuscles: ['Cuádriceps', 'Glúteo Mayor'],
        secondaryMuscles: ['Isquiotibiales', 'Aductores'],
        instructions: ['Siéntate en la prensa con espalda y cabeza apoyadas', 'Coloca los pies al ancho de hombros en la plataforma', 'Desbloquea la seguridad y baja la plataforma flexionando las rodillas', 'Empuja hasta extensión casi completa sin bloquear rodillas'],
        tips: ['Pies altos = más glúteo/isquios, bajos = más cuádriceps', 'Pies juntos = más cuádriceps externo', 'Nunca bloquees las rodillas completamente'],
        commonMistakes: ['Bloquear las rodillas en extensión', 'Despegar la espalda baja del respaldo', 'Bajar demasiado (la cadera se levanta del asiento)'] },
      { id: 'e103', name: 'Extensión de Cuádriceps', muscleGroup: ['Piernas'], description: 'Extensión de piernas en máquina. Aislamiento de cuádriceps.', equipment: 'Máquina de extensión', popularity: 4, icon: '🦵', isDefault: true },
      { id: 'e104', name: 'Curl de Isquiotibiales', muscleGroup: ['Piernas'], description: 'Curl femoral acostado o sentado. Aislamiento de isquiotibiales.', equipment: 'Máquina curl femoral', popularity: 4, icon: '🦵', isDefault: true },
      { id: 'e105', name: 'Sentadilla Hack', muscleGroup: ['Piernas'], description: 'Sentadilla en máquina hack. Cuádriceps con soporte de espalda.', equipment: 'Máquina hack', popularity: 4, icon: '🦿', isDefault: true },
      { id: 'e106', name: 'Zancadas (Lunges)', muscleGroup: ['Piernas', 'Glúteos'], description: 'Zancadas caminando o estáticas. Funcional y desafiante.', equipment: 'Mancuernas', popularity: 5, icon: '🚶', isDefault: true, difficulty: 'Principiante',
        primaryMuscles: ['Cuádriceps', 'Glúteo Mayor'],
        secondaryMuscles: ['Isquiotibiales', 'Aductores', 'Core'],
        instructions: ['De pie con mancuernas a los lados', 'Da un paso largo hacia adelante', 'Baja hasta que la rodilla trasera casi toque el suelo', 'Empuja con el pie delantero para volver a la posición inicial'],
        tips: ['Mantén el torso erguido', 'La rodilla no debe sobrepasar excesivamente los dedos', 'Caminando: más funcional. Estático: más control'],
        commonMistakes: ['Paso demasiado corto', 'Inclinar el torso hacia adelante', 'Rodilla delantera colapsando hacia adentro'] },
      { id: 'e107', name: 'Step-Up', muscleGroup: ['Piernas', 'Glúteos'], description: 'Subida a cajón con peso. Unilateral y funcional.', equipment: 'Mancuernas y cajón', popularity: 3, icon: '📦', isDefault: true },
      { id: 'e108', name: 'Sentadilla Goblet', muscleGroup: ['Piernas', 'Core'], description: 'Sentadilla con mancuerna o kettlebell al pecho. Ideal para técnica.', equipment: 'Mancuerna o kettlebell', popularity: 4, icon: '🏆', isDefault: true },
      { id: 'e109', name: 'Sissy Squat', muscleGroup: ['Piernas'], description: 'Sentadilla con inclinación hacia atrás. Cuádriceps extremo.', equipment: 'Peso corporal', popularity: 2, icon: '🦵', isDefault: true },
      { id: 'e110', name: 'Aductores en Máquina', muscleGroup: ['Piernas'], description: 'Máquina de aductores. Fortalece la cara interna del muslo.', equipment: 'Máquina aductores', popularity: 3, icon: '🦿', isDefault: true },
      { id: 'e111', name: 'Abductores en Máquina', muscleGroup: ['Piernas', 'Glúteos'], description: 'Máquina de abductores. Trabaja glúteo medio y tensor.', equipment: 'Máquina abductores', popularity: 3, icon: '🦿', isDefault: true },

      // ═══════════════════════════════════════════
      // GLÚTEOS — Glutes
      // ═══════════════════════════════════════════
      { id: 'e112', name: 'Hip Thrust', muscleGroup: ['Glúteos'], description: 'Empuje de cadera con barra. El mejor ejercicio para glúteos según la ciencia.', equipment: 'Barra y banco', popularity: 5, icon: '🍑', isDefault: true, difficulty: 'Principiante',
        primaryMuscles: ['Glúteo Mayor', 'Glúteo Medio'],
        secondaryMuscles: ['Isquiotibiales', 'Aductores', 'Core'],
        instructions: ['Siéntate en el suelo con la espalda alta apoyada en un banco', 'Coloca la barra sobre la cadera (usa almohadilla)', 'Pies al ancho de caderas, rodillas a 90° en la posición superior', 'Empuja la cadera hacia arriba apretando glúteos al máximo', 'Baja controladamente sin tocar el suelo'],
        tips: ['Mira hacia adelante, no al techo (posterioriza la pelvis)', 'Aprieta los glúteos 2 segundos arriba', 'La espinilla debe quedar vertical en la posición superior'],
        commonMistakes: ['Hiperextender la lumbar arriba', 'No apretar glúteos en la contracción', 'Colocar los pies demasiado lejos o cerca del banco'] },
      { id: 'e113', name: 'Puente de Glúteos', muscleGroup: ['Glúteos'], description: 'Puente de cadera en el suelo. Activación glútea sin equipamiento.', equipment: 'Peso corporal', popularity: 4, icon: '🌉', isDefault: true },
      { id: 'e114', name: 'Patada de Glúteo en Polea', muscleGroup: ['Glúteos'], description: 'Kickback de glúteo con cable. Aislamiento efectivo.', equipment: 'Polea baja con tobillera', popularity: 4, icon: '🦶', isDefault: true },
      { id: 'e115', name: 'Buenos Días (Good Morning)', muscleGroup: ['Glúteos', 'Espalda'], description: 'Inclinación con barra en hombros. Isquiotibiales y glúteos.', equipment: 'Barra', popularity: 3, icon: '🌅', isDefault: true },

      // ═══════════════════════════════════════════
      // PANTORRILLAS — Calves
      // ═══════════════════════════════════════════
      { id: 'e116', name: 'Elevación de Pantorrillas de Pie', muscleGroup: ['Pantorrillas'], description: 'Elevación de talones de pie. Trabaja gastrocnemio.', equipment: 'Máquina o Smith', popularity: 4, icon: '🦶', isDefault: true },
      { id: 'e117', name: 'Elevación de Pantorrillas Sentado', muscleGroup: ['Pantorrillas'], description: 'Elevación sentado. Enfatiza el sóleo.', equipment: 'Máquina de pantorrillas', popularity: 3, icon: '🦶', isDefault: true },
      { id: 'e118', name: 'Elevación en Prensa', muscleGroup: ['Pantorrillas'], description: 'Elevación de pantorrillas en máquina de prensa.', equipment: 'Máquina prensa', popularity: 3, icon: '🦿', isDefault: true },

      // ═══════════════════════════════════════════
      // CORE — Abdominales
      // ═══════════════════════════════════════════
      { id: 'e120', name: 'Plancha (Plank)', muscleGroup: ['Core'], description: 'Isométrico fundamental. Estabilización de toda la faja abdominal.', equipment: 'Peso corporal', popularity: 5, icon: '🧘', isDefault: true, difficulty: 'Principiante',
        primaryMuscles: ['Recto Abdominal', 'Transverso Abdominal'],
        secondaryMuscles: ['Oblicuos', 'Erectores Espinales', 'Glúteos', 'Hombros'],
        instructions: ['Boca abajo, apóyate en antebrazos y puntas de los pies', 'Codos directamente debajo de los hombros', 'Mantén el cuerpo en línea recta de cabeza a talones', 'Aprieta abdomen y glúteos', 'Mantén la posición el tiempo indicado'],
        tips: ['No mires hacia arriba, mantén el cuello neutro', 'Si es muy fácil, eleva un brazo o pierna alternadamente', 'Respira normalmente, no aguantes la respiración'],
        commonMistakes: ['Dejar caer la cadera hacia abajo', 'Elevar la cadera demasiado (forma de tienda)', 'Aguantar la respiración'] },
      { id: 'e121', name: 'Crunch Abdominal', muscleGroup: ['Core'], description: 'Crunch clásico. Flexión de tronco para recto abdominal.', equipment: 'Peso corporal', popularity: 4, icon: '🔥', isDefault: true },
      { id: 'e122', name: 'Elevación de Piernas Colgado', muscleGroup: ['Core'], description: 'Elevación de piernas en barra. Abdomen inferior intenso.', equipment: 'Barra de dominadas', popularity: 4, icon: '🧗', isDefault: true },
      { id: 'e123', name: 'Russian Twist', muscleGroup: ['Core'], description: 'Rotación con peso sentado. Trabaja oblicuos.', equipment: 'Mancuerna o disco', popularity: 4, icon: '🔄', isDefault: true },
      { id: 'e124', name: 'Ab Wheel Rollout', muscleGroup: ['Core'], description: 'Rueda abdominal. Uno de los más efectivos para core completo.', equipment: 'Rueda abdominal', popularity: 4, icon: '🎡', isDefault: true },
      { id: 'e125', name: 'Mountain Climbers', muscleGroup: ['Core', 'Cardio'], description: 'Escaladores. Cardio + core dinámico.', equipment: 'Peso corporal', popularity: 4, icon: '⛰️', isDefault: true },
      { id: 'e126', name: 'Crunch en Polea', muscleGroup: ['Core'], description: 'Crunch arrodillado con cuerda en polea alta. Permite agregar carga.', equipment: 'Polea alta con cuerda', popularity: 3, icon: '🔗', isDefault: true },
      { id: 'e127', name: 'Plancha Lateral', muscleGroup: ['Core'], description: 'Plancha de costado. Fortalece oblicuos y estabilizadores laterales.', equipment: 'Peso corporal', popularity: 4, icon: '🧘', isDefault: true },
      { id: 'e128', name: 'Dead Bug', muscleGroup: ['Core'], description: 'Ejercicio supino anti-extensión. Excelente para estabilidad lumbar.', equipment: 'Peso corporal', popularity: 3, icon: '🪲', isDefault: true },
      { id: 'e129', name: 'Pallof Press', muscleGroup: ['Core'], description: 'Press anti-rotación con cable. Estabilidad funcional del core.', equipment: 'Polea', popularity: 3, icon: '🎯', isDefault: true },

      // ═══════════════════════════════════════════
      // ANTEBRAZOS — Forearms
      // ═══════════════════════════════════════════
      { id: 'e130', name: 'Curl de Muñeca', muscleGroup: ['Antebrazos'], description: 'Flexión de muñeca con barra. Flexores del antebrazo.', equipment: 'Barra', popularity: 3, icon: '✊', isDefault: true },
      { id: 'e131', name: 'Curl de Muñeca Invertido', muscleGroup: ['Antebrazos'], description: 'Extensión de muñeca con barra. Extensores del antebrazo.', equipment: 'Barra', popularity: 2, icon: '✊', isDefault: true },
      { id: 'e132', name: 'Farmer Walk', muscleGroup: ['Antebrazos', 'Core'], description: 'Caminata del granjero. Agarre, core y acondicionamiento general.', equipment: 'Mancuernas pesadas', popularity: 4, icon: '🧑‍🌾', isDefault: true },

      // ═══════════════════════════════════════════
      // CUERPO COMPLETO / COMPUESTOS
      // ═══════════════════════════════════════════
      { id: 'e140', name: 'Clean & Press', muscleGroup: ['Cuerpo Completo'], description: 'Cargada y press. Movimiento olímpico para potencia total.', equipment: 'Barra', popularity: 4, icon: '🏋️', isDefault: true },
      { id: 'e141', name: 'Snatch (Arranque)', muscleGroup: ['Cuerpo Completo'], description: 'Arranque olímpico. Máxima expresión de potencia y técnica.', equipment: 'Barra', popularity: 3, icon: '🏋️', isDefault: true },
      { id: 'e142', name: 'Turkish Get-Up', muscleGroup: ['Cuerpo Completo', 'Core'], description: 'Levantamiento turco. Estabilidad, movilidad y fuerza funcional.', equipment: 'Kettlebell', popularity: 3, icon: '🇹🇷', isDefault: true },
      { id: 'e143', name: 'Thrusters', muscleGroup: ['Cuerpo Completo'], description: 'Sentadilla + press en un movimiento fluido. Alta demanda metabólica.', equipment: 'Barra o mancuernas', popularity: 4, icon: '🚀', isDefault: true },
      { id: 'e144', name: 'Man Maker', muscleGroup: ['Cuerpo Completo'], description: 'Flexión + remo + clean + press. Complejo total con mancuernas.', equipment: 'Mancuernas', popularity: 3, icon: '🦸', isDefault: true },

      // ═══════════════════════════════════════════
      // CARDIO / ACONDICIONAMIENTO
      // ═══════════════════════════════════════════
      { id: 'e150', name: 'Burpees', muscleGroup: ['Cardio', 'Cuerpo Completo'], description: 'Burpee completo. El ejercicio de cardio con peso corporal más intenso.', equipment: 'Peso corporal', popularity: 5, icon: '🔥', isDefault: true, difficulty: 'Intermedio',
        primaryMuscles: ['Cuádriceps', 'Pectoral', 'Deltoides'],
        secondaryMuscles: ['Core', 'Tríceps', 'Isquiotibiales', 'Glúteos'],
        instructions: ['De pie, baja en sentadilla y pon las manos en el suelo', 'Lanza los pies hacia atrás quedando en posición de flexión', 'Realiza una flexión completa', 'Recoge los pies hacia las manos en sentadilla', 'Salta explosivamente con brazos arriba'],
        tips: ['Para principiantes: elimina el salto o la flexión', 'Mantén un ritmo constante, no te aceleres al inicio', 'Ideal para HIIT: 30 seg trabajo / 30 seg descanso'],
        commonMistakes: ['No completar la flexión', 'Aterrizar con las rodillas bloqueadas', 'Perder la postura en la fatiga'] },
      { id: 'e151', name: 'Salto de Caja (Box Jump)', muscleGroup: ['Cardio', 'Piernas'], description: 'Salto pliométrico a cajón. Potencia explosiva de piernas.', equipment: 'Cajón pliométrico', popularity: 4, icon: '📦', isDefault: true },
      { id: 'e152', name: 'Swing con Kettlebell', muscleGroup: ['Cardio', 'Glúteos', 'Core'], description: 'Balanceo de kettlebell. Potencia de cadera y acondicionamiento.', equipment: 'Kettlebell', popularity: 5, icon: '🔔', isDefault: true, difficulty: 'Intermedio',
        primaryMuscles: ['Glúteo Mayor', 'Isquiotibiales'],
        secondaryMuscles: ['Core', 'Erectores Espinales', 'Deltoides', 'Antebrazos'],
        instructions: ['De pie con pies al ancho de hombros, kettlebell en el suelo adelante', 'Agarra con ambas manos, bisagra de cadera hacia atrás', 'Balancea la kettlebell entre las piernas', 'Extiende explosivamente la cadera llevando la kettlebell a la altura del pecho', 'Deja que la gravedad la devuelva y repite el ciclo'],
        tips: ['El movimiento viene de la cadera, NO de los brazos', 'Los brazos solo guían, la potencia es de las caderas', 'Mantén los hombros atrás y abajo'],
        commonMistakes: ['Hacer sentadilla en vez de bisagra de cadera', 'Levantar con los brazos', 'Redondear la espalda', 'Subir la kettlebell por encima de la cabeza (estilo americano) sin experiencia'] },
      { id: 'e153', name: 'Battle Ropes', muscleGroup: ['Cardio', 'Brazos', 'Core'], description: 'Cuerdas de batalla. Acondicionamiento intenso de tren superior.', equipment: 'Cuerdas de batalla', popularity: 4, icon: '🪢', isDefault: true },
      { id: 'e154', name: 'Sprints', muscleGroup: ['Cardio', 'Piernas'], description: 'Carreras cortas a máxima velocidad. Cardio HIIT.', equipment: 'Ninguno', popularity: 4, icon: '🏃', isDefault: true },
      { id: 'e155', name: 'Remo en Ergómetro', muscleGroup: ['Cardio', 'Cuerpo Completo'], description: 'Remo en máquina. Cardio de bajo impacto que involucra todo el cuerpo.', equipment: 'Ergómetro de remo', popularity: 4, icon: '🚣', isDefault: true },
      { id: 'e156', name: 'Jumping Jacks', muscleGroup: ['Cardio'], description: 'Saltos con apertura. Calentamiento o cardio ligero.', equipment: 'Peso corporal', popularity: 3, icon: '⭐', isDefault: true },
      { id: 'e157', name: 'Sled Push', muscleGroup: ['Cardio', 'Piernas'], description: 'Empuje de trineo. Acondicionamiento de alta intensidad.', equipment: 'Trineo', popularity: 3, icon: '🛷', isDefault: true },
    ]);
  };

  // Seed template routines — merges with any user-created routines
  const seedDefaultRoutines = (userRoutines: Routine[]) => {
    const templates: Routine[] = [
      {
        id: 'r1',
        name: 'Full Body Principiante',
        description: 'Rutina completa para principiantes, 3 días por semana',
        exercises: [
          { exerciseId: 'e1', sets: 3, reps: '12', restSeconds: 90 },
          { exerciseId: 'e2', sets: 3, reps: '10', restSeconds: 90 },
          { exerciseId: 'e3', sets: 3, reps: '8', restSeconds: 120 },
          { exerciseId: 'e5', sets: 3, reps: '10', restSeconds: 90 },
          { exerciseId: 'e6', sets: 3, reps: '12', restSeconds: 60 },
          { exerciseId: 'e120', sets: 3, reps: '30s', restSeconds: 60 },
        ],
        isTemplate: true,
        createdBy: 'trainer-1',
      },
      {
        id: 'r2',
        name: 'Hipertrofia Pierna',
        description: 'Rutina enfocada en piernas para hipertrofia',
        exercises: [
          { exerciseId: 'e1', sets: 4, reps: '10-12', restSeconds: 120 },
          { exerciseId: 'e4', sets: 4, reps: '8', restSeconds: 120 },
          { exerciseId: 'e102', sets: 4, reps: '12', restSeconds: 90 },
          { exerciseId: 'e103', sets: 3, reps: '15', restSeconds: 60 },
          { exerciseId: 'e104', sets: 3, reps: '12', restSeconds: 60 },
          { exerciseId: 'e106', sets: 3, reps: '12', restSeconds: 90 },
          { exerciseId: 'e116', sets: 4, reps: '15', restSeconds: 60 },
        ],
        isTemplate: true,
        createdBy: 'trainer-1',
      },
      // ─── Arnold Split ────
      {
        id: 'r3',
        name: 'Arnold Split – Pecho y Espalda',
        description: 'Día 1 del clásico Arnold Split: superseries pecho/espalda',
        exercises: [
          { exerciseId: 'e2', sets: 5, reps: '6-10', restSeconds: 90 },
          { exerciseId: 'e53', sets: 4, reps: '10', restSeconds: 90 },
          { exerciseId: 'e54', sets: 4, reps: '12', restSeconds: 60 },
          { exerciseId: 'e56', sets: 4, reps: '12', restSeconds: 60 },
          { exerciseId: 'e57', sets: 4, reps: '12', restSeconds: 90 },
          { exerciseId: 'e3', sets: 4, reps: '8-10', restSeconds: 120 },
          { exerciseId: 'e63', sets: 4, reps: '8-10', restSeconds: 90 },
          { exerciseId: 'e68', sets: 4, reps: '10', restSeconds: 90 },
          { exerciseId: 'e67', sets: 4, reps: '12', restSeconds: 60 },
          { exerciseId: 'e58', sets: 4, reps: '12', restSeconds: 60 },
        ],
        isTemplate: true,
        createdBy: 'trainer-1',
      },
      {
        id: 'r4',
        name: 'Arnold Split – Hombros y Brazos',
        description: 'Día 2 del clásico Arnold Split: hombros, bíceps y tríceps',
        exercises: [
          { exerciseId: 'e75', sets: 4, reps: '8-10', restSeconds: 90, notes: 'Press Arnold' },
          { exerciseId: 'e77', sets: 4, reps: '12', restSeconds: 60 },
          { exerciseId: 'e78', sets: 3, reps: '12', restSeconds: 60 },
          { exerciseId: 'e81', sets: 3, reps: '10', restSeconds: 90 },
          { exerciseId: 'e82', sets: 4, reps: '10', restSeconds: 60 },
          { exerciseId: 'e88', sets: 4, reps: '10', restSeconds: 60 },
          { exerciseId: 'e85', sets: 3, reps: '12', restSeconds: 60 },
          { exerciseId: 'e95', sets: 4, reps: '8', restSeconds: 90 },
          { exerciseId: 'e91', sets: 4, reps: '10', restSeconds: 60 },
          { exerciseId: 'e92', sets: 4, reps: '12', restSeconds: 60 },
        ],
        isTemplate: true,
        createdBy: 'trainer-1',
      },
      {
        id: 'r5',
        name: 'Arnold Split – Piernas',
        description: 'Día 3 del clásico Arnold Split: piernas completas',
        exercises: [
          { exerciseId: 'e1', sets: 5, reps: '6-10', restSeconds: 150 },
          { exerciseId: 'e106', sets: 4, reps: '10', restSeconds: 90 },
          { exerciseId: 'e103', sets: 4, reps: '12', restSeconds: 60 },
          { exerciseId: 'e104', sets: 4, reps: '12', restSeconds: 60 },
          { exerciseId: 'e71', sets: 4, reps: '10', restSeconds: 90 },
          { exerciseId: 'e115', sets: 3, reps: '12', restSeconds: 90 },
          { exerciseId: 'e116', sets: 5, reps: '15', restSeconds: 60 },
          { exerciseId: 'e121', sets: 3, reps: '20', restSeconds: 60 },
        ],
        isTemplate: true,
        createdBy: 'trainer-1',
      },
      // ─── Push Pull Legs ────
      {
        id: 'r6',
        name: 'Push Pull Legs – Push',
        description: 'Día de empuje: pecho, hombros y tríceps',
        exercises: [
          { exerciseId: 'e2', sets: 4, reps: '6-8', restSeconds: 120 },
          { exerciseId: 'e53', sets: 4, reps: '10', restSeconds: 90 },
          { exerciseId: 'e56', sets: 3, reps: '12', restSeconds: 60 },
          { exerciseId: 'e5', sets: 4, reps: '8', restSeconds: 90 },
          { exerciseId: 'e77', sets: 4, reps: '15', restSeconds: 60 },
          { exerciseId: 'e92', sets: 3, reps: '12', restSeconds: 60 },
          { exerciseId: 'e91', sets: 3, reps: '10', restSeconds: 60 },
        ],
        isTemplate: true,
        createdBy: 'trainer-1',
      },
      {
        id: 'r7',
        name: 'Push Pull Legs – Pull',
        description: 'Día de tirón: espalda y bíceps',
        exercises: [
          { exerciseId: 'e4', sets: 4, reps: '5', restSeconds: 150 },
          { exerciseId: 'e3', sets: 4, reps: '8', restSeconds: 120 },
          { exerciseId: 'e63', sets: 4, reps: '10', restSeconds: 90 },
          { exerciseId: 'e73', sets: 4, reps: '15', restSeconds: 60 },
          { exerciseId: 'e82', sets: 3, reps: '10', restSeconds: 60 },
          { exerciseId: 'e84', sets: 3, reps: '12', restSeconds: 60 },
          { exerciseId: 'e74', sets: 3, reps: '12', restSeconds: 60 },
        ],
        isTemplate: true,
        createdBy: 'trainer-1',
      },
      {
        id: 'r8',
        name: 'Push Pull Legs – Legs',
        description: 'Día de piernas completo',
        exercises: [
          { exerciseId: 'e1', sets: 4, reps: '6-8', restSeconds: 150 },
          { exerciseId: 'e71', sets: 4, reps: '10', restSeconds: 90 },
          { exerciseId: 'e102', sets: 4, reps: '12', restSeconds: 90 },
          { exerciseId: 'e103', sets: 3, reps: '15', restSeconds: 60 },
          { exerciseId: 'e104', sets: 3, reps: '12', restSeconds: 60 },
          { exerciseId: 'e112', sets: 4, reps: '12', restSeconds: 90 },
          { exerciseId: 'e116', sets: 4, reps: '15', restSeconds: 60 },
        ],
        isTemplate: true,
        createdBy: 'trainer-1',
      },
      // ─── Upper / Lower ────
      {
        id: 'r9',
        name: 'Upper / Lower – Tren Superior',
        description: 'Día de tren superior: pecho, espalda, hombros y brazos',
        exercises: [
          { exerciseId: 'e2', sets: 4, reps: '8', restSeconds: 120 },
          { exerciseId: 'e63', sets: 4, reps: '8', restSeconds: 90 },
          { exerciseId: 'e76', sets: 3, reps: '10', restSeconds: 90 },
          { exerciseId: 'e65', sets: 3, reps: '10', restSeconds: 90 },
          { exerciseId: 'e77', sets: 3, reps: '15', restSeconds: 60 },
          { exerciseId: 'e82', sets: 3, reps: '10', restSeconds: 60 },
          { exerciseId: 'e92', sets: 3, reps: '12', restSeconds: 60 },
        ],
        isTemplate: true,
        createdBy: 'trainer-1',
      },
      {
        id: 'r10',
        name: 'Upper / Lower – Tren Inferior',
        description: 'Día de tren inferior: cuádriceps, isquios, glúteos y pantorrillas',
        exercises: [
          { exerciseId: 'e1', sets: 4, reps: '6-8', restSeconds: 150 },
          { exerciseId: 'e71', sets: 4, reps: '10', restSeconds: 90 },
          { exerciseId: 'e101', sets: 3, reps: '10', restSeconds: 90 },
          { exerciseId: 'e112', sets: 4, reps: '12', restSeconds: 90 },
          { exerciseId: 'e103', sets: 3, reps: '15', restSeconds: 60 },
          { exerciseId: 'e104', sets: 3, reps: '12', restSeconds: 60 },
          { exerciseId: 'e116', sets: 4, reps: '15', restSeconds: 60 },
          { exerciseId: 'e120', sets: 3, reps: '45s', restSeconds: 60 },
        ],
        isTemplate: true,
        createdBy: 'trainer-1',
      },
      // ─── Classic Bodybuilding Splits ────
      {
        id: 'r11',
        name: 'Pecho y Tríceps',
        description: 'Clásico split de pecho + tríceps para hipertrofia',
        exercises: [
          { exerciseId: 'e2', sets: 4, reps: '8-10', restSeconds: 120 },
          { exerciseId: 'e50', sets: 4, reps: '10', restSeconds: 90 },
          { exerciseId: 'e54', sets: 3, reps: '12', restSeconds: 60 },
          { exerciseId: 'e56', sets: 3, reps: '15', restSeconds: 60 },
          { exerciseId: 'e60', sets: 3, reps: '12', restSeconds: 60 },
          { exerciseId: 'e95', sets: 4, reps: '8', restSeconds: 90 },
          { exerciseId: 'e91', sets: 3, reps: '10', restSeconds: 60 },
          { exerciseId: 'e96', sets: 3, reps: '15', restSeconds: 60 },
        ],
        isTemplate: true,
        createdBy: 'trainer-1',
      },
      {
        id: 'r12',
        name: 'Espalda y Bíceps',
        description: 'Clásico split de espalda + bíceps para hipertrofia',
        exercises: [
          { exerciseId: 'e4', sets: 4, reps: '6-8', restSeconds: 150 },
          { exerciseId: 'e65', sets: 4, reps: '10', restSeconds: 90 },
          { exerciseId: 'e63', sets: 4, reps: '8', restSeconds: 90 },
          { exerciseId: 'e67', sets: 3, reps: '12', restSeconds: 60 },
          { exerciseId: 'e72', sets: 3, reps: '15', restSeconds: 60 },
          { exerciseId: 'e82', sets: 3, reps: '10', restSeconds: 60 },
          { exerciseId: 'e84', sets: 3, reps: '12', restSeconds: 60 },
          { exerciseId: 'e86', sets: 3, reps: '10', restSeconds: 60 },
        ],
        isTemplate: true,
        createdBy: 'trainer-1',
      },
      {
        id: 'r13',
        name: 'Hombros y Abdominales',
        description: 'Sesión de hombros completos + trabajo de core',
        exercises: [
          { exerciseId: 'e5', sets: 4, reps: '8', restSeconds: 120 },
          { exerciseId: 'e75', sets: 4, reps: '10', restSeconds: 90 },
          { exerciseId: 'e77', sets: 4, reps: '15', restSeconds: 60 },
          { exerciseId: 'e78', sets: 3, reps: '12', restSeconds: 60 },
          { exerciseId: 'e79', sets: 4, reps: '15', restSeconds: 60 },
          { exerciseId: 'e73', sets: 3, reps: '15', restSeconds: 60 },
          { exerciseId: 'e122', sets: 3, reps: '12', restSeconds: 60 },
          { exerciseId: 'e123', sets: 3, reps: '20', restSeconds: 60 },
          { exerciseId: 'e120', sets: 3, reps: '45s', restSeconds: 60 },
        ],
        isTemplate: true,
        createdBy: 'trainer-1',
      },
      // ─── Strength Programs ────
      {
        id: 'r14',
        name: 'Fuerza 5×5 (StrongLifts)',
        description: 'Programa de fuerza básico con movimientos compuestos 5×5',
        exercises: [
          { exerciseId: 'e1', sets: 5, reps: '5', restSeconds: 180, notes: 'Aumentar 2.5kg cada sesión' },
          { exerciseId: 'e2', sets: 5, reps: '5', restSeconds: 180, notes: 'Aumentar 2.5kg cada sesión' },
          { exerciseId: 'e63', sets: 5, reps: '5', restSeconds: 180, notes: 'Aumentar 2.5kg cada sesión' },
        ],
        isTemplate: true,
        createdBy: 'trainer-1',
      },
      {
        id: 'r15',
        name: 'Fuerza 5×5 – Día B',
        description: 'Variante B del programa 5×5: sentadilla, press militar, peso muerto',
        exercises: [
          { exerciseId: 'e1', sets: 5, reps: '5', restSeconds: 180, notes: 'Aumentar 2.5kg cada sesión' },
          { exerciseId: 'e5', sets: 5, reps: '5', restSeconds: 180, notes: 'Aumentar 2.5kg cada sesión' },
          { exerciseId: 'e4', sets: 1, reps: '5', restSeconds: 180, notes: 'Aumentar 5kg cada sesión' },
        ],
        isTemplate: true,
        createdBy: 'trainer-1',
      },
      // ─── Glutes & Core ────
      {
        id: 'r16',
        name: 'Glúteos y Core',
        description: 'Enfoque en glúteos y estabilización de core',
        exercises: [
          { exerciseId: 'e112', sets: 4, reps: '12', restSeconds: 90 },
          { exerciseId: 'e113', sets: 3, reps: '15', restSeconds: 60 },
          { exerciseId: 'e101', sets: 3, reps: '10', restSeconds: 90 },
          { exerciseId: 'e114', sets: 3, reps: '15', restSeconds: 60 },
          { exerciseId: 'e106', sets: 3, reps: '12', restSeconds: 90 },
          { exerciseId: 'e111', sets: 3, reps: '15', restSeconds: 60 },
          { exerciseId: 'e120', sets: 3, reps: '45s', restSeconds: 60 },
          { exerciseId: 'e127', sets: 3, reps: '30s', restSeconds: 60 },
          { exerciseId: 'e128', sets: 3, reps: '12', restSeconds: 60 },
        ],
        isTemplate: true,
        createdBy: 'trainer-1',
      },
      // ─── Full Body Intermediate / Advanced ────
      {
        id: 'r17',
        name: 'Full Body Intermedio',
        description: 'Rutina cuerpo completo nivel intermedio, ideal 3x semana',
        exercises: [
          { exerciseId: 'e1', sets: 4, reps: '8', restSeconds: 120 },
          { exerciseId: 'e2', sets: 4, reps: '8', restSeconds: 120 },
          { exerciseId: 'e63', sets: 4, reps: '8', restSeconds: 90 },
          { exerciseId: 'e5', sets: 3, reps: '10', restSeconds: 90 },
          { exerciseId: 'e82', sets: 3, reps: '10', restSeconds: 60 },
          { exerciseId: 'e92', sets: 3, reps: '12', restSeconds: 60 },
          { exerciseId: 'e112', sets: 3, reps: '12', restSeconds: 90 },
          { exerciseId: 'e120', sets: 3, reps: '45s', restSeconds: 60 },
        ],
        isTemplate: true,
        createdBy: 'trainer-1',
      },
      {
        id: 'r18',
        name: 'Full Body Avanzado',
        description: 'Rutina cuerpo completo nivel avanzado con compuestos pesados',
        exercises: [
          { exerciseId: 'e4', sets: 5, reps: '5', restSeconds: 180 },
          { exerciseId: 'e100', sets: 4, reps: '6', restSeconds: 150 },
          { exerciseId: 'e50', sets: 4, reps: '8', restSeconds: 120 },
          { exerciseId: 'e3', sets: 4, reps: '8', restSeconds: 120, notes: 'Con lastre si es posible' },
          { exerciseId: 'e75', sets: 4, reps: '10', restSeconds: 90 },
          { exerciseId: 'e71', sets: 4, reps: '10', restSeconds: 90 },
          { exerciseId: 'e77', sets: 3, reps: '15', restSeconds: 60 },
          { exerciseId: 'e122', sets: 3, reps: '12', restSeconds: 60 },
        ],
        isTemplate: true,
        createdBy: 'trainer-1',
      },
      // ─── HIIT / Conditioning ────
      {
        id: 'r19',
        name: 'HIIT Circuito Metabólico',
        description: 'Circuito de alta intensidad para quemar grasa y mejorar resistencia',
        exercises: [
          { exerciseId: 'e150', sets: 4, reps: '10', restSeconds: 30 },
          { exerciseId: 'e152', sets: 4, reps: '15', restSeconds: 30 },
          { exerciseId: 'e125', sets: 4, reps: '20', restSeconds: 30 },
          { exerciseId: 'e143', sets: 4, reps: '10', restSeconds: 30 },
          { exerciseId: 'e151', sets: 4, reps: '10', restSeconds: 30 },
          { exerciseId: 'e61', sets: 4, reps: '15', restSeconds: 30 },
          { exerciseId: 'e120', sets: 4, reps: '30s', restSeconds: 30 },
        ],
        isTemplate: true,
        createdBy: 'trainer-1',
      },
      // ─── Specializations ────
      {
        id: 'r20',
        name: 'Brazos – Bíceps y Tríceps',
        description: 'Sesión especializada para brazos con alto volumen',
        exercises: [
          { exerciseId: 'e82', sets: 4, reps: '8', restSeconds: 90 },
          { exerciseId: 'e95', sets: 4, reps: '8', restSeconds: 90 },
          { exerciseId: 'e84', sets: 3, reps: '12', restSeconds: 60 },
          { exerciseId: 'e91', sets: 3, reps: '12', restSeconds: 60 },
          { exerciseId: 'e86', sets: 3, reps: '10', restSeconds: 60 },
          { exerciseId: 'e96', sets: 3, reps: '15', restSeconds: 60 },
          { exerciseId: 'e85', sets: 2, reps: '12', restSeconds: 60 },
          { exerciseId: 'e94', sets: 2, reps: '15', restSeconds: 60 },
        ],
        isTemplate: true,
        createdBy: 'trainer-1',
      },
      {
        id: 'r21',
        name: 'Olímpicos – Clean & Jerk',
        description: 'Sesión de levantamiento olímpico con accesorios',
        exercises: [
          { exerciseId: 'e140', sets: 5, reps: '3', restSeconds: 180, notes: 'Técnica primero, peso después' },
          { exerciseId: 'e100', sets: 4, reps: '5', restSeconds: 150 },
          { exerciseId: 'e5', sets: 4, reps: '6', restSeconds: 120 },
          { exerciseId: 'e63', sets: 4, reps: '8', restSeconds: 90 },
          { exerciseId: 'e72', sets: 3, reps: '12', restSeconds: 60 },
          { exerciseId: 'e120', sets: 3, reps: '45s', restSeconds: 60 },
        ],
        isTemplate: true,
        createdBy: 'trainer-1',
      },
      {
        id: 'r22',
        name: 'Bro Split – Pecho',
        description: 'Día de pecho clásico con alto volumen',
        exercises: [
          { exerciseId: 'e2', sets: 4, reps: '6-8', restSeconds: 120 },
          { exerciseId: 'e50', sets: 4, reps: '8-10', restSeconds: 90 },
          { exerciseId: 'e51', sets: 3, reps: '10', restSeconds: 90 },
          { exerciseId: 'e52', sets: 3, reps: '12', restSeconds: 60 },
          { exerciseId: 'e54', sets: 3, reps: '12', restSeconds: 60 },
          { exerciseId: 'e56', sets: 4, reps: '15', restSeconds: 60 },
          { exerciseId: 'e57', sets: 3, reps: '12', restSeconds: 90 },
        ],
        isTemplate: true,
        createdBy: 'trainer-1',
      },
      {
        id: 'r23',
        name: 'Bro Split – Espalda',
        description: 'Día de espalda completo con énfasis en grosor y ancho',
        exercises: [
          { exerciseId: 'e4', sets: 4, reps: '5-6', restSeconds: 180 },
          { exerciseId: 'e3', sets: 4, reps: '8', restSeconds: 120, notes: 'Agarre ancho' },
          { exerciseId: 'e68', sets: 4, reps: '8-10', restSeconds: 90 },
          { exerciseId: 'e64', sets: 3, reps: '10', restSeconds: 90 },
          { exerciseId: 'e67', sets: 3, reps: '12', restSeconds: 60 },
          { exerciseId: 'e73', sets: 3, reps: '15', restSeconds: 60 },
          { exerciseId: 'e74', sets: 4, reps: '12', restSeconds: 60 },
        ],
        isTemplate: true,
        createdBy: 'trainer-1',
      },
      {
        id: 'r24',
        name: 'Functional Fitness',
        description: 'Entrenamiento funcional con movimientos compuestos y unilaterales',
        exercises: [
          { exerciseId: 'e142', sets: 3, reps: '5', restSeconds: 120, notes: 'Cada lado' },
          { exerciseId: 'e108', sets: 3, reps: '10', restSeconds: 90 },
          { exerciseId: 'e101', sets: 3, reps: '10', restSeconds: 90, notes: 'Cada pierna' },
          { exerciseId: 'e64', sets: 3, reps: '10', restSeconds: 90, notes: 'Cada brazo' },
          { exerciseId: 'e132', sets: 3, reps: '30m', restSeconds: 60, notes: 'Farmer walk 30 metros' },
          { exerciseId: 'e129', sets: 3, reps: '12', restSeconds: 60, notes: 'Cada lado' },
          { exerciseId: 'e125', sets: 3, reps: '20', restSeconds: 60 },
        ],
        isTemplate: true,
        createdBy: 'trainer-1',
      },
    ];
    setRoutines([...templates, ...userRoutines]);
  };

  const seedDefaultData = () => {
    // No seed clients — the trainer adds their own clients
    setClients([]);

    // Seed exercises
    seedDefaultExercises();

    // Seed template routines
    seedDefaultRoutines([]);

    // No demo exercise logs
    setExerciseLogs([]);
  };

  // ─── Client CRUD ────────────────────────
  const addClient = (client: Client) => setClients(prev => [...prev, client]);

  const updateClient = (id: string, data: Partial<Client>) => {
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
  };

  const deleteClient = (id: string) => {
    setClients(prev => prev.filter(c => c.id !== id));
  };

  // ─── Measurements ──────────────────────
  const addMeasurement = (clientId: string, measurement: Measurement) => {
    setClients(prev => prev.map(c =>
      c.id === clientId ? { ...c, measurements: [...c.measurements, measurement] } : c
    ));
  };

  const deleteMeasurement = (clientId: string, measurementId: string) => {
    setClients(prev => prev.map(c =>
      c.id === clientId ? { ...c, measurements: c.measurements.filter(m => m.id !== measurementId) } : c
    ));
  };

  // ─── Progress Photos ──────────────────
  const addProgressPhoto = (clientId: string, photo: ProgressPhoto) => {
    setClients(prev => prev.map(c =>
      c.id === clientId ? { ...c, progressPhotos: [...c.progressPhotos, photo] } : c
    ));
  };

  const deleteProgressPhoto = (clientId: string, photoId: string) => {
    setClients(prev => prev.map(c =>
      c.id === clientId ? { ...c, progressPhotos: c.progressPhotos.filter(p => p.id !== photoId) } : c
    ));
  };

  // ─── Goals ─────────────────────────────
  const addGoal = (clientId: string, goal: ClientGoal) => {
    setClients(prev => prev.map(c =>
      c.id === clientId ? { ...c, goals: [...c.goals, goal] } : c
    ));
  };

  const updateGoal = (clientId: string, goalId: string, data: Partial<ClientGoal>) => {
    setClients(prev => prev.map(c =>
      c.id === clientId ? { ...c, goals: c.goals.map(g => g.id === goalId ? { ...g, ...data } : g) } : c
    ));
  };

  const deleteGoal = (clientId: string, goalId: string) => {
    setClients(prev => prev.map(c =>
      c.id === clientId ? { ...c, goals: c.goals.filter(g => g.id !== goalId) } : c
    ));
  };

  const toggleGoalComplete = (clientId: string, goalId: string) => {
    setClients(prev => prev.map(c =>
      c.id === clientId ? { ...c, goals: c.goals.map(g => g.id === goalId ? { ...g, isCompleted: !g.isCompleted } : g) } : c
    ));
  };

  // ─── Plans ─────────────────────────────
  const assignPlan = (clientId: string, plan: ClientPlan) => {
    setClients(prev => prev.map(c =>
      c.id === clientId ? { ...c, plans: [...c.plans, plan] } : c
    ));
  };

  const updatePlan = (clientId: string, planId: string, data: Partial<ClientPlan>) => {
    setClients(prev => prev.map(c =>
      c.id === clientId ? { ...c, plans: c.plans.map(p => p.id === planId ? { ...p, ...data } : p) } : c
    ));
  };

  const removePlan = (clientId: string, planId: string) => {
    setClients(prev => prev.map(c =>
      c.id === clientId ? { ...c, plans: c.plans.filter(p => p.id !== planId) } : c
    ));
  };

  // ─── Exercise / Routine / Session ──────
  const addExercise = (exercise: Exercise) => setExercises(prev => [...prev, exercise]);
  const updateExercise = (id: string, data: Partial<Exercise>) => {
    setExercises(prev => prev.map(e => e.id === id ? { ...e, ...data } : e));
  };
  const deleteExercise = (id: string) => {
    setExercises(prev => prev.filter(e => e.id !== id));
  };

  const addRoutine = (routine: Routine) => setRoutines(prev => [...prev, routine]);
  const updateRoutine = (id: string, data: Partial<Routine>) => {
    setRoutines(prev => prev.map(r => r.id === id ? { ...r, ...data } : r));
  };
  const deleteRoutine = (id: string) => {
    setRoutines(prev => prev.filter(r => r.id !== id));
  };

  const addSession = (session: TrainingSession) => setSessions(prev => [...prev, session]);

  // ─── Exercise Logs ─────────────────────
  const addExerciseLog = (log: ExerciseLog) => setExerciseLogs(prev => [...prev, log]);
  const updateExerciseLog = (logId: string, data: Partial<ExerciseLog>) => {
    setExerciseLogs(prev => prev.map(l => l.id === logId ? { ...l, ...data } : l));
  };
  const deleteExerciseLog = (logId: string) => setExerciseLogs(prev => prev.filter(l => l.id !== logId));
  const getLogsForExercise = (exerciseId: string, clientId?: string): ExerciseLog[] => {
    return exerciseLogs
      .filter(l => l.exerciseId === exerciseId && (!clientId || l.clientId === clientId))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  if (!isLoaded) {
    return (
      <View style={loadingStyles.container}>
        <ActivityIndicator size="large" color="#64ffda" />
        <Text style={loadingStyles.text}>Cargando datos...</Text>
      </View>
    );
  }

  return (
    <AppDataContext.Provider value={{
      isLoading: !isLoaded,
      clients, exercises, routines, sessions, exerciseLogs,
      addClient, updateClient, deleteClient,
      addMeasurement, deleteMeasurement,
      addProgressPhoto, deleteProgressPhoto,
      addGoal, updateGoal, deleteGoal, toggleGoalComplete,
      assignPlan, updatePlan, removePlan,
      addExercise, updateExercise, deleteExercise,
      addRoutine, updateRoutine, deleteRoutine,
      addSession,
      addExerciseLog, updateExerciseLog, deleteExerciseLog, getLogsForExercise,
    }}>
      {children}
    </AppDataContext.Provider>
  );
};

export const useAppData = () => {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData must be used within an AppDataProvider');
  }
  return context;
};

const loadingStyles = RNStyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a192f',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  text: {
    color: '#8892b0',
    fontSize: 14,
    fontWeight: '500',
  },
});
