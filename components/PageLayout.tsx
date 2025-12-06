import { APP_TITLE } from "@/lib/constants";

interface PageLayoutProps {
  children: React.ReactNode;
}

export function PageLayout({ children }: PageLayoutProps) {
  return (
    <main className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="container mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-center mb-8">
          {APP_TITLE}
        </h1>
        {children}
      </div>
    </main>
  );
}
