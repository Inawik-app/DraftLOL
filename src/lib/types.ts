export type Tag =
  | "frontline"
  | "engage"
  | "disengage"
  | "poke"
  | "burst"
  | "dps"
  | "ap"
  | "ad"
  | "waveclear"
  | "pick"
  | "dive"
  | "scaling"
  | "mobility"
  | "utility"
  | "splitpush";

export interface Champion {
  id: string;
  name: string;
  title: string;
  tags: Tag[];
  curated: boolean;
  riotTags: string[];
}
