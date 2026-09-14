import { Skeleton, ListaSkeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-7 w-52" />
      <div className="grid grid-cols-4 gap-2">
        <Skeleton className="h-[64px]" />
        <Skeleton className="h-[64px]" />
        <Skeleton className="h-[64px]" />
        <Skeleton className="h-[64px]" />
      </div>
      <Skeleton className="h-[210px]" />
      <ListaSkeleton linhas={3} />
    </div>
  );
}
