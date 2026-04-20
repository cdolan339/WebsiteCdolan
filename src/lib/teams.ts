import { api } from "./api";

export type JoinRequest = {
  id: number;
  status: "pending" | "approved" | "denied";
  created_at: string;
  user_id: number;
  username: string;
  email: string;
  email_verified: boolean;
};

export type TeamMember = {
  id: number;
  username: string;
  email: string | null;
  role: "owner" | "manager" | "associate";
};

export function listJoinRequests(): Promise<JoinRequest[]> {
  return api<JoinRequest[]>("/teams/requests", { method: "GET" });
}

export function approveJoinRequest(id: number) {
  return api(`/teams/requests/${id}/approve`, { method: "POST" });
}

export function denyJoinRequest(id: number) {
  return api(`/teams/requests/${id}/deny`, { method: "POST" });
}

export function listTeamMembers(): Promise<TeamMember[]> {
  return api<TeamMember[]>("/teams/members", { method: "GET" });
}

export function updateMemberRole(userId: number, role: TeamMember["role"]): Promise<TeamMember> {
  return api<TeamMember>(`/teams/members/${userId}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}
