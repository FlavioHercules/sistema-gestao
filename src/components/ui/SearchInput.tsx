import { Search } from "lucide-react";
import type { InputHTMLAttributes } from "react";

interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {
  placeholder?: string;
}

export function SearchInput({
  placeholder = "Buscar...",
  className = "",
  ...props
}: SearchInputProps) {
  return (
    <div className={`relative ${className}`}>
      <Search
        size={16}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
      />
      <input
        placeholder={placeholder}
        className="w-full h-10 rounded-lg border border-slate-700 bg-slate-800/60 pl-9 pr-3 text-sm text-slate-100 placeholder:text-slate-500 transition-all focus:outline-none focus:ring-2 focus:ring-sky-400/60 focus:border-sky-400/60"
        {...props}
      />
    </div>
  );
}
