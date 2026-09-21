export const ALL_BRANCHES_EMPLOYEE_ID = 2;

export function hasAllBranchesAccess(userId: number): boolean {
  return userId === ALL_BRANCHES_EMPLOYEE_ID;
}
