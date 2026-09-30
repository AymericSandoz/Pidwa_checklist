import { Icon } from './Icon';

export function SearchBox({ value, onInput, placeholder }: { value: string; onInput: (v: string) => void; placeholder: string }) {
  return (
    <label class="searchbox">
      <Icon name="search" size={18} />
      <input type="search" placeholder={placeholder} value={value} onInput={(e) => onInput((e.target as HTMLInputElement).value)} />
    </label>
  );
}
