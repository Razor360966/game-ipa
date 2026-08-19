import { Question, Team, TeamCardAssignment, TeamColor } from '../types';

export const INITIAL_TEAMS: Team[] = [
  { id: 'team-alpha', name: 'ALPHA', color: 'cyan', score: 0, correctCount: 0, wrongCount: 0 },
  { id: 'team-bravo', name: 'BRAVO', color: 'emerald', score: 0, correctCount: 0, wrongCount: 0 },
  { id: 'team-charlie', name: 'CHARLIE', color: 'amber', score: 0, correctCount: 0, wrongCount: 0 },
  { id: 'team-delta', name: 'DELTA', color: 'rose', score: 0, correctCount: 0, wrongCount: 0 },
];

export const COLOR_MAP: Record<
  TeamColor,
  {
    bg: string;
    bgHover: string;
    border: string;
    borderActive: string;
    text: string;
    badge: string;
    glow: string;
    accent: string;
  }
> = {
  cyan: {
    bg: 'bg-cyan-500/10 backdrop-blur-xl',
    bgHover: 'hover:bg-cyan-500/15 hover:border-cyan-400/50',
    border: 'border-cyan-400/30',
    borderActive: 'border-cyan-400 shadow-[0_0_35px_rgba(34,211,238,0.3)] ring-2 ring-cyan-400/50',
    text: 'text-cyan-400',
    badge: 'bg-cyan-500 text-slate-950',
    glow: 'shadow-[0_0_35px_rgba(34,211,238,0.25)]',
    accent: '#22d3ee',
  },
  emerald: {
    bg: 'bg-emerald-500/10 backdrop-blur-xl',
    bgHover: 'hover:bg-emerald-500/15 hover:border-emerald-400/50',
    border: 'border-emerald-400/30',
    borderActive: 'border-emerald-400 shadow-[0_0_35px_rgba(52,211,153,0.3)] ring-2 ring-emerald-400/50',
    text: 'text-emerald-400',
    badge: 'bg-emerald-500 text-slate-950',
    glow: 'shadow-[0_0_35px_rgba(52,211,153,0.25)]',
    accent: '#34d399',
  },
  amber: {
    bg: 'bg-amber-500/10 backdrop-blur-xl',
    bgHover: 'hover:bg-amber-500/15 hover:border-amber-400/50',
    border: 'border-amber-400/30',
    borderActive: 'border-amber-400 shadow-[0_0_35px_rgba(251,191,36,0.3)] ring-2 ring-amber-400/50',
    text: 'text-amber-400',
    badge: 'bg-amber-500 text-slate-950',
    glow: 'shadow-[0_0_35px_rgba(251,191,36,0.25)]',
    accent: '#fbbf24',
  },
  rose: {
    bg: 'bg-rose-500/10 backdrop-blur-xl',
    bgHover: 'hover:bg-rose-500/15 hover:border-rose-400/50',
    border: 'border-rose-400/30',
    borderActive: 'border-rose-400 shadow-[0_0_35px_rgba(251,113,133,0.3)] ring-2 ring-rose-400/50',
    text: 'text-rose-400',
    badge: 'bg-rose-500 text-slate-950',
    glow: 'shadow-[0_0_35px_rgba(251,113,133,0.25)]',
    accent: '#fb7185',
  },
  purple: {
    bg: 'bg-purple-500/10 backdrop-blur-xl',
    bgHover: 'hover:bg-purple-500/15 hover:border-purple-400/50',
    border: 'border-purple-400/30',
    borderActive: 'border-purple-400 shadow-[0_0_35px_rgba(192,132,252,0.3)] ring-2 ring-purple-400/50',
    text: 'text-purple-400',
    badge: 'bg-purple-500 text-slate-950',
    glow: 'shadow-[0_0_35px_rgba(192,132,252,0.25)]',
    accent: '#c084fc',
  },
  blue: {
    bg: 'bg-blue-500/10 backdrop-blur-xl',
    bgHover: 'hover:bg-blue-500/15 hover:border-blue-400/50',
    border: 'border-blue-400/30',
    borderActive: 'border-blue-400 shadow-[0_0_35px_rgba(96,165,250,0.3)] ring-2 ring-blue-400/50',
    text: 'text-blue-400',
    badge: 'bg-blue-500 text-slate-950',
    glow: 'shadow-[0_0_35px_rgba(96,165,250,0.25)]',
    accent: '#60a5fa',
  },
  orange: {
    bg: 'bg-orange-500/10 backdrop-blur-xl',
    bgHover: 'hover:bg-orange-500/15 hover:border-orange-400/50',
    border: 'border-orange-400/30',
    borderActive: 'border-orange-400 shadow-[0_0_35px_rgba(251,146,60,0.3)] ring-2 ring-orange-400/50',
    text: 'text-orange-400',
    badge: 'bg-orange-500 text-slate-950',
    glow: 'shadow-[0_0_35px_rgba(251,146,60,0.25)]',
    accent: '#fb923c',
  },
  indigo: {
    bg: 'bg-indigo-500/10 backdrop-blur-xl',
    bgHover: 'hover:bg-indigo-500/15 hover:border-indigo-400/50',
    border: 'border-indigo-400/30',
    borderActive: 'border-indigo-400 shadow-[0_0_35px_rgba(129,140,248,0.3)] ring-2 ring-indigo-400/50',
    text: 'text-indigo-400',
    badge: 'bg-indigo-500 text-slate-950',
    glow: 'shadow-[0_0_35px_rgba(129,140,248,0.25)]',
    accent: '#818cf8',
  },
};

export const DEMO_QUESTIONS: Question[] = [
  {
    id: 'q-01',
    code: 'MB-01',
    type: 'short_answer',
    questionText: 'Berapa centimeter (cm) dalam 2,5 meter?',
    correctAnswer: '250 cm',
    alternativeAnswers: ['250', '250cm', '250 centimeter', '250 cm'],
    points: 10,
    category: 'Konversi Panjang',
    explanation: '1 meter = 100 cm, maka 2,5 m × 100 = 250 cm.',
    unitHint: 'cm',
  },
  {
    id: 'q-02',
    code: 'MB-02',
    type: 'multiple_choice',
    questionText: 'Alat ukur yang paling tepat dan teliti untuk mengukur diameter luar koin atau kelereng adalah...',
    correctAnswer: 'B',
    correctOptionId: 'B',
    options: [
      { id: 'A', label: 'A', text: 'Mistar Kayu' },
      { id: 'B', label: 'B', text: 'Jangka Sorong' },
      { id: 'C', label: 'C', text: 'Meteran Pita' },
      { id: 'D', label: 'D', text: 'Neraca Ohaus' },
    ],
    alternativeAnswers: ['Jangka Sorong', 'jangka sorong', 'B'],
    points: 10,
    category: 'Alat Ukur',
    explanation: 'Jangka sorong memiliki rahang bawah untuk mengukur diameter luar benda bundar dengan ketelitian 0,01 cm.',
  },
  {
    id: 'q-03',
    code: 'MB-03',
    type: 'short_answer',
    questionText: 'Sebuah balok kayu memiliki panjang 8 cm, lebar 5 cm, dan tinggi 3 cm. Berapakah volume balok tersebut dalam cm³?',
    correctAnswer: '120 cm³',
    alternativeAnswers: ['120', '120 cm3', '120cm3', '120 cm^3', '120 kubik'],
    points: 10,
    category: 'Volume & Geometri',
    explanation: 'Volume balok = panjang × lebar × tinggi = 8 × 5 × 3 = 120 cm³.',
    unitHint: 'cm³',
  },
  {
    id: 'q-04',
    code: 'MB-04',
    type: 'multiple_choice',
    questionText: 'Satuan Internasional (SI) yang sah untuk besaran pokok Suhu Mutlak adalah...',
    correctAnswer: 'C',
    correctOptionId: 'C',
    options: [
      { id: 'A', label: 'A', text: 'Derajat Celcius (°C)' },
      { id: 'B', label: 'B', text: 'Derajat Fahrenheit (°F)' },
      { id: 'C', label: 'C', text: 'Kelvin (K)' },
      { id: 'D', label: 'D', text: 'Reamur (°R)' },
    ],
    alternativeAnswers: ['Kelvin', 'kelvin', 'C', 'K'],
    points: 10,
    category: 'Besaran & Satuan SI',
    explanation: 'Dalam sistem Satuan Internasional (SI), standar baku suhu mutlak adalah Kelvin (K).',
  },
  {
    id: 'q-05',
    code: 'MB-05',
    type: 'statement_correction',
    questionText: 'Periksa kebenaran pernyataan berikut: "1 kilogram massa benda setara dengan 100 gram."',
    correctAnswer: 'SALAH (Koreksi: 1000 gram)',
    alternativeAnswers: ['1000 gram', '1000 g', '1000g', '1000'],
    points: 10,
    category: 'Pernyataan Konversi Massa',
    explanation: '1 kilogram = 1.000 gram (kilo = 10³ = seribu).',
    statementConfig: {
      statement: '1 kilogram massa benda setara dengan 100 gram.',
      isTrue: false,
      correctionKey: '1000 gram',
      correctionAlternatives: ['1000 gram', '1000 g', '1000', '1000gram', '1 kg = 1000 g'],
      scoringMode: 'partial',
    },
  },
  {
    id: 'q-06',
    code: 'MB-06',
    type: 'short_answer',
    questionText: 'Jika sebuah mobil menempuh jarak 120 km dalam waktu 2 jam, berapakah kecepatan rata-rata mobil tersebut dalam km/jam?',
    correctAnswer: '60 km/jam',
    alternativeAnswers: ['60', '60 kmh', '60km/jam', '60 km / jam'],
    points: 10,
    category: 'Kecepatan & Waktu',
    explanation: 'Kecepatan v = s / t = 120 km / 2 jam = 60 km/jam.',
    unitHint: 'km/jam',
  },
  {
    id: 'q-07',
    code: 'MB-07',
    type: 'statement_correction',
    questionText: 'Periksa kebenaran pernyataan berikut: "Mikrometer sekrup memiliki tingkat ketelitian 0,01 mm dan dapat digunakan untuk mengukur ketebalan koin atau kertas tipis."',
    correctAnswer: 'BENAR',
    alternativeAnswers: ['benar', 'true'],
    points: 10,
    category: 'Pernyataan Alat Ukur',
    explanation: 'Pernyataan benar, mikrometer sekrup memiliki ketelitian 0,01 mm atau 0,001 cm.',
    statementConfig: {
      statement: 'Mikrometer sekrup memiliki tingkat ketelitian 0,01 mm dan dapat digunakan untuk mengukur ketebalan koin atau kertas tipis.',
      isTrue: true,
      scoringMode: 'full',
    },
  },
  {
    id: 'q-08',
    code: 'MB-08',
    type: 'multi_part',
    questionText: 'Soal Terstruktur: Analisis Massa Jenis dan Daya Apung Benda Logam',
    correctAnswer: 'Part 1: 4 g/cm³ | Part 2: Tenggelam',
    alternativeAnswers: [],
    points: 10,
    category: 'Soal Terstruktur',
    explanation: 'ρ = m / V = 200 / 50 = 4 g/cm³. Karena ρ benda (4 g/cm³) > ρ air (1 g/cm³), benda akan tenggelam.',
    multiPartConfig: {
      introduction: 'Sebuah balok padat memiliki massa 200 gram dan volume 50 cm³. Balok tersebut kemudian dimasukkan ke dalam bejana berisi air (massa jenis air = 1 g/cm³).',
      scoringMode: 'partial',
      parts: [
        {
          id: 'mp-1',
          question: 'Berapakah massa jenis (densitas) balok padat tersebut dalam g/cm³?',
          correctAnswer: '4 g/cm³',
          alternativeAnswers: ['4', '4 g/cm3', '4g/cm3', '4 g/cm^3'],
        },
        {
          id: 'mp-2',
          question: 'Apakah balok tersebut akan Terapung, Melayang, atau Tenggelam di dalam air?',
          correctAnswer: 'Tenggelam',
          alternativeAnswers: ['tenggelam', 'Tenggelam.', 'akan tenggelam'],
        },
      ],
    },
  },
  {
    id: 'q-09',
    code: 'MB-09',
    type: 'multiple_choice',
    questionText: 'Dari kelompok besaran fisika berikut, manakah yang seluruhnya merupakan Besaran Pokok dalam SI?',
    correctAnswer: 'A',
    correctOptionId: 'A',
    options: [
      { id: 'A', label: 'A', text: 'Panjang, Massa, Waktu, Suhu' },
      { id: 'B', label: 'B', text: 'Kecepatan, Percepatan, Gaya, Usaha' },
      { id: 'C', label: 'C', text: 'Volume, Luas, Massa Jenis, Daya' },
      { id: 'D', label: 'D', text: 'Energi, Tegangan, Kuat Arus, Tekanan' },
    ],
    alternativeAnswers: ['A'],
    points: 10,
    category: 'Besaran Pokok & Turunan',
    explanation: '7 besaran pokok: Panjang, Massa, Waktu, Suhu, Kuat Arus, Intensitas Cahaya, Jumlah Zat.',
  },
  {
    id: 'q-10',
    code: 'MB-10',
    type: 'short_answer',
    questionText: 'Berapa detik dalam waktu 15 menit?',
    correctAnswer: '900 detik',
    alternativeAnswers: ['900', '900 s', '900 s', '900detik', '900 sekon'],
    points: 10,
    category: 'Konversi Waktu',
    explanation: '1 menit = 60 detik. 15 menit × 60 = 900 detik.',
    unitHint: 'detik',
  },
];

export const DEFAULT_QUESTIONS: Question[] = DEMO_QUESTIONS;

/**
 * Generates initial/demo state with 4 teams, 10 questions, 5 min duration
 */
export function createDemoState(): {
  teams: Team[];
  questions: Question[];
  durationMinutes: number;
} {
  return {
    teams: [
      { id: 'team-alpha', name: 'ALPHA', color: 'cyan', score: 0, correctCount: 0, wrongCount: 0 },
      { id: 'team-bravo', name: 'BRAVO', color: 'emerald', score: 0, correctCount: 0, wrongCount: 0 },
      { id: 'team-charlie', name: 'CHARLIE', color: 'amber', score: 0, correctCount: 0, wrongCount: 0 },
      { id: 'team-delta', name: 'DELTA', color: 'rose', score: 0, correctCount: 0, wrongCount: 0 },
    ],
    questions: [...DEMO_QUESTIONS],
    durationMinutes: 5,
  };
}

/**
 * Generates randomized card decks for all teams from question pool.
 * Each team gets cards (1..cardsPerTeam) pointing to questions.
 * If randomized is true, question order is shuffled uniquely per team!
 */
export function generateTeamCardDecks(
  teams: Team[],
  questions: Question[],
  cardsPerTeam: number = 10,
  randomized: boolean = true
): Record<string, TeamCardAssignment[]> {
  const decks: Record<string, TeamCardAssignment[]> = {};
  const validCardsCount = Math.min(cardsPerTeam, questions.length);

  teams.forEach((team) => {
    // Clone and shuffle question indices if randomized
    const questionIndices = Array.from({ length: questions.length }, (_, i) => i);

    if (randomized) {
      // Fisher-Yates shuffle
      for (let i = questionIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [questionIndices[i], questionIndices[j]] = [questionIndices[j], questionIndices[i]];
      }
    }

    const selectedIndices = questionIndices.slice(0, validCardsCount);

    const teamPrefix = team.name.replace(/[^A-Z0-9]/gi, '').slice(0, 3).toUpperCase() || 'K';

    const cards: TeamCardAssignment[] = selectedIndices.map((qIdx, cardIndex) => {
      const cardNum = cardIndex + 1;
      const formattedNum = String(cardNum).padStart(2, '0');
      return {
        cardNumber: cardNum,
        cardCode: `${teamPrefix}-${formattedNum}`,
        questionId: questions[qIdx].id,
        status: 'unanswered',
        attempts: 0,
      };
    });

    decks[team.id] = cards;
  });

  return decks;
}
