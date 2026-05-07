export type UserRole = 'trainer' | 'student';

export interface Measurement {
  id: string;
  date: string;
  weight: number;
  bodyFatPercentage?: number;
  bmi?: number;
  chest?: number;
  waist?: number;
  hips?: number;
  biceps?: number;
  quadriceps?: number;
  notes?: string;
}

export interface ProgressPhoto {
  id: string;
  date: string;
  frontUrl: string;
  backUrl?: string;
  sideUrl?: string;
}

export interface ClientGoal {
  id: string;
  type: 'weight_loss' | 'muscle_gain' | 'maintenance' | 'endurance' | 'flexibility' | 'other';
  targetValue?: number;
  currentValue?: number;
  description: string;
  deadline?: string;
  isCompleted: boolean;
  createdAt: string;
}

export type WeekDay = 'lunes' | 'martes' | 'miércoles' | 'jueves' | 'viernes' | 'sábado' | 'domingo';

export interface PlanExercise {
  exerciseId: string;
  sets: number;
  reps?: string;
  restSeconds?: number;
  weight?: number;
  notes?: string;
}

export interface ClientPlan {
  id: string;
  clientId: string;
  routineId: string; // original routine (template reference)
  templateName: string; // snapshot of routine name
  exercises: PlanExercise[]; // independent copy of exercises
  assignedDate: string;
  startDate: string;
  endDate?: string;
  daysPerWeek: number;
  weekDays: WeekDay[]; // specific days assigned
  weekDayTimes?: Partial<Record<WeekDay, string>>; // HH:mm scheduled time per day
  notes?: string;
  active: boolean;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  photoUrl?: string;
  birthDate?: string; // ISO date
  height?: number; // cm
  measurements: Measurement[];
  progressPhotos: ProgressPhoto[];
  goals: ClientGoal[];
  plans: ClientPlan[];
  active: boolean;
  joinDate: string;
}

export type MuscleGroupCategory = 
  | 'Pecho' | 'Espalda' | 'Hombros' | 'Bíceps' | 'Tríceps' | 'Brazos'
  | 'Piernas' | 'Glúteos' | 'Core' | 'Pantorrillas' | 'Antebrazos'
  | 'Cuerpo Completo' | 'Cardio';

export interface Exercise {
  id: string;
  name: string;
  description?: string;
  muscleGroup: string[];
  primaryMuscles?: string[]; // specific muscles targeted
  secondaryMuscles?: string[]; // assisting muscles
  equipment?: string;
  instructions?: string[]; // step-by-step execution
  tips?: string[]; // pro tips
  commonMistakes?: string[]; // common errors to avoid
  videoUrl?: string;
  imageUrl?: string;
  popularity?: number; // 1-5 stars
  icon?: string; // emoji icon
  isDefault?: boolean; // pre-loaded exercise
  difficulty?: 'Principiante' | 'Intermedio' | 'Avanzado';
}

export interface RoutineExercise {
  exerciseId: string;
  sets: number;
  reps?: string; // string to allow "10-12"
  restSeconds?: number;
  weight?: number;
  notes?: string;
}

export interface Routine {
  id: string;
  name: string;
  description?: string;
  exercises: RoutineExercise[];
  isTemplate: boolean;
  createdBy: string; // Trainer ID
}

export interface TrainingSession {
  id: string;
  clientId: string;
  routineId?: string;
  date: string; // ISO Date
  completed: boolean;
  feedback?: string;
  rating?: number;
}

export interface ExerciseSet {
  setNumber: number;
  weight: number; // kg
  reps: number;
  rpe?: number; // Rate of Perceived Exertion 1-10
}

export interface ExerciseLog {
  id: string;
  clientId: string;
  exerciseId: string;
  date: string; // ISO Date
  sets: ExerciseSet[];
  notes?: string;
}
