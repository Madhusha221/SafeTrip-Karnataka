
import React, { useState } from "react";
import {
  MessageCircle,
  X,
  Send,
  Sparkles,
  Compass,
  Loader2
} from "lucide-react";

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Namaste! Welcome to SafeTrip Karnataka. I'm your travel assistant. How can I help you explore Karnataka?"
    }
  ]);

  const suggestions = [
    "Best places to visit in Karnataka?",
    "Plan a 2-day trip to Coorg",
    "Famous places in Mysuru",
    "Best time to visit Hampi"
  ];

  const handleSend = async (text = message) => {
    const question = text.trim();

    if (!question || isLoading) return;

    setMessages((previous) => [
      ...previous,
      { role: "user", content: question }
    ]);

    setMessage("");
    setIsLoading(true);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/chatbot/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            message: question
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to generate an AI response."
        );
      }

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: data.reply
        }
      ]);

    } catch (error) {
      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content:
            error.message ||
            "Sorry, something went wrong. Please try again."
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[90]">

      {isOpen && (
        <div className="mb-4 w-[350px] max-w-[calc(100vw-32px)] h-[520px] max-h-[75vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">

          {/* Header */}
          <div className="bg-slate-950 text-white p-4 flex items-center justify-between">

            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-teal-600 flex items-center justify-center">
                <Compass size={25} />
              </div>

              <div>
                <h3 className="font-bold text-base">
                  SafeTrip AI Assistant
                </h3>

                <p className="text-xs text-teal-300">
                  Karnataka Travel Assistant
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-2 rounded-lg hover:bg-white/10"
              aria-label="Close chatbot"
            >
              <X size={20} />
            </button>
          </div>

          {/* Welcome message */}
          <div className="bg-teal-50 px-4 py-3 border-b border-teal-100">
            <div className="flex items-center gap-2 text-teal-800 text-xs font-semibold">
              <Sparkles size={15} />
              Your smart travel companion
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">

            {messages.map((item, index) => (
              <div
                key={index}
                className={`flex ${
                  item.role === "user"
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    item.role === "user"
                      ? "bg-teal-600 text-white rounded-br-sm"
                      : "bg-white text-slate-700 border border-slate-200 rounded-bl-sm shadow-sm"
                  }`}
                >
                  {item.content}
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 flex items-center gap-2 shadow-sm">
                  <Loader2
                    size={16}
                    className="animate-spin text-teal-600"
                  />
                  <span className="text-xs text-slate-500">
                    Preparing your travel answer...
                  </span>
                </div>
              </div>
            )}

            {/* Suggested questions */}
            {messages.length === 1 && !isLoading && (
              <div className="pt-3">
                <p className="text-xs font-bold text-slate-500 mb-3">
                  TRY ASKING
                </p>

                <div className="space-y-2">
                  {suggestions.map((item) => (
                    <button
                      key={item}
                      onClick={() => handleSend(item)}
                      className="w-full text-left p-3 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 hover:border-teal-400 hover:bg-teal-50 transition"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              handleSend();
            }}
            className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
          >
            <input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Ask about Karnataka..."
              disabled={isLoading}
              className="flex-1 min-w-0 bg-slate-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-teal-500"
            />

            <button
              type="submit"
              disabled={!message.trim() || isLoading}
              className="w-11 h-11 rounded-xl bg-teal-600 text-white flex items-center justify-center hover:bg-teal-700 disabled:opacity-40"
              aria-label="Send message"
            >
              {isLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Send size={18} />
              )}
            </button>
          </form>
        </div>
      )}

      {/* Floating chatbot button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="ml-auto w-16 h-16 rounded-full bg-teal-600 hover:bg-teal-700 text-white shadow-xl flex items-center justify-center transition-transform hover:scale-105"
        aria-label="Open SafeTrip AI Assistant"
      >
        {isOpen ? (
          <X size={27} />
        ) : (
          <Compass size={28} />
        )}
      </button>

    </div>
  );
}
