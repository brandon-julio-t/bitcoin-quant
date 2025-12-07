interface PageLayoutProps {
  children: React.ReactNode;
}

export function PageLayout({ children }: PageLayoutProps) {
  return <main className="min-h-screen p-6">{children}</main>;
}
