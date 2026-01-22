export type ChatMessage = {
  id: string;
  type: 'user' | 'assistant';
  content: string;
};

