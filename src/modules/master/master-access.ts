import { ApiError } from "../../errors/ApiError";
import { hasAllBranchesAccess } from "../../constants/access";

export function isMasterDataAdmin(userId: number): boolean {
  return hasAllBranchesAccess(userId);
}

export function getMasterDataScope(
  userId: number,
  workplaceId: number,
): number | undefined {
  return isMasterDataAdmin(userId) ? undefined : workplaceId;
}

export function getMasterDataTargetWorkplace(
  userId: number,
  workplaceId: number,
  requestedWorkplaceId: unknown,
): number {
  if (!isMasterDataAdmin(userId)) return workplaceId;

  const targetWorkplaceId = Number(requestedWorkplaceId);
  if (!Number.isInteger(targetWorkplaceId) || targetWorkplaceId <= 0) {
    throw new ApiError(400, "กรุณาเลือกสาขา");
  }

  return targetWorkplaceId;
}
