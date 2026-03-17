import Nav from "@/components/landing/Nav";
import Footer from "@/components/landing/Footer";

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Neon impressionist background glow */}
      <div
        aria-hidden="true"
        className="fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse at 50% -10%, rgba(232, 65, 122, 0.07) 0%, transparent 55%), radial-gradient(ellipse at 85% 80%, rgba(139, 79, 200, 0.05) 0%, transparent 50%), #050507",
        }}
      />
      <Nav />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
