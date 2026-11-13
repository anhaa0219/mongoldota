import { UserButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";

const avatarAppearance = {
  elements: {
    userButtonAvatarBox: { width: "2.9rem", height: "2.9rem" },
  },
};

/** Top-right: the signed-in Clerk account. The avatar opens Clerk's account menu. */
export async function AccountBadge() {
  const user = await currentUser();
  if (!user) return null;

  const email = user.primaryEmailAddress?.emailAddress ?? "";
  const name = user.fullName || user.username || email.split("@")[0] || "Player";

  return (
    <div className="glass-panel flex h-[3.8rem] items-center gap-[0.8rem] rounded-full pl-[0.45rem] sm:pr-[1.4rem]">
      <UserButton appearance={avatarAppearance} />
      <span className="hidden flex-col leading-tight sm:flex">
        <span className="max-w-[12rem] truncate text-[1.1rem] font-medium text-white">{name}</span>
        {email && <span className="max-w-[12rem] truncate text-[0.85rem] text-white/55">{email}</span>}
      </span>
    </div>
  );
}
