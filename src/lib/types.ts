export type Concept = {
  id: string;
  title: string;
  summary: string;
  key_points: string[];
  faqs: { question: string; answer: string }[];
};
export type Question = {
  id: string;
  concept_id: string;
  difficulty: "easy" | "medium" | "hard";
  type: "multiple_choice";
  question: string;
  choices: string[];
  answer_index: number;
  hint: string;
  explanation: string;
  wrong_feedback: string;
  source_refs: { file: string; page: number | null }[];
};
export type Flashcard = {
  id: string;
  concept_id: string;
  front: string;
  back: string;
};
export type StudyPack = {
  schema_version: "1.0";
  title: string;
  description: string;
  source_documents?: string[];
  concepts: Concept[];
  questions: Question[];
  flashcards: Flashcard[];
};
export type Profile = { id: string; name: string; role: "admin" | "learner" };
export const profiles: Profile[] = [
  { id: "admin", name: "관리자", role: "admin" },
  { id: "learner-1", name: "학습자 1", role: "learner" },
  { id: "learner-2", name: "학습자 2", role: "learner" },
  { id: "learner-3", name: "학습자 3", role: "learner" },
];
export type Revision = {
  id: string;
  version: number;
  createdAt: string;
  data: StudyPack;
};
export type Pack = {
  id: string;
  publishedId: string | null;
  access: string[];
  revisions: Revision[];
};
export type Review = {
  userId: string;
  packId: string;
  revisionId: string;
  itemId: string;
  kind: "question" | "flashcard";
  streak: number;
  due: string;
  lastCorrect: boolean;
};
export type Grade = {
  questionId: string;
  selected: number | null;
  correct: boolean;
  answer: number;
  explanation: string;
  feedback: string;
  sources: Question["source_refs"];
};
export type Run = {
  id: string;
  userId: string;
  packId: string;
  revisionId: string;
  questionIds: string[];
  mode: "quiz" | "review" | "exam";
  startedAt: string;
  deadline: string | null;
  grades: Grade[] | null;
  submittedAt: string | null;
};
export type Goal = {
  userId: string;
  packId: string;
  examDate: string;
  dailyMinutes: number;
};
export type State = {
  version: 1;
  packs: Pack[];
  runs: Run[];
  reviews: Review[];
  goals: Goal[];
  sessions: { token: string; userId: string; expiresAt: number }[];
  studied: { userId: string; revisionId: string; conceptId: string }[];
};
export type SafeQuestion = Pick<
  Question,
  "id" | "concept_id" | "question" | "choices" | "hint" | "difficulty"
>;
export type PublicPack = {
  id: string;
  revisionId: string;
  version: number;
  title: string;
  description: string;
  concepts: Concept[];
  questionCount: number;
  flashcards: Flashcard[];
  studied: string[];
  goal?: Goal;
};
export type AdminPack = {
  id: string;
  title: string;
  publishedId: string | null;
  access: string[];
  revisions: {
    id: string;
    version: number;
    title: string;
    questionCount: number;
  }[];
};
export type RunView = {
  id: string;
  mode: Run["mode"];
  title: string;
  version: number;
  deadline: string | null;
  questions: SafeQuestion[];
  grades: Grade[] | null;
  submittedAt: string | null;
};
export type Summary = {
  answered: number;
  correct: number;
  sessions: number;
  due: number;
  concepts: {
    packId: string;
    conceptId: string;
    title: string;
    count: number;
    accuracy: number | null;
    status: string;
  }[];
  history: {
    id: string;
    title: string;
    version: number;
    mode: Run["mode"];
    correct: number;
    total: number;
    date: string;
  }[];
};
export type ReviewView = Review & {
  title: string;
  text: string;
  question?: Question;
  front?: string;
  back?: string;
};
export type Bootstrap = {
  user: Profile | null;
  profiles: Profile[];
  packs: PublicPack[];
  adminPacks: AdminPack[];
  reviews: ReviewView[];
  summary: Summary;
  today: string;
};
