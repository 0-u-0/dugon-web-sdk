import { stringChecker, objectChecker } from './utils';
import { StrDic } from './remoteParameters';

export type Metadata = StrDic

export function metadataChecker(metadata: Metadata) {
  objectChecker(metadata, 'meta');
  for (const index in metadata) {
    stringChecker(index, 'The key of metadata')
    stringChecker(metadata[index], 'The value of metadata')
  }
}