'use client'

import { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { searchAddress, KakaoAddressResult } from '@/lib/kakao'

interface AddressSearchProps {
  onSelect: (result: { addressName: string; x: string; y: string }) => void
  placeholder?: string
  label?: string
}

export function AddressSearch({
  onSelect,
  placeholder = '주소를 입력하세요',
  label,
}: AddressSearchProps) {
  const [inputValue, setInputValue] = useState('')
  const [results, setResults] = useState<KakaoAddressResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleChange(value: string) {
    setInputValue(value)

    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!value.trim()) {
      setResults([])
      setIsOpen(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        const found = await searchAddress(value)
        setResults(found)
        setIsOpen(found.length > 0)
      } catch {
        setResults([])
        setIsOpen(false)
      } finally {
        setIsSearching(false)
      }
    }, 300)
  }

  function handleSelect(result: KakaoAddressResult) {
    setInputValue(result.addressName)
    setIsOpen(false)
    setResults([])
    onSelect({ addressName: result.addressName, x: result.x, y: result.y })
  }

  return (
    <div ref={containerRef} className="relative w-full">
      {label && (
        <Label className="mb-2 block text-lg font-medium">{label}</Label>
      )}
      <Input
        value={inputValue}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => results.length > 0 && setIsOpen(true)}
        placeholder={placeholder}
        aria-label={label ?? placeholder}
        aria-expanded={isOpen}
        aria-autocomplete="list"
        className="h-14 text-lg"
      />
      {isSearching && (
        <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">
          검색 중...
        </p>
      )}
      {isOpen && results.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md"
        >
          {results.map((result, idx) => (
            <li
              key={idx}
              role="option"
              aria-selected={false}
              className="cursor-pointer px-4 py-3 text-base hover:bg-accent focus:bg-accent"
              onClick={() => handleSelect(result)}
              onKeyDown={(e) => e.key === 'Enter' && handleSelect(result)}
              tabIndex={0}
            >
              {result.placeName && (
                <span className="font-medium">{result.placeName} </span>
              )}
              <span className="text-muted-foreground">{result.addressName}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
