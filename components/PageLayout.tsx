import { ScrollArea } from "./ui/scroll-area";

interface PageLayoutProps {
  children: React.ReactNode;
}

export function PageLayout({ children }: PageLayoutProps) {
  return (
    <ScrollArea className="h-svh w-full">
      <main className="m-6 mb-0">{children}</main>
    </ScrollArea>
  );
}
