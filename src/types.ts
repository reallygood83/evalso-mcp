export interface SchoolInfo {
  id: string;
  name: string;
  shlIdfCd: string;
  schoolCode?: string;
  sido?: string;
  sgg?: string;
  kind?: string;
  foundation?: string;
  address?: string;
}

export interface EvaluationPlanDocument {
  id: string;
  seq: string;
  filename: string;
  title: string;
  extension: string;
  sizeKB?: number;
}

export interface EvaluationSource {
  type: 'schoolinfo';
  fileName?: string;
  schoolName?: string;
  schoolCode?: string;
  shlIdfCd?: string;
  sido?: string;
  sgg?: string;
  kind?: string;
  address?: string;
  year?: number;
  semester?: 1 | 2;
  documentTitle?: string;
  fileSeq?: string;
  fileType?: string;
  needsOcr?: boolean;
  warnings?: string[];
}
