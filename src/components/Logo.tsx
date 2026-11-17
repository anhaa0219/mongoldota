import Image from "next/image";
import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" aria-label="Home" className="group relative block size-[5.5rem]">
      <Image
        src="/dota2-logo.png"
        alt="Dota 2"
        fill
        sizes="6rem"
        priority
        className="object-contain drop-shadow-[0_0.3rem_0.8rem_rgb(0_0_0/0.6)] transition-[scale,rotate,filter] duration-300 ease-out group-hover:rotate-[-6deg] group-hover:scale-110 group-hover:drop-shadow-[0_0_1.4rem_rgb(226_73_47/0.65)] motion-reduce:transition-none"
      />
    </Link>
  );
}
