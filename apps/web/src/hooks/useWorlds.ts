import { useQuery } from "@tanstack/react-query";

const API_BASE = "/api";

export type WorldItem = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  status: string;
  playerCount: number;
  sortOrder: number;
};

export function useWorlds() {
  return useQuery({
    queryKey: ["worlds"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/worlds`);
      if (!res.ok) throw new Error("Failed to fetch worlds");
      const data = await res.json();
      return data.worlds as WorldItem[];
    },
    staleTime: 60_000,
  });
}
