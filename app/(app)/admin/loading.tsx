import { Skeleton, ListaSkeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-6 w-44" />
      <Skeleton className="h-[42px]" />
      <ListaSkeleton linhas={4} />
    </div>
  );
}
