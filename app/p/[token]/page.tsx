import ResultPortal from "@/components/result-portal";

export default async function PortraitPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <ResultPortal token={token} />;
}
