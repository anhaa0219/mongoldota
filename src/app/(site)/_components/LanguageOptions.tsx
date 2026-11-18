import { languages, type LanguageCode } from "../_hooks/use-language";

interface LanguageOptionsProps {
  language: LanguageCode;
  onChoose: (code: LanguageCode) => void;
}

/** One menu item per language, the chosen one checked. The caller supplies the surrounding `<ul role="menu">`. */
export function LanguageOptions({ language, onChoose }: LanguageOptionsProps) {
  return (
    <>
      {languages.map((item) => (
        <li key={item.code} role="none">
          <button
            type="button"
            role="menuitemradio"
            aria-checked={item.code === language}
            onClick={() => onChoose(item.code)}
            className={`flex w-full items-center justify-between px-[1rem] py-[0.55rem] text-left text-[1.1rem] transition-colors hover:bg-white/10 ${
              item.code === language ? "text-accent" : "text-white"
            }`}
          >
            {item.label}
            <span className="text-[0.85rem] uppercase text-white/45">{item.code}</span>
          </button>
        </li>
      ))}
    </>
  );
}
