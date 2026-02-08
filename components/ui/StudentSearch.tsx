
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Student } from '../../types';
import Avatar from './Avatar';

interface StudentSearchProps {
  students: Student[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
}

const StudentSearch: React.FC<StudentSearchProps> = ({ students, value, onChange, error, placeholder = "Buscar alumno..." }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Derive selected student object from ID value
  const selectedStudent = useMemo(() => students.find(s => s.id === value), [students, value]);

  // Sync query with selected value when closed or initially
  useEffect(() => {
    if (selectedStudent && !isOpen) {
        setQuery(selectedStudent.name);
    } else if (!value && !isOpen) {
        setQuery('');
    }
  }, [selectedStudent, isOpen, value]);

  // Filter logic
  const filteredStudents = useMemo(() => {
    if (query === '' || (selectedStudent && query === selectedStudent.name)) return students;
    return students.filter((student) =>
      student.name.toLowerCase().includes(query.toLowerCase())
    );
  }, [query, students, selectedStudent]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // Revert query if no valid selection was made
        if (selectedStudent) setQuery(selectedStudent.name);
        else setQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedStudent]);

  const handleSelect = (student: Student) => {
    onChange(student.id);
    setQuery(student.name);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev + 1) % filteredStudents.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev - 1 + filteredStudents.length) % filteredStudents.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isOpen && filteredStudents.length > 0) {
        handleSelect(filteredStudents[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'Tab') {
        setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          className={`w-full rounded-xl border p-3 pl-11 text-sm transition-all shadow-sm ${
            error 
              ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
              : 'border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/10'
          }`}
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(0);
            if (e.target.value === '') onChange(''); // Clear selection if text is cleared
          }}
          onFocus={() => {
              setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
        <div className="absolute left-3 top-3 pointer-events-none">
            {selectedStudent ? (
                <Avatar src={selectedStudent.avatarUrl} name={selectedStudent.name} className="size-6 rounded-full border border-gray-200 text-xs" />
            ) : (
                <span className="material-symbols-outlined text-gray-400">search</span>
            )}
        </div>
        
        {/* Dropdown Chevron / Clear */}
        <div className="absolute right-3 top-3 flex items-center">
            {query && (
                <button 
                    type="button"
                    onClick={() => {
                        onChange('');
                        setQuery('');
                        setIsOpen(true);
                        inputRef.current?.focus();
                    }}
                    className="text-gray-400 hover:text-gray-600 mr-1"
                >
                    <span className="material-symbols-outlined text-sm">close</span>
                </button>
            )}
        </div>
      </div>

      {error && <p className="text-xs text-red-500 mt-1 font-medium animate-in slide-in-from-top-1 fade-in">{error}</p>}

      {/* Dropdown List */}
      {isOpen && (
        <ul className="absolute z-50 w-full mt-1 max-h-60 overflow-auto rounded-xl bg-white py-1 text-base shadow-xl ring-1 ring-black/5 focus:outline-none sm:text-sm animate-in fade-in zoom-in-95 duration-100">
          {filteredStudents.length === 0 ? (
            <li className="relative cursor-default select-none py-4 px-4 text-gray-500 text-center">
              No se encontraron alumnos.
            </li>
          ) : (
            filteredStudents.map((student, index) => (
              <li
                key={student.id}
                className={`relative cursor-pointer select-none py-3 px-4 flex items-center justify-between transition-colors ${
                  index === highlightedIndex ? 'bg-blue-50 text-primary' : 'text-text-main hover:bg-gray-50'
                }`}
                onClick={() => handleSelect(student)}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                <div className="flex items-center gap-3">
                    <Avatar src={student.avatarUrl} name={student.name} className="size-8 rounded-full" />
                    <div className="flex flex-col">
                        <span className={`font-bold truncate ${index === highlightedIndex ? 'text-primary' : 'text-gray-900'}`}>
                            {student.name}
                        </span>
                        <span className={`text-xs ${index === highlightedIndex ? 'text-blue-400' : 'text-gray-500'}`}>
                            {student.rank}
                        </span>
                    </div>
                </div>
                
                {/* Debt Indicator */}
                <div className="text-right">
                    {student.balance > 0 ? (
                        <div className="flex flex-col items-end">
                            <span className="text-red-500 font-bold text-xs bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                                Deuda: ${student.balance.toFixed(2)}
                            </span>
                        </div>
                    ) : (
                        <span className="text-green-600 font-bold text-xs flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">check_circle</span> Al día
                        </span>
                    )}
                </div>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
};

export default StudentSearch;
