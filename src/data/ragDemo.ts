// Demo data for RAG features (front-end only, no backend)

export type RagFileType = 'lab_report' | 'doctor_summary' | 'mri_metadata' | 'pdf';

export interface RagFile {
  id: string;
  fileName: string;
  fileType: RagFileType;
  date: string;
  author?: string;
  pages?: number;
  sizeKb?: number;
  // Rendered content for the in-app preview
  preview: {
    title: string;
    body: string; // markdown-ish plain text
    table?: { label: string; value: string; flag?: 'low' | 'normal' | 'high' }[];
  };
}

export interface RagCitation {
  fileId: string;
  fileName: string;
  excerpt: string;
  page?: number;
}

export interface RagTrendPoint {
  date: string; // e.g. "2022-03"
  value: number;
}

export interface RagTrend {
  metric: string;
  unit: string;
  data: RagTrendPoint[];
  normalRange: { min: number; max: number };
  trend: 'improving' | 'worsening' | 'stable';
}

export const demoFiles: Record<string, RagFile> = {
  'lab-2024-02': {
    id: 'lab-2024-02',
    fileName: 'Lipid_Panel_Feb2024.pdf',
    fileType: 'lab_report',
    date: '2024-02-12',
    author: 'Quest Diagnostics',
    pages: 2,
    sizeKb: 184,
    preview: {
      title: 'Lipid Panel — February 12, 2024',
      body: 'Fasting lipid profile collected at routine follow-up. Patient reports adherence to Mediterranean diet and 30 min daily activity over the past 6 months.',
      table: [
        { label: 'Total Cholesterol', value: '165 mg/dL', flag: 'normal' },
        { label: 'LDL Cholesterol', value: '95 mg/dL', flag: 'normal' },
        { label: 'HDL Cholesterol', value: '52 mg/dL', flag: 'normal' },
        { label: 'Triglycerides', value: '118 mg/dL', flag: 'normal' },
      ],
    },
  },
  'visit-2024-01': {
    id: 'visit-2024-01',
    fileName: 'Dr_Martinez_Visit_Jan2024.docx',
    fileType: 'doctor_summary',
    date: '2024-01-10',
    author: 'Dr. Elena Martinez, MD',
    pages: 1,
    sizeKb: 42,
    preview: {
      title: 'Follow-up Visit Summary — January 10, 2024',
      body:
        'Patient seen for 6-month lipid management follow-up. Reports excellent adherence to dietary modifications and exercise plan discussed at prior visit.\n\nAssessment: Significant improvement in lipid profile compared to 2022 baseline. Total cholesterol trending downward consistently.\n\nPlan: Continue current lifestyle regimen. Repeat lipid panel in 3 months. No medication changes indicated at this time.',
    },
  },
  'mri-2023-09': {
    id: 'mri-2023-09',
    fileName: 'MRI_Brain_Sep2023.dicom',
    fileType: 'mri_metadata',
    date: '2023-09-04',
    author: 'Radiology Associates',
    sizeKb: 28,
    preview: {
      title: 'MRI Brain — September 4, 2023 (metadata)',
      body:
        'Modality: MR\nStudy: Brain w/o contrast\nSequences: T1, T2 FLAIR, DWI\nFindings: No acute intracranial abnormality. Age-appropriate volume. No mass effect or midline shift.\n\nImpression: Unremarkable brain MRI.\n\nNote: DICOM imagery is retrieved on demand via the imaging API and is not stored in the RAG index.',
    },
  },
};

export const demoCitations: RagCitation[] = [
  {
    fileId: 'visit-2024-01',
    fileName: 'Dr_Martinez_Visit_Jan2024.docx',
    excerpt:
      'Significant improvement in lipid profile compared to 2022 baseline. Total cholesterol trending downward consistently.',
    page: 1,
  },
  {
    fileId: 'lab-2024-02',
    fileName: 'Lipid_Panel_Feb2024.pdf',
    excerpt: 'Total Cholesterol: 165 mg/dL (normal). LDL: 95 mg/dL. HDL: 52 mg/dL.',
    page: 1,
  },
];

export const demoTrend: RagTrend = {
  metric: 'Total Cholesterol',
  unit: 'mg/dL',
  normalRange: { min: 125, max: 200 },
  trend: 'improving',
  data: [
    { date: '2022-03', value: 232 },
    { date: '2022-09', value: 218 },
    { date: '2023-02', value: 205 },
    { date: '2023-08', value: 188 },
    { date: '2024-02', value: 165 },
  ],
};

export type ThinkingStepKey =
  | 'pulling_rag'
  | 'searching_records'
  | 'analyzing_documents'
  | 'reviewing_file'
  | 'compiling';

export interface ThinkingStep {
  key: ThinkingStepKey;
  label: string;
  detail?: string;
}

export const defaultThinkingSteps: ThinkingStep[] = [
  { key: 'pulling_rag', label: 'Pulling from RAG', detail: 'Indexed 3 documents' },
  { key: 'searching_records', label: 'Searching medical records', detail: 'Matching 5y of history' },
  { key: 'analyzing_documents', label: 'Analyzing documents', detail: 'Lab reports + visit notes' },
  { key: 'reviewing_file', label: 'Reviewing original file', detail: 'Lipid_Panel_Feb2024.pdf' },
  { key: 'compiling', label: 'Compiling answer', detail: 'Drafting with citations' },
];
