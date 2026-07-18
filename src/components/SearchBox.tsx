interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}

/** Search input with a ✕ clear button (shown only when non-empty). */
export default function SearchBox({ value, onChange, placeholder }: Props) {
  return (
    <div className="searchbox">
      <input
        className="search"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button className="search-clear" title="clear" onClick={() => onChange('')}>
          ✕
        </button>
      )}
    </div>
  );
}
