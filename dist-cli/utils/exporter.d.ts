import { AppStoreReviewDetailAttributes, LocalizedStorefrontOutput, ReleaseNotesOutput } from '../types';
export declare function saveReleaseNotesToDisk(basePath: string, releaseNotes: ReleaseNotesOutput): void;
export declare function saveStorefrontToDisk(basePath: string, storefrontData: LocalizedStorefrontOutput): void;
export declare function saveReviewInfoToDisk(basePath: string, reviewInfo: AppStoreReviewDetailAttributes): void;
