import { Skeleton, ListaSkeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton className="h-6 w-40" />
      <div className="grid grid-cols-2 gap-2.5">
        <Skeleton className="h-[72px]" />
        <Skeleton className="h-[72px]" />
        <Skeleton className="h-[72px]" />
        <Skeleton className="h-[72px]" />
      </div>
      <Skeleton className="h-[52px]" />
      <ListaSkeleton linhas={3} />
    </div>
  );
}
