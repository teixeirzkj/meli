import Image from "next/image";

export function Logo({ size = 72 }: { size?: number }) {
  return (
    <Image
      src="/logo-rotas.png"
      alt="Rotas"
      width={size}
      height={size}
      priority
      className="rounded-[18px] object-cover"
      style={{ width: size, height: size }}
    />
  );
}
