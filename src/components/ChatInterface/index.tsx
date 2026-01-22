import React, { useState, useRef, useEffect } from "react";
import { useChat } from "../../hooks/Chat/useChat";
import { ChatMessage } from "../ChatMessage";
import { type ChatMessage as ChatMessageType } from "../../models/Chat";

export const ChatInterface: React.FC = () => {
  const {
    messages,
    sendMessage,
    isLoading,
    consultasUsadas,
    maxConsultasGratuitas,
  } = useChat();
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const doSend = async () => {
    if (!inputValue.trim() || isLoading) return;
    try {
      await sendMessage(inputValue);
      setInputValue("");
    } catch (error) {
      if (error instanceof Error && error.message === "CONSULTATION_LIMIT_REACHED") {
        console.log("Show upgrade modal");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await doSend();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void doSend();
    }
  };

  const restantes = Math.max(0, maxConsultasGratuitas - consultasUsadas);

  return (
    <div className='bg-gray-50 rounded-3xl shadow-xl overflow-hidden'>
      <div className='bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6'>
        <div className='flex items-center space-x-4'>
          <div className='w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center'>
            <span className='text-lg font-semibold'>AI</span>
          </div>
          <div>
            <h4 className='font-bold text-lg'>Assistente Ancestral Travel</h4>
            <p className='text-pink-100'>{restantes} consultas restantes hoje</p>
          </div>
        </div>
      </div>

      <div className='h-96 overflow-y-auto p-6 space-y-4'>
        <div className='flex items-start space-x-3'>
          <div className='w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0'>
            <span className='text-white text-xs font-semibold'>AI</span>
          </div>
          <div className='bg-white rounded-2xl rounded-tl-md p-4 shadow-sm max-w-md'>
            <p className='text-gray-800'>
              Olá! Sou seu assistente de viagens da Ancestral Travel.
              <br />
              <br />
              Posso te ajudar de duas formas:
              <br />
              <br />
              <strong>Roteiro Ancestral:</strong> baseado no seu teste de DNA
              <br />
              <strong>Roteiro Livre:</strong> baseado nas suas preferências
              <br />
              <br />
              Como gostaria de começar?
            </p>
          </div>
        </div>

        {messages.map((message: ChatMessageType) => (
          <ChatMessage key={message.id} message={message} />
        ))}

        {isLoading && (
          <div className='flex items-start space-x-3'>
            <div className='w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0'>
              <span className='text-white text-xs font-semibold'>AI</span>
            </div>
            <div className='bg-white rounded-2xl rounded-tl-md p-4 shadow-sm'>
              <div className='flex space-x-1'>
                <div className='w-2 h-2 bg-gray-400 rounded-full animate-pulse'></div>
                <div className='w-2 h-2 bg-gray-400 rounded-full animate-pulse' style={{ animationDelay: "0.2s" }}></div>
                <div className='w-2 h-2 bg-gray-400 rounded-full animate-pulse' style={{ animationDelay: "0.4s" }}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className='p-6 border-t bg-white'>
        <form onSubmit={handleSubmit} className='flex space-x-3'>
          <input
            type='text'
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua mensagem... (ex: 'Quero um roteiro para Portugal, 7 dias, casal, orçamento R$ 8000')"
            className='flex-1 border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent'
            disabled={isLoading}
          />
          <button
            type='submit'
            disabled={isLoading || !inputValue.trim()}
            className='bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl font-medium hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed'
          >
            Enviar
          </button>
        </form>
      </div>
    </div>
  );
};
