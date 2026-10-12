import { parse } from 'kordoc';
import { extractEvaluationSections } from './schoolinfo.js';

const MIN_USEFUL_MARKDOWN_LENGTH = 200;

export function needsOcrFromMarkdown(markdown: string): boolean {
  const readable = markdown.replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/<[^>]*>/g, '').replace(/\s/g, '');
  return readable.length < MIN_USEFUL_MARKDOWN_LENGTH;
}

export interface DocumentText {
  /** 성취기준 추출에 넘길 텍스트(평가 관련 블록, 없으면 전체) */
  text: string;
  fileType: string;
  needsOcr: boolean;
  warnings: string[];
}

export async function documentToText(buffer: ArrayBuffer): Promise<DocumentText> {
  const parsed = await parse(buffer);
  const markdown = parsed.success ? parsed.markdown ?? '' : '';
  const warnings: string[] = parsed.success ? [] : ['문서를 글자로 바꾸지 못했습니다.'];
  const needsOcr = needsOcrFromMarkdown(markdown);

  const sections = extractEvaluationSections(markdown);
  return {
    text: sections.length > 0 ? sections.join('\n\n') : markdown,
    fileType: parsed.fileType ?? 'unknown',
    needsOcr,
    warnings,
  };
}
