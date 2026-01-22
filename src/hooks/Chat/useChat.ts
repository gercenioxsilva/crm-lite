import { useState } from 'react';
import type { ChatMessage } from '../../models/Chat';

type UseChat = () => {
  messages: ChatMessage[];
  sendMessage: (content: string) => Promise<void>;
  isLoading: boolean;
  consultasUsadas: number;
  maxConsultasGratuitas: number;
};

export const useChat: UseChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [consultasUsadas, setConsultasUsadas] = useState(0);
  const maxConsultasGratuitas = 3;

  const sendMessage = async (content: string) => {
    if (consultasUsadas >= maxConsultasGratuitas) {
      throw new Error('CONSULTATION_LIMIT_REACHED');
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    await new Promise((resolve) => setTimeout(resolve, 600));

    const assistantMessage: ChatMessage = {
      id: `assistant-${Date.now()}`,
      type: 'assistant',
      content:
        'Recebi sua mensagem. Para um roteiro mais preciso, informe destino, duração, perfil (ex: casal/família/solo) e orçamento.',
    };

    setMessages((prev) => [...prev, assistantMessage]);
    setConsultasUsadas((prev) => prev + 1);
    setIsLoading(false);
  };

  return { messages, sendMessage, isLoading, consultasUsadas, maxConsultasGratuitas };
};

