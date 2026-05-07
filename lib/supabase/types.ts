export type Property = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  operation: string;
  status: string;
  price: number;
  address: string | null;
  zone: string | null;
  city: string;
  state: string;
  bedrooms: number;
  bathrooms: number;
  m2_construction: number | null;
  m2_land: number | null;
  parking: number;
  amenities: string[];
  agent_id: string | null;
  views: number;
  inquiries: number;
  is_published: boolean;
  featured: boolean;
  external_id: string | null;
  reference: string | null;
  owner_name: string | null;
  owner_email: string | null;
  owner_phone: string | null;
  development: string | null;
  branch: string | null;
  created_at: string;
  updated_at: string;
};

export type Lead = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  source: string | null;
  status: string;
  agent_id: string | null;
  budget_min: number | null;
  budget_max: number | null;
  budget_text: string | null;
  interest: string | null;
  preferred_zones: string[] | null;
  preferred_types: string[] | null;
  notes: string | null;
  consent_privacy: boolean;
  consent_at: string | null;
  last_contact_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: "admin" | "asesor" | "asistente";
  initials: string | null;
  active: boolean;
  created_at: string;
};

export type PropertyImage = {
  id: string;
  property_id: string;
  url: string;
  storage_path: string | null;
  position: number;
  is_cover: boolean;
};
