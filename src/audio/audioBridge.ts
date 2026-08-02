export type MandarinSpeaker = (text: string, rate?: number, sourceId?: string) => boolean;

let speaker: MandarinSpeaker | null = null;

export const registerMandarinSpeaker = (next: MandarinSpeaker | null) => {
  speaker = next;
};

export const requestMandarinSpeech: MandarinSpeaker = (text, rate, sourceId) =>
  speaker?.(text, rate, sourceId) ?? false;
