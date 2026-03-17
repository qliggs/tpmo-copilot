import AppNav from "@/components/AppNav";
import ChatInterface from "@/components/ChatInterface";

export default function ChatPage() {
  return (
    <div className="flex flex-col h-screen bg-bg-primary">
      <AppNav />
      <ChatInterface />
    </div>
  );
}
