import AppNav from "@/components/AppNav";
import ChatInterface from "@/components/ChatInterface";

export default function ChatPage() {
  return (
    <div className="flex flex-col h-screen bg-gray-950">
      <AppNav />
      <ChatInterface />
    </div>
  );
}
