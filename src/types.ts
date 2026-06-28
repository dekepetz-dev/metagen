export type ProviderType = "gemini" | "openai" | "custom";
export type PresetType = "fast" | "balanced" | "quality";
export type ThemeType = "light" | "dark";

export interface ProviderConfig {
  provider: ProviderType;
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature: number;
  maxTokens: number;
  timeout: number;
  retryCount: number;
  concurrentRequests: number;
  customFormat?: "openai" | "simple";
}

export interface AppSettings {
  providerConfig: ProviderConfig;
  activeMarketplace: string;
  activeMarketplaces?: string[];
  theme: ThemeType;
  preset: PresetType;
}

export interface MarketplaceConfig {
  id: string;
  name: string;
  description: string;
  requiredFields: string[];
  maxKeywords: number;
}

export interface GeneratedMetadata {
  title: string;
  description: string;
  keywords: string[];
  categories: string[];
  peopleCount?: number;
  peopleDetails?: string;
  copySpace?: string;
  editorialCaption?: string;
  location?: string;
  concept?: string;
  brandWarning?: string;
  qualityScore?: number;
  aiGeneratedDisclosure?: boolean;
  aiPromptSuggestion?: string;
  moodTags?: string[];
}

export interface QueueItem {
  id: string;
  filename: string;
  fileSizeStr: string;
  resolution: string;
  mimeType: string;
  dataUrl: string; // Base64 url
  status: "waiting" | "generating" | "completed" | "failed";
  error?: string;
  progress: number;
  result?: GeneratedMetadata;
  createdAt: string;
}

export interface MarketplaceTemplate {
  id: string;
  name: string;
  marketplaceId: string;
  promptModifier: string;
  isDefault: boolean;
}

export const SUPPORTED_MARKETPLACES: MarketplaceConfig[] = [
  {
    id: "shutterstock",
    name: "Shutterstock",
    description: "Requires descriptive SEO-focused titles and descriptions. Standard 49 keywords max.",
    requiredFields: ["title", "description", "keywords", "categories"],
    maxKeywords: 49,
  },
  {
    id: "adobe-stock",
    name: "Adobe Stock",
    description: "First 10 keywords are high-importance. Requires AI disclosures, people count, and category.",
    requiredFields: ["title", "keywords", "categories", "aiGeneratedDisclosure"],
    maxKeywords: 49,
  },
  {
    id: "istock",
    name: "iStock / Getty Images",
    description: "Editorial focus with high-quality captioning, locations, concepts, and release checks.",
    requiredFields: ["title", "editorialCaption", "keywords", "location", "concept"],
    maxKeywords: 50,
  },
  {
    id: "pond5",
    name: "Pond5",
    description: "Excellent for conceptual footage or animations. Focuses on footage tags, concepts, and mood tags.",
    requiredFields: ["title", "description", "keywords", "concept", "moodTags"],
    maxKeywords: 50,
  },
  {
    id: "123rf",
    name: "123RF",
    description: "Simple title, description, up to 50 keywords, and primary/secondary categories.",
    requiredFields: ["title", "description", "keywords", "categories"],
    maxKeywords: 50,
  },
  {
    id: "freepik",
    name: "Freepik Contributor",
    description: "Requires clean titles, simple descriptions, AI tags, and generated prompt details.",
    requiredFields: ["title", "description", "keywords", "aiPromptSuggestion"],
    maxKeywords: 50,
  },
  {
    id: "alamy",
    name: "Alamy",
    description: "Strict quality checks. Detailed editorial captioning and concept tags recommended.",
    requiredFields: ["title", "description", "keywords"],
    maxKeywords: 50,
  },
  {
    id: "dreamstime",
    name: "Dreamstime",
    description: "Category-driven. Title must be unique, detailed descriptions, up to 50 sorted keywords.",
    requiredFields: ["title", "description", "keywords", "categories"],
    maxKeywords: 50,
  },
  {
    id: "depositphotos",
    name: "Depositphotos",
    description: "Focus on clean keywords with direct object references. Up to 50 keywords.",
    requiredFields: ["title", "description", "keywords"],
    maxKeywords: 50,
  },
  {
    id: "vectorstock",
    name: "VectorStock",
    description: "Tailored to graphics, vectors, and digital illustrations. Focuses heavily on design tags.",
    requiredFields: ["title", "keywords"],
    maxKeywords: 50,
  },
  {
    id: "envato",
    name: "Envato Elements",
    description: "Creative, lifestyle, and abstract aesthetic requirements. Demands concise thematic titles.",
    requiredFields: ["title", "description", "keywords"],
    maxKeywords: 50,
  },
];

export const DEFAULT_TEMPLATES: MarketplaceTemplate[] = [
  {
    id: "t-shutterstock",
    name: "Standard Shutterstock",
    marketplaceId: "shutterstock",
    promptModifier: "Focus on rich commercial keywords. Ensure title has no subjective fluff. Optimize keywords for buyer search terms.",
    isDefault: true,
  },
  {
    id: "t-adobe-stock",
    name: "Premium Adobe Stock",
    marketplaceId: "adobe-stock",
    promptModifier: "Order keywords strictly by relative visual importance. First 10 keywords must represent the core subject and context.",
    isDefault: true,
  },
  {
    id: "t-istock",
    name: "Getty Journalistic",
    marketplaceId: "istock",
    promptModifier: "Create clear journalistic title and detail geographical or conceptual settings. Include emotional descriptors.",
    isDefault: true,
  },
];
