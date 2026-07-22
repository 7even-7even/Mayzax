import { RuleResult } from '../types';

export abstract class BaseRule {
  abstract readonly name: string;
  abstract readonly weight: number;

  abstract evaluate(doc: Document, url: string): RuleResult;
}
