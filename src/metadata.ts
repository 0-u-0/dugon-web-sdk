import { stringChecker } from './utils';

export interface Metadata {
  [index: string]: string;
}

export function metadataChecker(metadata: Metadata) {
  for (const index in metadata) {
    stringChecker(index, 'The key of metadata')
    stringChecker(metadata[index], 'The value of metadata')
  }
}