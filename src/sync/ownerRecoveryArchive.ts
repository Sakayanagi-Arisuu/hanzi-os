import type { ActiveOwnerLearningScope, OwnerRecoverySnapshot } from './indexedDb';
import { runRecoveryCodec } from './ownerRecoveryCodecClient';

type DeviceBinding = { installationId: string; deviceId: string };

export function ownerRecoveryResourceIntegrity(value: unknown) {
  return runRecoveryCodec('ownerRecoveryResourceIntegrity', [value]);
}

export function createOwnerRecoveryArchive(snapshot: OwnerRecoverySnapshot, binding: DeviceBinding) {
  return runRecoveryCodec('createOwnerRecoveryArchive', [snapshot, binding]);
}

export function stageOwnerRecoveryArchive(source: string, scope: ActiveOwnerLearningScope, binding: DeviceBinding) {
  return runRecoveryCodec('stageOwnerRecoveryArchive', [source, scope, binding]);
}
