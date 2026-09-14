import { Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-[330px]" />
    </div>
  );
}
