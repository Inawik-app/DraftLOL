import {
  type DraftRole,
  ROLE_SHORT,
  rolesForChampion,
} from "@/data/roles";

/** Fixed slot height — reserved even for single-role champions. */
export const ROLE_TAGS_HEIGHT_PX = 16;

type Props = {
  championId: string;
};

export function RoleTags({ championId }: Props) {
  const roles = rolesForChampion(championId);

  return (
    <div
      className="flex items-center gap-0.5 overflow-hidden"
      style={{ height: `${ROLE_TAGS_HEIGHT_PX}px` }}
      aria-label={`Rôles : ${roles.map((r) => ROLE_SHORT[r]).join(", ")}`}
    >
      {roles.map((role, index) => (
        <span
          key={role}
          className={`font-cond shrink-0 border px-0.5 py-px text-[8px] leading-none tracking-[0.06em] ${
            index === 0
              ? "border-gold text-gold"
              : "border-line text-dim"
          }`}
        >
          {ROLE_SHORT[role]}
        </span>
      ))}
    </div>
  );
}
