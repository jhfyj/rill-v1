export interface Role {
  title: string;
  type: string;
}

export interface TeamMember {
  name: string;
  role: string;
  bio: string;
}

export interface Company {
  id: string;
  stage: string;
  category: string;
  name: string;
  description: string;
  details: string;
  longer: string;
  roles: Role[];
  team: TeamMember[];
  createdAt?: string;
  updatedAt?: string;
}
