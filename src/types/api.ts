export interface SubsectorResponse {
  sector: string;
  subsector: string;
}

export interface IndustryResponse {
  subsector: string;
  industry: string;
}

export interface ApiConfig {
  baseUrl: string;
  apiKey: string | undefined;
}
