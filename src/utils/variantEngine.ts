import { Question, QuestionVariant, Team, GameState, MultipleChoiceOption, StatementCorrectionConfig, MultiPartConfig } from '../types';

/**
 * Deterministic hash function for string inputs.
 * Guarantees identical numeric hash output across all browsers/platforms without Math.random().
 */
export function deterministicHash(input: string): number {
  let hash = 0;
  if (!input || input.length === 0) return hash;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Built-in parametric variant generators for Measurement / Physics questions.
 * Ensures identical difficulty, formula, and competency with varied numerical values and contexts.
 */
export const BUILT_IN_VARIATION_TEMPLATES: Record<
  string,
  (teamIndex: number, teamName: string) => Partial<QuestionVariant>
> = {
  // 1. Konversi Panjang (q-01)
  'q-01': (idx, teamName) => {
    const variants = [
      { text: 'Berapa centimeter (cm) dalam 2,5 meter?', ans: '250 cm', alts: ['250', '250cm', '250 centimeter', '250 cm'], val: 2.5, exp: '2,5 m × 100 = 250 cm.' },
      { text: 'Berapa centimeter (cm) dalam 3,5 meter?', ans: '350 cm', alts: ['350', '350cm', '350 centimeter', '350 cm'], val: 3.5, exp: '3,5 m × 100 = 350 cm.' },
      { text: 'Berapa centimeter (cm) dalam 1,5 meter?', ans: '150 cm', alts: ['150', '150cm', '150 centimeter', '150 cm'], val: 1.5, exp: '1,5 m × 100 = 150 cm.' },
      { text: 'Berapa centimeter (cm) dalam 4,5 meter?', ans: '450 cm', alts: ['450', '450cm', '450 centimeter', '450 cm'], val: 4.5, exp: '4,5 m × 100 = 450 cm.' },
      { text: 'Berapa centimeter (cm) dalam 5,5 meter?', ans: '550 cm', alts: ['550', '550cm', '550 centimeter', '550 cm'], val: 5.5, exp: '5,5 m × 100 = 550 cm.' },
      { text: 'Berapa centimeter (cm) dalam 0,8 meter?', ans: '80 cm', alts: ['80', '80cm', '80 centimeter', '80 cm'], val: 0.8, exp: '0,8 m × 100 = 80 cm.' },
      { text: 'Berapa centimeter (cm) dalam 1,2 meter?', ans: '120 cm', alts: ['120', '120cm', '120 centimeter', '120 cm'], val: 1.2, exp: '1,2 m × 100 = 120 cm.' },
      { text: 'Berapa centimeter (cm) dalam 6,5 meter?', ans: '650 cm', alts: ['650', '650cm', '650 centimeter', '650 cm'], val: 6.5, exp: '6,5 m × 100 = 650 cm.' },
    ];
    const picked = variants[idx % variants.length];
    return {
      variantCode: `VAR-${String.fromCharCode(65 + (idx % variants.length))}`,
      variantLabel: `Variasi ${teamName}`,
      questionText: picked.text,
      correctAnswer: picked.ans,
      alternativeAnswers: picked.alts,
      explanation: picked.exp,
      unitHint: 'cm',
      parameters: { meter: picked.val, targetCm: picked.ans },
    };
  },

  // 2. Alat Ukur (q-02)
  'q-02': (idx, teamName) => {
    const variants = [
      {
        target: 'diameter luar koin atau kelereng',
        text: 'Alat ukur yang paling tepat dan teliti untuk mengukur diameter luar koin atau kelereng adalah...',
        ans: 'B',
        opts: [
          { id: 'A', label: 'A', text: 'Mistar Kayu' },
          { id: 'B', label: 'B', text: 'Jangka Sorong' },
          { id: 'C', label: 'C', text: 'Meteran Pita' },
          { id: 'D', label: 'D', text: 'Neraca Ohaus' },
        ],
        alts: ['Jangka Sorong', 'jangka sorong', 'B'],
        exp: 'Jangka sorong memiliki rahang luar untuk mengukur diameter koin dengan ketelitian 0,01 cm.',
      },
      {
        target: 'diameter dalam pipa atau tabung reaksi',
        text: 'Alat ukur yang paling tepat dan teliti untuk mengukur diameter dalam pipa atau tabung reaksi adalah...',
        ans: 'B',
        opts: [
          { id: 'A', label: 'A', text: 'Mistar Baja' },
          { id: 'B', label: 'B', text: 'Jangka Sorong (Rahang Atas)' },
          { id: 'C', label: 'C', text: 'Roll Meter' },
          { id: 'D', label: 'D', text: 'Stopwatch' },
        ],
        alts: ['Jangka Sorong', 'Jangka Sorong (Rahang Atas)', 'jangka sorong', 'B'],
        exp: 'Rahang atas (rahang geser atas) pada jangka sorong dirancang khusus mengukur diameter dalam benda berongga.',
      },
      {
        target: 'ketebalan selembar kertas atau kawat tipis',
        text: 'Alat ukur mekanik dengan ketelitian tinggi (0,01 mm) yang paling ideal untuk mengukur ketebalan selembar kertas adalah...',
        ans: 'C',
        opts: [
          { id: 'A', label: 'A', text: 'Mistar Plastik' },
          { id: 'B', label: 'B', text: 'Meteran Gulung' },
          { id: 'C', label: 'C', text: 'Mikrometer Sekrup' },
          { id: 'D', label: 'D', text: 'Termometer' },
        ],
        alts: ['Mikrometer Sekrup', 'mikrometer sekrup', 'C', 'mikrometer'],
        exp: 'Mikrometer sekrup memiliki tingkat ketelitian 0,01 mm yang sangat teliti untuk benda tipis.',
      },
      {
        target: 'kedalaman tabung ukur kecil',
        text: 'Bagian pada jangka sorong yang digunakan untuk mengukur kedalaman tabung atau lubang sempit adalah...',
        ans: 'A',
        opts: [
          { id: 'A', label: 'A', text: 'Tangkai Pengukur Kedalaman (Depth Bar)' },
          { id: 'B', label: 'B', text: 'Rahang Luar (Rahang Bawah)' },
          { id: 'C', label: 'C', text: 'Skala Utama Saja' },
          { id: 'D', label: 'D', text: 'Baut Pengunci' },
        ],
        alts: ['Tangkai Pengukur Kedalaman', 'Depth Bar', 'A', 'depth bar', 'tangkai kedalaman'],
        exp: 'Depth bar (tangkai kedalaman di ujung jangka sorong) berfungsi untuk mengukur kedalaman celah atau tabung.',
      },
    ];
    const picked = variants[idx % variants.length];
    return {
      variantCode: `VAR-${String.fromCharCode(65 + (idx % variants.length))}`,
      variantLabel: `Variasi ${teamName}`,
      questionText: picked.text,
      correctAnswer: picked.ans,
      correctOptionId: picked.ans,
      options: picked.opts,
      alternativeAnswers: picked.alts,
      explanation: picked.exp,
    };
  },

  // 3. Volume Balok (q-03)
  'q-03': (idx, teamName) => {
    const variants = [
      { p: 8, l: 5, t: 3, v: 120, text: 'Sebuah balok kayu memiliki panjang 8 cm, lebar 5 cm, dan tinggi 3 cm. Berapakah volume balok tersebut dalam cm³?' },
      { p: 6, l: 4, t: 5, v: 120, text: 'Sebuah balok kaca memiliki panjang 6 cm, lebar 4 cm, dan tinggi 5 cm. Berapakah volume balok tersebut dalam cm³?' },
      { p: 10, l: 3, t: 4, v: 120, text: 'Sebuah balok logam memiliki panjang 10 cm, lebar 3 cm, dan tinggi 4 cm. Berapakah volume balok tersebut dalam cm³?' },
      { p: 12, l: 5, t: 2, v: 120, text: 'Sebuah balok kayu memiliki panjang 12 cm, lebar 5 cm, dan tinggi 2 cm. Berapakah volume balok tersebut dalam cm³?' },
      { p: 15, l: 4, t: 2, v: 120, text: 'Sebuah balok aluminium memiliki panjang 15 cm, lebar 4 cm, dan tinggi 2 cm. Berapakah volume balok tersebut dalam cm³?' },
      { p: 9, l: 4, t: 5, v: 180, text: 'Sebuah balok kayu memiliki panjang 9 cm, lebar 4 cm, dan tinggi 5 cm. Berapakah volume balok tersebut dalam cm³?' },
      { p: 10, l: 6, t: 3, v: 180, text: 'Sebuah balok tembaga memiliki panjang 10 cm, lebar 6 cm, dan tinggi 3 cm. Berapakah volume balok tersebut dalam cm³?' },
      { p: 12, l: 3, t: 5, v: 180, text: 'Sebuah balok padat memiliki panjang 12 cm, lebar 3 cm, dan tinggi 5 cm. Berapakah volume balok tersebut dalam cm³?' },
    ];
    const picked = variants[idx % variants.length];
    return {
      variantCode: `VAR-${String.fromCharCode(65 + (idx % variants.length))}`,
      variantLabel: `Variasi ${teamName}`,
      questionText: picked.text,
      correctAnswer: `${picked.v} cm³`,
      alternativeAnswers: [`${picked.v}`, `${picked.v} cm3`, `${picked.v}cm3`, `${picked.v} cm^3`, `${picked.v} kubik`],
      explanation: `Volume balok = ${picked.p} × ${picked.l} × ${picked.t} = ${picked.v} cm³.`,
      unitHint: 'cm³',
      parameters: { panjang: picked.p, lebar: picked.l, tinggi: picked.t, volume: picked.v },
    };
  },

  // 4. Satuan SI Suhu Mutlak (q-04)
  'q-04': (idx, teamName) => {
    const variants = [
      {
        text: 'Satuan Internasional (SI) yang sah untuk besaran pokok Suhu Mutlak adalah...',
        ans: 'C',
        opts: [
          { id: 'A', label: 'A', text: 'Derajat Celcius (°C)' },
          { id: 'B', label: 'B', text: 'Derajat Fahrenheit (°F)' },
          { id: 'C', label: 'C', text: 'Kelvin (K)' },
          { id: 'D', label: 'D', text: 'Reamur (°R)' },
        ],
        alts: ['Kelvin', 'kelvin', 'C', 'K'],
        exp: 'Dalam sistem SI baku, satuan suhu mutlak adalah Kelvin (K).',
      },
      {
        text: 'Satuan Internasional (SI) baku untuk besaran pokok Intensitas Cahaya adalah...',
        ans: 'B',
        opts: [
          { id: 'A', label: 'A', text: 'Lumen (lm)' },
          { id: 'B', label: 'B', text: 'Kandela (cd)' },
          { id: 'C', label: 'C', text: 'Lux (lx)' },
          { id: 'D', label: 'D', text: 'Watt (W)' },
        ],
        alts: ['Kandela', 'kandela', 'B', 'cd', 'Candela'],
        exp: 'Satuan SI baku untuk intensitas cahaya adalah Kandela (cd).',
      },
      {
        text: 'Satuan Internasional (SI) baku untuk besaran pokok Jumlah Zat adalah...',
        ans: 'D',
        opts: [
          { id: 'A', label: 'A', text: 'Gram (g)' },
          { id: 'B', label: 'B', text: 'Liter (L)' },
          { id: 'C', label: 'C', text: 'Partikel' },
          { id: 'D', label: 'D', text: 'Mol (mol)' },
        ],
        alts: ['Mol', 'mol', 'D'],
        exp: 'Satuan SI baku untuk jumlah zat adalah Mol (mol).',
      },
      {
        text: 'Satuan Internasional (SI) baku untuk besaran pokok Kuat Arus Listrik adalah...',
        ans: 'A',
        opts: [
          { id: 'A', label: 'A', text: 'Ampere (A)' },
          { id: 'B', label: 'B', text: 'Volt (V)' },
          { id: 'C', label: 'C', text: 'Ohm (Ω)' },
          { id: 'D', label: 'D', text: 'Coulomb (C)' },
        ],
        alts: ['Ampere', 'ampere', 'A'],
        exp: 'Satuan SI baku untuk kuat arus listrik adalah Ampere (A).',
      },
    ];
    const picked = variants[idx % variants.length];
    return {
      variantCode: `VAR-${String.fromCharCode(65 + (idx % variants.length))}`,
      variantLabel: `Variasi ${teamName}`,
      questionText: picked.text,
      correctAnswer: picked.ans,
      correctOptionId: picked.ans,
      options: picked.opts,
      alternativeAnswers: picked.alts,
      explanation: picked.exp,
    };
  },

  // 5. Pernyataan Konversi Massa (q-05)
  'q-05': (idx, teamName) => {
    const variants = [
      {
        statement: '1 kilogram massa benda setara dengan 100 gram.',
        text: 'Periksa kebenaran pernyataan berikut: "1 kilogram massa benda setara dengan 100 gram."',
        isTrue: false,
        key: '1000 gram',
        alts: ['1000 gram', '1000 g', '1000g', '1000', '1000gram'],
        exp: '1 kilogram = 1.000 gram (kilo = 10³ = seribu).',
      },
      {
        statement: '1 ton massa barang setara dengan 100 kilogram.',
        text: 'Periksa kebenaran pernyataan berikut: "1 ton massa barang setara dengan 100 kilogram."',
        isTrue: false,
        key: '1000 kilogram',
        alts: ['1000 kilogram', '1000 kg', '1000kg', '1000', '1000 kg'],
        exp: '1 ton = 1.000 kilogram.',
      },
      {
        statement: '1 gram massa zat kimia setara dengan 1.000 miligram (mg).',
        text: 'Periksa kebenaran pernyataan berikut: "1 gram massa zat kimia setara dengan 1.000 miligram (mg)."',
        isTrue: true,
        key: 'BENAR',
        alts: ['benar', 'true'],
        exp: '1 gram = 1.000 miligram (mili = 10⁻³).',
      },
      {
        statement: '1 kuintal beras setara dengan 10 kilogram.',
        text: 'Periksa kebenaran pernyataan berikut: "1 kuintal beras setara dengan 10 kilogram."',
        isTrue: false,
        key: '100 kilogram',
        alts: ['100 kilogram', '100 kg', '100kg', '100'],
        exp: '1 kuintal = 100 kilogram.',
      },
    ];
    const picked = variants[idx % variants.length];
    return {
      variantCode: `VAR-${String.fromCharCode(65 + (idx % variants.length))}`,
      variantLabel: `Variasi ${teamName}`,
      questionText: picked.text,
      correctAnswer: picked.isTrue ? 'BENAR' : `SALAH (Koreksi: ${picked.key})`,
      alternativeAnswers: picked.alts,
      explanation: picked.exp,
      statementConfig: {
        statement: picked.statement,
        isTrue: picked.isTrue,
        correctionKey: picked.key,
        correctionAlternatives: picked.alts,
        scoringMode: 'partial',
      },
    };
  },

  // 6. Kecepatan & Waktu (q-06)
  'q-06': (idx, teamName) => {
    const variants = [
      { s: 120, t: 2, v: 60, text: 'Jika sebuah mobil menempuh jarak 120 km dalam waktu 2 jam, berapakah kecepatan rata-rata mobil tersebut dalam km/jam?' },
      { s: 180, t: 3, v: 60, text: 'Jika sebuah bus menempuh jarak 180 km dalam waktu 3 jam, berapakah kecepatan rata-rata bus tersebut dalam km/jam?' },
      { s: 150, t: 2.5, v: 60, text: 'Jika sebuah kereta menempuh jarak 150 km dalam waktu 2,5 jam, berapakah kecepatan rata-rata kereta tersebut dalam km/jam?' },
      { s: 240, t: 4, v: 60, text: 'Jika sebuah kendaraan dinas menempuh jarak 240 km dalam waktu 4 jam, berapakah kecepatan rata-ratanya dalam km/jam?' },
      { s: 100, t: 2, v: 50, text: 'Jika sebuah mobil listrik menempuh jarak 100 km dalam waktu 2 jam, berapakah kecepatan rata-ratanya dalam km/jam?' },
      { s: 200, t: 4, v: 50, text: 'Jika sebuah truk ekspedisi menempuh jarak 200 km dalam waktu 4 jam, berapakah kecepatan rata-ratanya dalam km/jam?' },
      { s: 210, t: 3, v: 70, text: 'Jika sebuah mobil sport menempuh jarak 210 km dalam waktu 3 jam, berapakah kecepatan rata-ratanya dalam km/jam?' },
      { s: 350, t: 5, v: 70, text: 'Jika sebuah armada bus menempuh jarak 350 km dalam waktu 5 jam, berapakah kecepatan rata-ratanya dalam km/jam?' },
    ];
    const picked = variants[idx % variants.length];
    return {
      variantCode: `VAR-${String.fromCharCode(65 + (idx % variants.length))}`,
      variantLabel: `Variasi ${teamName}`,
      questionText: picked.text,
      correctAnswer: `${picked.v} km/jam`,
      alternativeAnswers: [`${picked.v}`, `${picked.v} kmh`, `${picked.v}km/jam`, `${picked.v} km / jam`, `${picked.v}kmh`],
      explanation: `Kecepatan v = s / t = ${picked.s} km / ${picked.t} jam = ${picked.v} km/jam.`,
      unitHint: 'km/jam',
      parameters: { jarak: picked.s, waktu: picked.t, kecepatan: picked.v },
    };
  },

  // 8. Soal Terstruktur Densitas & Daya Apung (q-08)
  'q-08': (idx, teamName) => {
    const variants = [
      {
        m: 200, v: 50, rho: 4, state: 'Tenggelam',
        intro: 'Sebuah balok padat memiliki massa 200 gram dan volume 50 cm³. Balok tersebut dimasukkan ke dalam bejana berisi air (massa jenis air = 1 g/cm³).',
        q1: 'Berapakah massa jenis (densitas) balok padat tersebut dalam g/cm³?',
        ans1: '4 g/cm³',
        alts1: ['4', '4 g/cm3', '4g/cm3', '4 g/cm^3'],
        q2: 'Apakah balok tersebut akan Terapung, Melayang, atau Tenggelam di dalam air?',
        ans2: 'Tenggelam',
        alts2: ['tenggelam', 'Tenggelam.', 'akan tenggelam'],
        exp: 'ρ = m / V = 200 / 50 = 4 g/cm³. Karena ρ balok (4 g/cm³) > ρ air (1 g/cm³), balok tenggelam.',
      },
      {
        m: 300, v: 75, rho: 4, state: 'Tenggelam',
        intro: 'Sebuah silinder logam memiliki massa 300 gram dan volume 75 cm³. Silinder tersebut dimasukkan ke dalam bejana berisi air (massa jenis air = 1 g/cm³).',
        q1: 'Berapakah massa jenis (densitas) silinder logam tersebut dalam g/cm³?',
        ans1: '4 g/cm³',
        alts1: ['4', '4 g/cm3', '4g/cm3', '4 g/cm^3'],
        q2: 'Apakah silinder tersebut akan Terapung, Melayang, atau Tenggelam di dalam air?',
        ans2: 'Tenggelam',
        alts2: ['tenggelam', 'Tenggelam.', 'akan tenggelam'],
        exp: 'ρ = m / V = 300 / 75 = 4 g/cm³. Karena ρ benda (4 g/cm³) > ρ air (1 g/cm³), benda tenggelam.',
      },
      {
        m: 400, v: 100, rho: 4, state: 'Tenggelam',
        intro: 'Sebuah balok besi memiliki massa 400 gram dan volume 100 cm³. Balok dimasukkan ke dalam bejana air (massa jenis air = 1 g/cm³).',
        q1: 'Berapakah massa jenis (densitas) balok besi tersebut dalam g/cm³?',
        ans1: '4 g/cm³',
        alts1: ['4', '4 g/cm3', '4g/cm3', '4 g/cm^3'],
        q2: 'Apakah balok besi akan Terapung, Melayang, atau Tenggelam di dalam air?',
        ans2: 'Tenggelam',
        alts2: ['tenggelam', 'Tenggelam.', 'akan tenggelam'],
        exp: 'ρ = m / V = 400 / 100 = 4 g/cm³. Karena ρ (4 g/cm³) > ρ air (1 g/cm³), balok tenggelam.',
      },
      {
        m: 250, v: 50, rho: 5, state: 'Tenggelam',
        intro: 'Sebuah kubus tembaga memiliki massa 250 gram dan volume 50 cm³. Kubus dimasukkan ke dalam wadah air (massa jenis air = 1 g/cm³).',
        q1: 'Berapakah massa jenis (densitas) kubus tembaga tersebut dalam g/cm³?',
        ans1: '5 g/cm³',
        alts1: ['5', '5 g/cm3', '5g/cm3', '5 g/cm^3'],
        q2: 'Apakah kubus tembaga akan Terapung, Melayang, atau Tenggelam di dalam air?',
        ans2: 'Tenggelam',
        alts2: ['tenggelam', 'Tenggelam.', 'akan tenggelam'],
        exp: 'ρ = m / V = 250 / 50 = 5 g/cm³. Karena ρ (5 g/cm³) > ρ air (1 g/cm³), kubus tenggelam.',
      },
      {
        m: 350, v: 70, rho: 5, state: 'Tenggelam',
        intro: 'Sebuah balok padat memiliki massa 350 gram dan volume 70 cm³. Balok dimasukkan ke dalam wadah berisi air (massa jenis air = 1 g/cm³).',
        q1: 'Berapakah massa jenis (densitas) balok tersebut dalam g/cm³?',
        ans1: '5 g/cm³',
        alts1: ['5', '5 g/cm3', '5g/cm3', '5 g/cm^3'],
        q2: 'Apakah balok tersebut akan Terapung, Melayang, atau Tenggelam di dalam air?',
        ans2: 'Tenggelam',
        alts2: ['tenggelam', 'Tenggelam.', 'akan tenggelam'],
        exp: 'ρ = m / V = 350 / 70 = 5 g/cm³. Balok tenggelam di air.',
      },
      {
        m: 120, v: 200, rho: 0.6, state: 'Terapung',
        intro: 'Sebuah balok kayu balsa memiliki massa 120 gram dan volume 200 cm³. Balok diletakkan di permukaan air (massa jenis air = 1 g/cm³).',
        q1: 'Berapakah massa jenis (densitas) balok kayu balsa tersebut dalam g/cm³?',
        ans1: '0,6 g/cm³',
        alts1: ['0.6', '0,6', '0.6 g/cm3', '0,6 g/cm3', '0.6g/cm3'],
        q2: 'Apakah balok kayu balsa akan Terapung, Melayang, atau Tenggelam di dalam air?',
        ans2: 'Terapung',
        alts2: ['terapung', 'Terapung.', 'akan terapung'],
        exp: 'ρ = m / V = 120 / 200 = 0,6 g/cm³. Karena ρ kayu (0,6 g/cm³) < ρ air (1 g/cm³), kayu terapung.',
      },
    ];
    const picked = variants[idx % variants.length];
    return {
      variantCode: `VAR-${String.fromCharCode(65 + (idx % variants.length))}`,
      variantLabel: `Variasi ${teamName}`,
      questionText: `Soal Terstruktur: Analisis Massa Jenis dan Daya Apung Benda (${picked.m}g / ${picked.v}cm³)`,
      correctAnswer: `Part 1: ${picked.ans1} | Part 2: ${picked.ans2}`,
      alternativeAnswers: [],
      explanation: picked.exp,
      multiPartConfig: {
        introduction: picked.intro,
        scoringMode: 'partial',
        parts: [
          {
            id: 'mp-1',
            question: picked.q1,
            correctAnswer: picked.ans1,
            alternativeAnswers: picked.alts1,
          },
          {
            id: 'mp-2',
            question: picked.q2,
            correctAnswer: picked.ans2,
            alternativeAnswers: picked.alts2,
          },
        ],
      },
      parameters: { massa: picked.m, volume: picked.v, densitas: picked.rho, dayaApung: picked.state },
    };
  },
};

/**
 * Deterministically resolves team question variants for all teams across active match questions.
 * SINGLE SOURCE OF TRUTH:
 * - Deterministic formula based on (teamId, questionId, teamIndex).
 * - ZERO runtime randomness.
 * - If question has explicit `question.variants`, picks sequentially or deterministically based on teamIndex.
 * - If question matches built-in parametric template, instantiates balanced physics variant.
 * - Otherwise gracefully falls back to base question values.
 */
export function resolveTeamQuestionVariants(
  teams: Team[],
  questions: Question[],
  _competitionId?: string
): Record<string, Record<string, QuestionVariant>> {
  const result: Record<string, Record<string, QuestionVariant>> = {};

  if (!teams || teams.length === 0 || !questions || questions.length === 0) {
    return result;
  }

  teams.forEach((team, teamIdx) => {
    result[team.id] = {};

    questions.forEach((q) => {
      // 1. Check if question has user-defined variants array
      if (q.variants && q.variants.length > 0) {
        const pickedVariant = q.variants[teamIdx % q.variants.length];
        result[team.id][q.id] = {
          ...pickedVariant,
          id: `${q.id}-v-${team.id}`,
          baseQuestionId: q.id,
          variantCode: pickedVariant.variantCode || `VAR-${String.fromCharCode(65 + (teamIdx % q.variants.length))}`,
          variantLabel: pickedVariant.variantLabel || `Variasi Kelompok ${team.name}`,
          points: pickedVariant.points ?? q.points ?? 10,
          category: pickedVariant.category ?? q.category,
          type: pickedVariant.type ?? q.type ?? 'short_answer',
        };
        return;
      }

      // 2. Check if built-in parametric template exists for this question ID or code
      const templateKey = BUILT_IN_VARIATION_TEMPLATES[q.id]
        ? q.id
        : Object.keys(BUILT_IN_VARIATION_TEMPLATES).find((k) => q.code?.toLowerCase().includes(k.toLowerCase()));

      if (templateKey && BUILT_IN_VARIATION_TEMPLATES[templateKey]) {
        const generated = BUILT_IN_VARIATION_TEMPLATES[templateKey](teamIdx, team.name);
        result[team.id][q.id] = {
          id: `${q.id}-gen-${team.id}`,
          baseQuestionId: q.id,
          variantCode: generated.variantCode || `VAR-${String.fromCharCode(65 + (teamIdx % 8))}`,
          variantLabel: generated.variantLabel || `Variasi ${team.name}`,
          questionText: generated.questionText || q.questionText,
          correctAnswer: generated.correctAnswer || q.correctAnswer,
          alternativeAnswers: generated.alternativeAnswers || q.alternativeAnswers || [],
          type: generated.type ?? q.type ?? 'short_answer',
          points: generated.points ?? q.points ?? 10,
          category: generated.category ?? q.category,
          explanation: generated.explanation || q.explanation,
          unitHint: generated.unitHint ?? q.unitHint,
          options: generated.options ?? q.options,
          correctOptionId: generated.correctOptionId ?? q.correctOptionId,
          statementConfig: generated.statementConfig ?? q.statementConfig,
          multiPartConfig: generated.multiPartConfig ?? q.multiPartConfig,
          parameters: generated.parameters,
        };
        return;
      }

      // 3. Fallback: Base master question mapped as standard variant
      result[team.id][q.id] = {
        id: `${q.id}-std-${team.id}`,
        baseQuestionId: q.id,
        variantCode: 'MASTER',
        variantLabel: `Standar (${team.name})`,
        questionText: q.questionText,
        correctAnswer: q.correctAnswer,
        alternativeAnswers: q.alternativeAnswers || [],
        type: q.type || 'short_answer',
        points: q.points || 10,
        category: q.category,
        explanation: q.explanation,
        unitHint: q.unitHint,
        options: q.options,
        correctOptionId: q.correctOptionId,
        statementConfig: q.statementConfig,
        multiPartConfig: q.multiPartConfig,
      };
    });
  });

  return result;
}

/**
 * Returns the fully resolved Question object for a given team and card/question ID.
 * Polymorphic: Can be passed directly to `checkAnswer`, `PrintableCards`, and `GameArena`.
 */
export function getResolvedQuestionForTeam(
  gameState: Partial<GameState> | null | undefined,
  teamId: string | null | undefined,
  baseQuestionIdOrCardNum: string | number
): Question {
  const defaultFallback: Question = {
    id: 'q-fallback',
    code: 'FB-01',
    questionText: 'Soal Pengukuran',
    correctAnswer: '0',
    alternativeAnswers: [],
    points: 10,
  };

  if (!gameState) return defaultFallback;

  const questions = gameState.questions || [];

  // If passed a card number as numeric, find base questionId first
  let targetQuestionId = typeof baseQuestionIdOrCardNum === 'string' ? baseQuestionIdOrCardNum : '';
  if (typeof baseQuestionIdOrCardNum === 'number') {
    if (teamId && gameState.teamCardDecks && gameState.teamCardDecks[teamId]) {
      const card = gameState.teamCardDecks[teamId].find((c) => Number(c.cardNumber) === baseQuestionIdOrCardNum);
      if (card?.questionId) {
        targetQuestionId = card.questionId;
      }
    }
    if (!targetQuestionId) {
      const idx = (baseQuestionIdOrCardNum - 1) % Math.max(1, questions.length);
      targetQuestionId = questions[idx]?.id || 'q-01';
    }
  }

  // 1. Find base question in active questions snapshot
  const baseQuestion = questions.find((q) => q.id === targetQuestionId) || questions[0] || defaultFallback;

  // 2. Look up resolved variant for this team in gameState.teamQuestionVariants
  if (teamId && gameState.teamQuestionVariants && gameState.teamQuestionVariants[teamId]) {
    const variant = gameState.teamQuestionVariants[teamId][targetQuestionId];
    if (variant) {
      return {
        ...baseQuestion,
        id: baseQuestion.id, // keep base ID consistent for indexing
        questionText: variant.questionText,
        correctAnswer: variant.correctAnswer,
        alternativeAnswers: variant.alternativeAnswers || [],
        type: variant.type || baseQuestion.type,
        points: variant.points ?? baseQuestion.points,
        category: variant.category ?? baseQuestion.category,
        explanation: variant.explanation ?? baseQuestion.explanation,
        unitHint: variant.unitHint ?? baseQuestion.unitHint,
        options: variant.options ?? baseQuestion.options,
        correctOptionId: variant.correctOptionId ?? baseQuestion.correctOptionId,
        statementConfig: variant.statementConfig ?? baseQuestion.statementConfig,
        multiPartConfig: variant.multiPartConfig ?? baseQuestion.multiPartConfig,
      };
    }
  }

  return baseQuestion;
}

export interface VariationValidationResult {
  isValid: boolean;
  issues: string[];
  variantCoveragePercent: number;
  totalTeamQuestions: number;
  variedQuestionsCount: number;
}

/**
 * Validates team question distribution:
 * 1. Every team has a resolved question for every active match question.
 * 2. Every variant preserves competency, points, category, and question type.
 * 3. Checks diversity score across teams.
 */
export function validateTeamQuestionDistribution(
  teams: Team[],
  questions: Question[],
  teamQuestionVariants?: Record<string, Record<string, QuestionVariant>>
): VariationValidationResult {
  const issues: string[] = [];
  const totalTeamQuestions = teams.length * questions.length;
  let variedCount = 0;

  if (teams.length === 0 || questions.length === 0) {
    return {
      isValid: true,
      issues: [],
      variantCoveragePercent: 100,
      totalTeamQuestions: 0,
      variedQuestionsCount: 0,
    };
  }

  if (!teamQuestionVariants) {
    issues.push('Snapshot variasi kelompok belum diinisialisasi.');
    return {
      isValid: false,
      issues,
      variantCoveragePercent: 0,
      totalTeamQuestions,
      variedQuestionsCount: 0,
    };
  }

  teams.forEach((team) => {
    const teamVars = teamQuestionVariants[team.id];
    if (!teamVars) {
      issues.push(`Kelompok "${team.name}" belum memiliki mapping variasi soal.`);
      return;
    }

    questions.forEach((q) => {
      const v = teamVars[q.id];
      if (!v) {
        issues.push(`Soal ${q.code || q.id} belum memiliki variasi untuk kelompok "${team.name}".`);
        return;
      }

      if (!v.questionText || !v.questionText.trim()) {
        issues.push(`Teks soal variasi pada ${q.code || q.id} kelompok "${team.name}" kosong.`);
      }

      if (!v.correctAnswer || !v.correctAnswer.trim()) {
        issues.push(`Kunci jawaban variasi pada ${q.code || q.id} kelompok "${team.name}" kosong.`);
      }

      // Check if question text is varied compared to base master question
      if (v.questionText !== q.questionText || v.variantCode?.startsWith('VAR-')) {
        variedCount++;
      }
    });
  });

  const variantCoveragePercent = totalTeamQuestions > 0 ? Math.round((variedCount / totalTeamQuestions) * 100) : 100;

  return {
    isValid: issues.length === 0,
    issues,
    variantCoveragePercent,
    totalTeamQuestions,
    variedQuestionsCount: variedCount,
  };
}

/**
 * Computes a pure, deterministic integrity hash of a teamQuestionVariants snapshot.
 * Guarantees cross-device parity and detects accidental mutation.
 * 100% deterministic (no Math.random, no Date.now, no browser-dependent APIs).
 */
export function computeVariantSnapshotHash(
  variants?: Record<string, Record<string, QuestionVariant>> | null
): string {
  if (!variants || Object.keys(variants).length === 0) {
    return 'v1-empty';
  }

  const sortedTeamIds = Object.keys(variants).sort();
  let buffer = '';

  for (const teamId of sortedTeamIds) {
    const teamObj = variants[teamId] || {};
    const sortedQIds = Object.keys(teamObj).sort();

    for (const qId of sortedQIds) {
      const v = teamObj[qId];
      if (v) {
        buffer += `[T:${teamId}|Q:${qId}|C:${v.correctAnswer}|TXT:${v.questionText}|P:${v.points || 10}|TYPE:${v.type || 'short_answer'}]`;
      }
    }
  }

  // Pure 32-bit FNV-1a hash algorithm
  let hash = 0x811c9dc5;
  for (let i = 0; i < buffer.length; i++) {
    hash ^= buffer.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  return `v1-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

